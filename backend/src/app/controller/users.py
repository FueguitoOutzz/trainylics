from fastapi import APIRouter, Depends

from app.schema import ResponseSchema
from app.repository.auth_repo import JWTbearer, JWTRepo
from app.service.users import UsersService


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=ResponseSchema)
async def get_user_profile_controller(token: str = Depends(JWTbearer())):
    """Obtiene el perfil del usuario autenticado usando el token JWT."""
    payload = JWTRepo.extract_token(token)
    if not payload:
        return ResponseSchema(detail="Token inválido.", result=None)
    user_id = payload.get("user_id")
    user_profile = await UsersService.get_user_profile(user_id)
    return ResponseSchema(detail="Perfil de usuario obtenido exitosamente.", result=user_profile)