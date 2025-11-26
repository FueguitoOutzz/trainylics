from sqlalchemy.future import select
from typing import List, Optional

from app.config import db, commit_session
from app.model.role import Role
from app.repository.base_repo import BaseRepo


class RoleRepo(BaseRepo):
    model = Role

    @staticmethod
    async def find_by_role_name(role_name: str) -> Optional[Role]:
        query = select(Role).where(Role.role_name == role_name)
        result = await db.execute(query)
        return result.scalars().one_or_none()

    @staticmethod
    async def find_by_list_role_name(role_names: List[str]):
        query = select(Role).where(Role.role_name.in_(role_names))
        result = await db.execute(query)
        return result.scalars().all()

    @classmethod
    async def create_role(cls, role_name: str):
        return await cls.create(role_name=role_name)

    @staticmethod
    async def create_list_roles(role_objs: List[Role]):
        db.add_all(role_objs)
        await commit_session()
        return role_objs