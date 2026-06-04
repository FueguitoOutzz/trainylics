from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.config import db
from app.model.tactic import Tactic
from app.model.user import User
from app.model.person import Person
from app.model.user_role import UserRole
from app.model.role import Role
from app.repository.auth_repo import JWTbearer, JWTRepo

router = APIRouter(prefix="/tactics", tags=["Tactics"])

async def get_db():
    async with db.session_factory() as session:
        yield session

class TacticCreate(BaseModel):
    title: str
    description: Optional[str] = None
    formation: str = "4-3-3"
    positions_json: str
    team_id: Optional[str] = None

class TacticResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    formation: str
    positions_json: str
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    author_name: Optional[str] = None
    created_at: Optional[datetime] = None

async def get_current_user_role(token: str, session: AsyncSession) -> tuple[str, str]:
    payload = JWTRepo.extract_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("user_id")
    
    # Fetch role
    statement = select(Role.role_name).join(UserRole, UserRole.role_id == Role.id).where(UserRole.users_id == user_id)
    result = await session.exec(statement)
    role_name = result.first()
    
    if not role_name:
         raise HTTPException(status_code=403, detail="User has no role")
         
    return user_id, role_name

@router.post("/", response_model=TacticResponse)
async def create_or_update_tactic(
    tactic: TacticCreate,
    tactic_id: Optional[str] = None,
    token: str = Depends(JWTbearer()),
    session: AsyncSession = Depends(get_db)
):
    user_id, role_name = await get_current_user_role(token, session)
    
    # If tactic_id is provided, update
    if tactic_id:
        existing = await session.get(Tactic, tactic_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Tactic not found")
        if existing.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this tactic")
            
        existing.title = tactic.title
        existing.description = tactic.description
        existing.formation = tactic.formation
        existing.positions_json = tactic.positions_json
        existing.team_id = tactic.team_id
        
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        db_tactic = existing
    else:
        new_tactic = Tactic(
            title=tactic.title,
            description=tactic.description,
            formation=tactic.formation,
            positions_json=tactic.positions_json,
            team_id=tactic.team_id,
            user_id=user_id
        )
        session.add(new_tactic)
        await session.commit()
        await session.refresh(new_tactic)
        db_tactic = new_tactic

    # Fetch author name
    query = select(Person.name).join(User, User.person_id == Person.id).where(User.id == user_id)
    author_name = (await session.exec(query)).first()

    team_name = None
    if db_tactic.team_id:
        from app.model.team import Team
        team_name = (await session.exec(select(Team.name).where(Team.id == db_tactic.team_id))).first()

    return TacticResponse(
        id=db_tactic.id,
        title=db_tactic.title,
        description=db_tactic.description,
        formation=db_tactic.formation,
        positions_json=db_tactic.positions_json,
        team_id=db_tactic.team_id,
        team_name=team_name,
        author_name=author_name,
        created_at=db_tactic.created_at
    )

@router.get("/", response_model=List[TacticResponse])
async def get_tactics(
    team_id: Optional[str] = None,
    token: str = Depends(JWTbearer()),
    session: AsyncSession = Depends(get_db)
):
    user_id, role_name = await get_current_user_role(token, session)
    
    # We load tactics created by this user
    query = select(Tactic, Person.name).join(User, Tactic.user_id == User.id).join(Person, User.person_id == Person.id).where(Tactic.user_id == user_id)
    
    if team_id:
        query = query.where(Tactic.team_id == team_id)
        
    result = await session.exec(query)
    rows = result.all()
    
    # Fetch team names for mappings
    from app.model.team import Team
    teams_res = await session.exec(select(Team.id, Team.name))
    teams_map = {r[0]: r[1] for r in teams_res.all()}
    
    return [
        TacticResponse(
            id=tactic.id,
            title=tactic.title,
            description=tactic.description,
            formation=tactic.formation,
            positions_json=tactic.positions_json,
            team_id=tactic.team_id,
            team_name=teams_map.get(tactic.team_id) if tactic.team_id else None,
            author_name=name,
            created_at=tactic.created_at
        ) for tactic, name in rows
    ]

@router.delete("/{tactic_id}", status_code=204)
async def delete_tactic(
    tactic_id: str,
    token: str = Depends(JWTbearer()),
    session: AsyncSession = Depends(get_db)
):
    user_id, role_name = await get_current_user_role(token, session)
    
    tactic = await session.get(Tactic, tactic_id)
    if not tactic:
        raise HTTPException(status_code=404, detail="Tactic not found")
        
    if tactic.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tactic")
        
    session.delete(tactic)
    await session.commit()
