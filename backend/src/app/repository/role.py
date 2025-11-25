from sqlalchemy.future import select
from typing import List

from src.app.config import db, commit_rollback
from src.app.model.role import Role
from src.app.repository.base_repo import BaseRepo

class RoleRepo(BaseRepo):
    model = Role
    
    @staticmethod
    async def find_by_role_name(role_name: str):
        query = select(Role).where(Role.role_name == role_name)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def find_by_list_role_name(role_names: List[str]):
        query = select(Role).where(Role.role_name.in_(role_names))
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def create_list_roles(role_name: List[str]):
        db.add_all(role_name)
        await commit_rollback(db)
        return role_name