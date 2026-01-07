import base64
from datetime import datetime
from uuid import uuid4
from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy import delete

from app.repository.users import UserRepo
from app.repository.role import RoleRepo
from app.repository.user_role import UserRoleRepo
from app.repository.person import PersonRepo
from app.model.user_role import UserRole
from app.model.person import Person
from app.model.user import User
from app.schema import CreateUserRequest
from app.config import db

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class AdminService:
    
    @staticmethod
    async def get_all_users():
        return await UserRepo.get_all_with_roles()
    @staticmethod
    async def delete_user(user_id: str):
        delete_roles = delete(UserRole).where(UserRole.user_id == user_id)
        await db.execute(delete_roles)
        
        from sqlalchemy.future import select
        q = select(User).where(User.id == user_id)
        res = await db.execute(q)
        user = res.scalars().one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        delete_user = delete(User).where(User.id == user_id)
        await db.execute(delete_user)
        
        if user.person_id:
             delete_person = delete(Person).where(Person.id == user.person_id)
             await db.execute(delete_person)
             
        await db.commit()
        return True

    @staticmethod
    async def promote_user(username: str, role_name: str):
        user = await UserRepo.find_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        role = await RoleRepo.find_by_role_name(role_name)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

        delete_query = delete(UserRole).where(UserRole.user_id == user.id)
        await db.execute(delete_query)
        
        await UserRoleRepo.assign_role(user_id=user.id, role_id=role.id)
        return True
