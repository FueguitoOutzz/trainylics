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

class NoteCreate(BaseModel):
    content: str

class NoteResponse(BaseModel):
    id: str
    content: str
    role: Optional[str]
    author_name: Optional[str]
    created_at: Optional[datetime] = None 

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

@router.post("/", response_model=NoteResponse)
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

    # Fetch author name
    query = select(Person.name).join(User, User.person_id == Person.id).where(User.id == user_id)
    author_name = (await session.exec(query)).first()

    return NoteResponse(
        id=new_note.id,
        content=new_note.content,
        role=new_note.role,
        author_name=author_name,
        created_at=new_note.created_at
    )

@router.get("/", response_model=List[NoteResponse])
async def get_notes(token: str = Depends(JWTbearer()), session: AsyncSession = Depends(get_db)):
    user_id, role_name = await get_current_user_role(token, session)
    
    # Logic for visibility remains similar (returning all for now/demo)
        
    query = select(Note, Person.name).join(User, Note.user_id == User.id).join(Person, User.person_id == Person.id)
    
    result = await session.exec(query)
    rows = result.all()
    
    return [
        NoteResponse(
            id=note.id,
            content=note.content,
            role=note.role,
            author_name=name,
            created_at=note.created_at
        ) for note, name in rows
    ]

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

