from app.model.user_role import UserRole
from app.repository.base_repo import BaseRepo
from sqlalchemy.future import select
from app.config import db
from app.model.role import Role


class UserRoleRepo(BaseRepo):
    model = UserRole

    @classmethod
    async def assign_role(cls, user_id: str, role_id: str):
        
        return await cls.create(user_id=user_id, role_id=role_id)

    @staticmethod
    async def get_role_names_by_user_id(user_id: str):
        query = select(Role.role_name).join(UserRole, Role.id == UserRole.role_id).where(UserRole.user_id == user_id)
        result = await db.execute(query)
        return [r[0] for r in result.all()]