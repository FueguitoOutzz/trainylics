from fastapi import APIRouter

from app.schema import RegisterSchema, LoginSchema, ForgotPasswordSchema, ResponseSchema
from app.service.auth_service import AuthService


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