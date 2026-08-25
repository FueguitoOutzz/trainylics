from typing import Optional, List
from uuid import uuid4
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin

class Recibe(SQLModel, table=True):
    __tablename__ = "recibe"
    note_id: str = Field(foreign_key="note.id", primary_key=True, ondelete="CASCADE")
    player_id: str = Field(foreign_key="player.id", primary_key=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class Tiene(SQLModel, table=True):
    __tablename__ = "tiene"
    note_id: str = Field(foreign_key="note.id", primary_key=True, ondelete="CASCADE")
    team_id: str = Field(foreign_key="team.id", primary_key=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class Note(SQLModel, TimeMixin, table=True):
    __tablename__ = "note"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    content: str
    role: Optional[str] = None
    category: str = Field(default="general")
    rating: Optional[int] = Field(default=None)
    
    user_id: Optional[str] = Field(default=None, foreign_key="users.id")
    user: Optional["User"] = Relationship(back_populates="notes")

    # Keep old fields for compatibility and data migration
    team_id: Optional[str] = Field(default=None, foreign_key="team.id")
    player_id: Optional[str] = Field(default=None, foreign_key="player.id")

    # Many-to-Many Relationships
    teams: List["Team"] = Relationship(back_populates="notes", link_model=Tiene)
    players: List["Player"] = Relationship(back_populates="notes", link_model=Recibe)

