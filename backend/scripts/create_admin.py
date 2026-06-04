import asyncio
import base64
from datetime import datetime
from uuid import uuid4
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from app.config import db
from passlib.context import CryptContext
from app.model.person import Person, Sex
from app.model.user import User
from app.model.user_role import UserRole
from app.model.note import Note
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match
from app.repository.person import PersonRepo
from app.repository.role import RoleRepo
from app.repository.users import UserRepo
from app.repository.user_role import UserRoleRepo
from app.service.auth_service import pwd_context

async def create_admin():
    db.init()
    _username = await UserRepo.find_by_username("admin")
    if _username:
        print("Admin user already exists.")
        return

    _person_id = str(uuid4())
    _user_id = str(uuid4())
    
    with open("media/profile.png", "rb") as f:
        image_str = base64.b64encode(f.read())
    imagen_str = "data:image/png;base64," + image_str.decode('utf-8')
    
    _person = Person(id=_person_id,
                    name="Administrador",
                    birth=datetime.strptime("01-01-1990", "%d-%m-%Y").date(),
                    sex=Sex.MALE,
                    profile=imagen_str,
                    phone_number="+56900000000")
    
    _user = User(id=_user_id,
                username="admin",
                email="admin@trainylics.com",
                password=pwd_context.hash("admin"),
                person_id=_person_id)
    
    _role = await RoleRepo.find_by_role_name("admin")
    if not _role:
        print("Admin role not found, generating roles...")
        from app.service.auth_service import generate_role
        await generate_role()
        _role = await RoleRepo.find_by_role_name("admin")
        
    await PersonRepo.create(**_person.dict())
    await UserRepo.create(**_user.dict())
    await UserRoleRepo.assign_role(user_id=_user_id, role_id=_role.id)
    print("Admin user created successfully (admin / admin).")

if __name__ == "__main__":
    asyncio.run(create_admin())
