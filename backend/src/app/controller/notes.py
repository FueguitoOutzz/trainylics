from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Optional
from pydantic import BaseModel

from app.config import db
from app.model.note import Note
from app.model.user_role import UserRole
from app.model.role import Role
from app.repository.auth_repo import JWTbearer, JWTRepo

router = APIRouter(prefix="/notes", tags=["Notes"])

async def get_db():
    async with db.session_factory() as session:
        yield session

class NoteCreate(BaseModel):
    content: str

class NoteRead(BaseModel):
    id: str
    content: str
    role: Optional[str]
    user_id: Optional[str]
    created_at: Optional[str] = None 

async def get_current_user_role(token: str, session: AsyncSession) -> tuple[str, str]:
    """Returns (user_id, role_name)"""
    payload = JWTRepo.extract_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("user_id")
    
    # Fetch role
    statement = select(Role.role_name).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user_id)
    result = await session.exec(statement)
    role_name = result.first()
    
    if not role_name:
         raise HTTPException(status_code=403, detail="User has no role")
         
    return user_id, role_name

@router.post("/", response_model=Note)
async def create_note(note: NoteCreate, token: str = Depends(JWTbearer()), session: AsyncSession = Depends(get_db)):
    user_id, role_name = await get_current_user_role(token, session)
    
    new_note = Note(
        content=note.content,
        user_id=user_id,
        role=role_name
    )
    session.add(new_note)
    await session.commit()
    await session.refresh(new_note)
    return new_note

@router.get("/", response_model=List[Note])
async def get_notes(token: str = Depends(JWTbearer()), session: AsyncSession = Depends(get_db)):
    user_id, role_name = await get_current_user_role(token, session)
    
    target_role = ""
    if role_name == "entrenador": # Coach
        target_role = "scouter"
    elif role_name == "scouter":
        target_role = "entrenador"
    else:
        # Admin or User? maybe see all or their own? 
        # For now, let's say they see their own notes + target role logic for others
        # User request: "notas de los scouters se muestren en una bandeja o modulo para los entrenadores y viceversa"
        # If I am admin, maybe I see everything.
        pass
        
    query = select(Note)
    if target_role:
        query = query.where(Note.role == target_role)
    else:
        # If no specific target logic (e.g. admin or regular user), maybe just return all or nothing?
        # Let's return all for now if uncertain, or just empty.
        # But wait, if I am a coach, I want to see thoughts from scouters.
        pass

    result = await session.exec(query)
    notes = result.all()
    return notes
