
from typing import List

from fastapi import Depends, HTTPException

from app.repository.auth_repo import JWTbearer, JWTRepo
from app.repository.user_role import UserRoleRepo


def RoleChecker(allowed_roles: List[str]):
    async def checker(token: str = Depends(JWTbearer())):
        payload = JWTRepo.extract_token(token)
        if not payload:
            raise HTTPException(status_code=403, detail="Token inválido.")
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=403, detail="Token sin user_id.")
        user_roles = await UserRoleRepo.get_role_names_by_user_id(user_id)
        # allow if any role intersects
        if not set(user_roles).intersection(set(allowed_roles)):
            raise HTTPException(status_code=403, detail="Permisos insuficientes.")
        return True

    return checker
