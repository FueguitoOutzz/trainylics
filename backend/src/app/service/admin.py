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
from app.model.person import Person, Sex
from app.model.user import User
from app.schema import CreateUserRequest
from app.config import db

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class AdminService:
    
    @staticmethod
    async def get_all_users():
        return await UserRepo.get_all_with_roles()
        
    @staticmethod
    async def create_user(request: CreateUserRequest):
        try:
            _person_id = str(uuid4())
            _user_id = str(uuid4())
            
            # Cargar imagen por defecto
            with open("media/profile.png", "rb") as f:
                image_str = base64.b64encode(f.read())
            imagen_str = "data:image/png;base64," + image_str.decode('utf-8')
            
            # Use dummy values for mandatory fields so the user can edit them later
            _person = Person(id=_person_id,
                            name=request.name,
                            birth=datetime.strptime("01-01-1990", "%d-%m-%Y").date(),
                            sex=Sex.MALE,
                            profile=imagen_str,
                            phone_number="+56900000000")
            
            _user = User(id=_user_id,
                        username=request.username,
                        email=request.email,
                        password=pwd_context.hash(request.password),
                        person_id=_person_id)
            
            _role = await RoleRepo.find_by_role_name(request.role_name)
            if not _role:
                raise HTTPException(status_code=400, detail=f"Rol '{request.role_name}' no encontrado.")
        
            _username = await UserRepo.find_by_username(request.username)
            if _username:
                raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")
            
            _email = await UserRepo.find_by_email(request.email)
            if _email:
                raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
            
            await PersonRepo.create(**_person.dict())
            await UserRepo.create(**_user.dict())
            await UserRoleRepo.assign_role(user_id=_user_id, role_id=_role.id)
            
            return True
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            import sys
            traceback.print_exc(file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"INTERNAL ERROR: {str(e)}")
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
