

from sqlalchemy import select
from app.model.users import Users
from app.repository.users import UsersRepo
from app.model.person import Person


class UsersService:
    
    @staticmethod
    async def get_user_profile(user_id: str):
        query = select(Users.username, Users.email,
                    Person.name,
                    Person.birth,
                    Person.sex,
                    Person.profile,
                    Person.phone_number).join(Person).where(Users.id == user_id)
        return (await UsersRepo.execute(query)).mappings().one()