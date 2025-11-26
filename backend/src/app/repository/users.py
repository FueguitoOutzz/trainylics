from sqlalchemy import update as sql_update
from sqlalchemy.future import select

from app.config import db, commit_session
from app.model.users import Users
from app.repository.base_repo import BaseRepo

class UsersRepo(BaseRepo):
    model = Users
    
    @staticmethod
    async def find_by_username(username: str):
        query = select(Users).where(Users.username == username)
        result = await db.execute(query)
        return result.scalars().one_or_none()
    
    @staticmethod
    async def find_by_email(email: str):
        query = select(Users).where(Users.email == email)
        result = await db.execute(query)
        return result.scalars().one_or_none()
    
    @staticmethod
    async def update_password(user_id: str, password: str):
        query = sql_update(Users).where(Users.id == user_id).values(password=password).execution_options(synchronize_session="fetch")
        await db.execute(query)
        await commit_session()