from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.config import db
from app.model.note import Note
from app.model.user import User
from app.model.person import Person
from app.model.user_role import UserRole
from app.model.role import Role
from app.repository.auth_repo import JWTbearer, JWTRepo

router = APIRouter(prefix="/notes", tags=["Notes"])

async def get_db():
    async with db.session_factory() as session:
        yield session

class TeamShortInfo(BaseModel):
    id: str
    name: str

class PlayerShortInfo(BaseModel):
    id: str
    name: str

class NoteCreate(BaseModel):
    content: str
    category: Optional[str] = "general"
    rating: Optional[int] = None
    team_ids: Optional[List[str]] = []
    player_ids: Optional[List[str]] = []

class NoteResponse(BaseModel):
    id: str
    content: str
    role: Optional[str]
    category: str
    rating: Optional[int] = None
    teams: List[TeamShortInfo] = []
    players: List[PlayerShortInfo] = []
    author_name: Optional[str]
    created_at: Optional[datetime] = None
    # Compatibility fields (optional, can be None or single value)
    team_id: Optional[str] = None
    player_id: Optional[str] = None
    team_name: Optional[str] = None
    player_name: Optional[str] = None

async def get_current_user_role(token: str, session: AsyncSession) -> tuple[str, str]:
    """Returns (user_id, role_name)"""
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

@router.post("/", response_model=NoteResponse)
async def create_note(note: NoteCreate, token: str = Depends(JWTbearer()), session: AsyncSession = Depends(get_db)):
    user_id, role_name = await get_current_user_role(token, session)
    
    new_note = Note(
        content=note.content,
        user_id=user_id,
        role=role_name,
        category=note.category,
        rating=note.rating,
        # Keep compatibility fields populated with first item if present
        team_id=note.team_ids[0] if note.team_ids else None,
        player_id=note.player_ids[0] if note.player_ids else None
    )
    session.add(new_note)
    await session.commit()
    await session.refresh(new_note)

    # Insert Many-to-Many associations
    from app.model.note import Recibe, Tiene
    if note.team_ids:
        for t_id in note.team_ids:
            if t_id and t_id != "none":
                session.add(Tiene(note_id=new_note.id, team_id=t_id))
    if note.player_ids:
        for p_id in note.player_ids:
            if p_id and p_id != "none":
                session.add(Recibe(note_id=new_note.id, player_id=p_id))
    await session.commit()

    # Fetch names for Response
    # Fetch author name
    query = select(Person.name).join(User, User.person_id == Person.id).where(User.id == user_id)
    author_name = (await session.exec(query)).first()

    teams_info = []
    if note.team_ids:
        from app.model.team import Team
        valid_team_ids = [t for t in note.team_ids if t and t != "none"]
        if valid_team_ids:
            team_query = select(Team).where(Team.id.in_(valid_team_ids))
            teams_list = (await session.exec(team_query)).all()
            teams_info = [TeamShortInfo(id=t.id, name=t.name) for t in teams_list]

    players_info = []
    if note.player_ids:
        from app.model.player import Player
        valid_player_ids = [p for p in note.player_ids if p and p != "none"]
        if valid_player_ids:
            player_query = select(Player).where(Player.id.in_(valid_player_ids))
            players_list = (await session.exec(player_query)).all()
            players_info = [PlayerShortInfo(id=p.id, name=p.name) for p in players_list]

    return NoteResponse(
        id=new_note.id,
        content=new_note.content,
        role=new_note.role,
        category=new_note.category,
        rating=new_note.rating,
        teams=teams_info,
        players=players_info,
        author_name=author_name,
        created_at=new_note.created_at,
        team_id=new_note.team_id,
        player_id=new_note.player_id,
        team_name=teams_info[0].name if teams_info else None,
        player_name=players_info[0].name if players_info else None
    )

@router.get("/", response_model=List[NoteResponse])
async def get_notes(
    team_id: Optional[str] = None,
    player_id: Optional[str] = None,
    category: Optional[str] = None,
    token: str = Depends(JWTbearer()),
    session: AsyncSession = Depends(get_db)
):
    user_id, role_name = await get_current_user_role(token, session)
    
    from sqlalchemy.orm import selectinload
    query = select(Note, Person.name).join(User, Note.user_id == User.id).join(Person, User.person_id == Person.id).options(
        selectinload(Note.teams),
        selectinload(Note.players)
    )
    
    if category:
        query = query.where(Note.category == category)
        
    result = await session.exec(query)
    rows = result.all()
    
    notes_responses = []
    for note, author_name in rows:
        # Filter by team_id
        if team_id and team_id != "all":
            note_team_ids = [t.id for t in note.teams]
            if team_id not in note_team_ids:
                # also check old field for fallback
                if note.team_id != team_id:
                    continue

        # Filter by player_id
        if player_id and player_id != "all" and player_id != "none":
            note_player_ids = [p.id for p in note.players]
            if player_id not in note_player_ids:
                # also check old field for fallback
                if note.player_id != player_id:
                    continue
                
        notes_responses.append(
            NoteResponse(
                id=note.id,
                content=note.content,
                role=note.role,
                category=note.category,
                rating=note.rating,
                teams=[TeamShortInfo(id=t.id, name=t.name) for t in note.teams],
                players=[PlayerShortInfo(id=p.id, name=p.name) for p in note.players],
                author_name=author_name,
                created_at=note.created_at,
                team_id=note.team_id,
                player_id=note.player_id,
                team_name=note.teams[0].name if note.teams else (note.team_id if note.team_id else None),
                player_name=note.players[0].name if note.players else (note.player_id if note.player_id else None)
            )
        )
        
    return notes_responses

@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, token: str = Depends(JWTbearer()), session: AsyncSession = Depends(get_db)):
    user_id, role_name = await get_current_user_role(token, session)
    
    note = await session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    if note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
        
    session.delete(note)
    await session.commit()

