

from sqlalchemy import select
from sqlalchemy import select
from app.model.user import User
from app.repository.users import UserRepo
from app.model.person import Person


class UserService:
    
    @staticmethod
    async def get_user_profile(user_id: str):
        query = select(User.username, User.email,
                    Person.name,
                    Person.birth,
                    Person.sex,
                    Person.profile,
                    Person.phone_number).join(Person).where(User.id == user_id)
        row = (await UserRepo.execute(query)).mappings().one()
        return dict(row)