from fastapi import APIRouter, Depends

from app.repository.users import UserRepo
from app.deps.role_checker import RoleChecker
from app.schema import ResponseSchema, PromoteSchema
from app.service.admin import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
async def get_all_users(_=Depends(RoleChecker(["admin"]))):
    """Devuelve lista de usuarios (sólo accessible para admin)."""
@router.post("/promote", response_model=ResponseSchema)
async def promote_user(promote: PromoteSchema, _=Depends(RoleChecker(["admin"]))):
    """
    Promueve a un usuario a un rol específico.
    Roles disponibles: entrenador, admin, scouter, user.
    """
    await AdminService.promote_user(promote.username, promote.role_name)
    return ResponseSchema(detail=f"Usuario {promote.username} promovido a {promote.role_name} exitosamente.")
