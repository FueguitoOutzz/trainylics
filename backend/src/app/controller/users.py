from fastapi import APIRouter, Depends

from app.schema import ResponseSchema
from app.repository.auth_repo import JWTbearer, JWTRepo
from app.service.users import UserService


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=ResponseSchema)
async def get_user_profile_controller(token: str = Depends(JWTbearer())):
    payload = JWTRepo.extract_token(token)
    if not payload:
        return ResponseSchema(detail="Token inválido.", result=None)
    user_id = payload.get("user_id")
    user_profile = await UserService.get_user_profile(user_id)
    return ResponseSchema(detail="Perfil de usuario obtenido exitosamente.", result=user_profile)

@router.put("/", response_model=ResponseSchema)
async def update_user_profile_controller(request_data: __import__('app').schema.UpdateProfileRequest, token: str = Depends(JWTbearer())):
    payload = JWTRepo.extract_token(token)
    if not payload:
        return ResponseSchema(detail="Token inválido.", result=None)
    user_id = payload.get("user_id")
    success = await UserService.update_user_profile(user_id, request_data)
    if not success:
        return ResponseSchema(detail="No se pudo actualizar el perfil.")
    return ResponseSchema(detail="Perfil actualizado exitosamente.")