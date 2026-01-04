from typing import Optional
from uuid import uuid4
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin

class Note(SQLModel, TimeMixin, table=True):
    __tablename__ = "note"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    content: str
    role: Optional[str] = None
    
    user_id: Optional[str] = Field(default=None, foreign_key="users.id")
    user: Optional["User"] = Relationship(back_populates="notes")
