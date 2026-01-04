from fastapi import APIRouter, Depends

from app.repository.users import UserRepo
from app.deps.role_checker import RoleChecker

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
async def get_all_users(_=Depends(RoleChecker(["admin"]))):
    """Devuelve lista de usuarios (sólo accessible para admin)."""
    users = await UserRepo.get_all()
    return {"count": len(users), "users": users}
