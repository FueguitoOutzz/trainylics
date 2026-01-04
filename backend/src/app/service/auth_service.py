import base64
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from passlib.context import CryptContext
from app.schema import ForgotPasswordSchema, LoginSchema, RegisterSchema
from app.model.person import Person
from app.model.user import User
from app.model.user_role import UserRole
from app.repository.person import PersonRepo
from app.repository.role import RoleRepo
from app.repository.users import UserRepo
from app.repository.user_role import UserRoleRepo
from app.repository.auth_repo import JWTRepo

# Use bcrypt_sha256 to avoid the 72-byte password length limit of raw bcrypt
pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")

class AuthService:
    
    @staticmethod
    async def register_service(register:RegisterSchema):
        try:
        
            _person_id = str(uuid4())
            _user_id = str(uuid4())
            
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
            
            _user = User(id=_user_id,
                        username=register.username,
                        email=register.email,
                        password=pwd_context.hash(register.password),
                        person_id=_person_id)
            
            _role = await RoleRepo.find_by_role_name("user")
            if not _role:
                raise HTTPException(status_code=500, detail="Default role 'user' not found")
            _user_role = UserRole(user_id=_user_id, role_id=_role.id)
        
            _username = await UserRepo.find_by_username(register.username)
            if _username:
                raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")
            
            _email = await UserRepo.find_by_email(register.email)
            if _email:
                raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
            else:
                await PersonRepo.create(**_person.dict())
                await UserRepo.create(**_user.dict())
                await UserRoleRepo.assign_role(user_id=_user_id, role_id=_role.id)
        except Exception as e:
            import traceback
            import sys
            traceback.print_exc(file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"INTERNAL ERROR: {str(e)}")
            
    @staticmethod
    async def login_service(login: LoginSchema):
        _username = await UserRepo.find_by_username(login.username)
        if not _username:
            raise HTTPException(status_code=400, detail="Nombre de usuario incorrecta.")
        if not pwd_context.verify(login.password, _username.password):
            raise HTTPException(status_code=400, detail="Contraseña incorrecta.")
        return JWTRepo(data={"user_id": _username.id}).generate_token()
    
    @staticmethod
    async def forgot_password_service(forgot_password: ForgotPasswordSchema):
        _email = await UserRepo.find_by_email(forgot_password.email)
        if not _email:
            raise HTTPException(status_code=400, detail="El correo electrónico no está registrado.")
        await UserRepo.update_password(_email.id, pwd_context.hash(forgot_password.new_password))

    @staticmethod
    async def logout_service():
        # En una implementación stateless con JWT, el logout suele ser manejado por el cliente eliminando el token.
        # Aquí se dejaría espacio para lógica de lista negra de tokens (blacklist) si se implementara a futuro.
        pass
        

async def generate_role():
    roles = ["entrenador", "admin", "scouter", "user"]
    for role_name in roles:
        existing_role = await RoleRepo.find_by_role_name(role_name)
        if not existing_role:
            await RoleRepo.create_role(role_name)
            
