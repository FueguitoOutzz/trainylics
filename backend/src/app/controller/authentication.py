from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select

from app.schema import RegisterSchema, LoginSchema, ForgotPasswordSchema, ResponseSchema
from app.service.auth_service import AuthService
from app.repository.auth_repo import JWTbearer, JWTRepo
from app.repository.users import UserRepo
from app.repository.user_role import UserRoleRepo
from app.model.user import User


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=ResponseSchema)
async def register_controller(register: RegisterSchema):
    await AuthService.register_service(register)
    return ResponseSchema(detail="Usuario registrado exitosamente.")


@router.post("/login", response_model=ResponseSchema)
async def login_controller(login: LoginSchema):
    token = await AuthService.login_service(login)
    return ResponseSchema(detail="Inicio de sesión exitoso.", result=token)


@router.post("/forgot-password", response_model=ResponseSchema)
async def forgot_password_controller(forgot_password: ForgotPasswordSchema):
    await AuthService.forgot_password_service(forgot_password)
    return ResponseSchema(detail="Contraseña actualizada exitosamente.")


@router.post("/logout", response_model=ResponseSchema)
async def logout_controller():
    await AuthService.logout_service()
    return ResponseSchema(detail="Sesión cerrada exitosamente.")

@router.get("/me", response_model=ResponseSchema)
async def get_me(token: str = Depends(JWTbearer())):
    payload = JWTRepo.extract_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=403, detail="Token inválido o expirado.")
        
    user_id = payload["user_id"]
    
    query = select(User).where(User.id == user_id)
    res = await UserRepo.execute(query)
    user = res.scalars().one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    roles = await UserRoleRepo.get_role_names_by_user_id(user_id)
    
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "roles": roles
    }
    
    return ResponseSchema(detail="Información de usuario", result=user_data)