from typing import List, Optional
from uuid import uuid4
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin

class League(SQLModel, TimeMixin, table=True):
    __tablename__ = "league"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    name: str = Field(index=True)
    season: str
    
    teams: List["Team"] = Relationship(back_populates="league")
    matches: List["Match"] = Relationship(back_populates="league")
