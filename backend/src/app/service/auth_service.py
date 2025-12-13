import base64
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from passlib.context import CryptContext
from app.schema import ForgotPasswordSchema, LoginSchema, RegisterSchema
from app.model.person import Person
from app.model.users import Users
from app.model.user_role import UsersRole
from app.repository.person import PersonRepo
from app.repository.role import RoleRepo
from app.repository.users import UsersRepo
from app.repository.user_role import UsersRoleRepo
from app.repository.auth_repo import JWTRepo

# Use bcrypt_sha256 to avoid the 72-byte password length limit of raw bcrypt
pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")

class AuthService:
    
    @staticmethod
    async def register_service(register:RegisterSchema):
        
        _person_id = str(uuid4())
        _users_id = str(uuid4())
        
        birth_date = datetime.strptime(register.birth, "%d-%m-%Y").date()
        
        # Cargar imagen por defecto
        with open("media/profile.png", "rb") as f:
            image_str = base64.b64encode(f.read())
        imagen_str = "data:image/png;base64," + image_str.decode('utf-8')
        
        _person = Person(id=_person_id,
                        name=register.name,
                        birth=birth_date,
                        sex=register.sex,
                        profile=imagen_str,
                        phone_number=register.phone_number)
        
        _users = Users(id=_users_id,
                    username=register.username,
                    email=register.email,
                    password=pwd_context.hash(register.password),
                    person_id=_person_id)
        
        _role = await RoleRepo.find_by_role_name("user")
        # RoleRepo.find_by_role_name returns a single Role or None
        if not _role:
            raise HTTPException(status_code=500, detail="Default role 'user' not found")
        _users_role = UsersRole(users_id=_users_id, role_id=_role.id)
        
        _username = await UsersRepo.find_by_username(register.username)
        if _username:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")
        
        _email = await UsersRepo.find_by_email(register.email)
        if _email:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
        else:
            await PersonRepo.create(**_person.dict())
            await UsersRepo.create(**_users.dict())
            # use assign_role convenience method
            await UsersRoleRepo.assign_role(users_id=_users_id, role_id=_role.id)
            
    @staticmethod
    async def login_service(login: LoginSchema):
        _username = await UsersRepo.find_by_username(login.username)
        if not _username:
            raise HTTPException(status_code=400, detail="Nombre de usuario incorrecta.")
        if not pwd_context.verify(login.password, _username.password):
            raise HTTPException(status_code=400, detail="Contraseña incorrecta.")
        return JWTRepo(data={"user_id": _username.id}).generate_token()
    
    @staticmethod
    async def forgot_password_service(forgot_password: ForgotPasswordSchema):
        _email = await UsersRepo.find_by_email(forgot_password.email)
        if not _email:
            raise HTTPException(status_code=400, detail="El correo electrónico no está registrado.")
        await UsersRepo.update_password(_email.id, pwd_context.hash(forgot_password.new_password))
        

async def generate_role():
    # Añadir los roles mínimos del sistema. Incluir 'scouter' y 'user' por defecto.
    roles = ["entrenador", "admin", "scouter", "user"]
    for role_name in roles:
        existing_role = await RoleRepo.find_by_role_name(role_name)
        if not existing_role:
            await RoleRepo.create_role(role_name)
            
