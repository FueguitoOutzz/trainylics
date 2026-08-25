from typing import Optional, List
from uuid import uuid4
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin
from app.model.note import Recibe

class Player(SQLModel, TimeMixin, table=True):
    __tablename__ = "player"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    name: str
    position: Optional[str] = None
    technical_attributes: Optional[str] = None # Can store JSON string

    team_id: Optional[str] = Field(default=None, foreign_key="team.id")
    team: Optional["Team"] = Relationship(back_populates="players")
    
    notes: List["Note"] = Relationship(back_populates="players", link_model=Recibe)
