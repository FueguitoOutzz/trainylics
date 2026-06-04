

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

    @staticmethod
    async def update_user_profile(user_id: str, request_data):
        from sqlalchemy import update
        from app.config import db
        from datetime import datetime
        
        # Get user to find person_id
        q = select(User).where(User.id == user_id)
        res = await db.execute(q)
        user = res.scalars().one_or_none()
        if not user or not user.person_id:
            return False
            
        birth_date = datetime.strptime(request_data.birth, "%d-%m-%Y").date()
            
        stmt = update(Person).where(Person.id == user.person_id).values(
            phone_number=request_data.phone_number,
            sex=request_data.sex,
            birth=birth_date
        )
        await db.execute(stmt)
        await db.commit()
        return True