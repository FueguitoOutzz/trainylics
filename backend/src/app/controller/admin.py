from fastapi import APIRouter, Depends, HTTPException
from app.deps.role_checker import RoleChecker
from app.schema import ResponseSchema, PromoteSchema, UserListResponse, CreateUserRequest
from app.service.admin import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users", response_model=UserListResponse)
async def get_all_users(_=Depends(RoleChecker(["admin"]))):
    """Devuelve lista de usuarios con sus roles."""
    users = await AdminService.get_all_users()
    return UserListResponse(users=users)

# @router.post("/users", response_model=ResponseSchema)
# async def create_user(request: CreateUserRequest, _=Depends(RoleChecker(["admin"]))):
#     """Crea un nuevo usuario (admin only)."""
#     await AdminService.create_user(request)
#     return ResponseSchema(detail="Usuario creado exitosamente")

@router.delete("/users/{user_id}", response_model=ResponseSchema)
async def delete_user(user_id: str, _=Depends(RoleChecker(["admin"]))):
    await AdminService.delete_user(user_id)
    return ResponseSchema(detail="Usuario eliminado exitosamente")

@router.post("/promote", response_model=ResponseSchema)
async def promote_user(promote: PromoteSchema, _=Depends(RoleChecker(["admin"]))):
    await AdminService.promote_user(promote.username, promote.role_name)
    return ResponseSchema(detail=f"Usuario {promote.username} promovido a {promote.role_name} exitosamente.")
