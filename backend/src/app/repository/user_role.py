from app.model.user_role import UsersRole
from app.repository.base_repo import BaseRepo
from sqlalchemy.future import select
from app.config import db
from app.model.role import Role


class UsersRoleRepo(BaseRepo):
    model = UsersRole

    @classmethod
    async def assign_role(cls, users_id: str, role_id: str):
        
        return await cls.create(users_id=users_id, role_id=role_id)

    @staticmethod
    async def get_role_names_by_user_id(user_id: str):
        # Retorna una lista de nombres de roles asociados a un usuario dado su ID
        query = select(Role.role_name).join(UsersRole, Role.id == UsersRole.role_id).where(UsersRole.users_id == user_id)
        result = await db.execute(query)
        return [r[0] for r in result.all()]