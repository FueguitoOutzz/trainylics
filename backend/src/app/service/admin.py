from fastapi import HTTPException
from app.repository.users import UserRepo
from app.repository.role import RoleRepo
from app.repository.user_role import UserRoleRepo
from app.model.user_role import UserRole
from app.config import db
from sqlalchemy import delete

class AdminService:
    
    @staticmethod
    async def promote_user(username: str, role_name: str):
        # 1. Verificamos que el usuario exista
        user = await UserRepo.find_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # 2. Verificamos que el rol exista
        role = await RoleRepo.find_by_role_name(role_name)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

        # 3. Borramos (limpiamos) los roles anteriores del usuario
        #    (Asumimos que un usuario solo tiene un rol principal a la vez en este modelo simple)
        #    Si UserRoleRepo tuviera un método 'remove_all_roles_by_user', sería ideal,
        #    pero podemos usar SQL directo si es necesario o extender el Repo.
        
        # Como UserRoleRepo hereda de BaseRepo, verificamos si tenemos acceso directo a DB.
        # UserRoleRepo no tiene un metodo delete por user_id especifico, así que lo hacemos manual con SQL.
        
        delete_query = delete(UserRole).where(UserRole.user_id == user.id)
        await db.execute(delete_query)
        
        # 4. Asignamos el nuevo rol
        await UserRoleRepo.assign_role(user_id=user.id, role_id=role.id)
        
        # El BaseRepo de UserRoleRepo hace commit en create/assign_role, asi que estamos listos.
        return True
