from typing import List, Optional
from uuid import uuid4
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin
from app.model.note import Tiene

class Team(SQLModel, TimeMixin, table=True):
    __tablename__ = "team"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    name: str = Field(index=True)
    stadium: Optional[str] = None
    sofascore_id: Optional[int] = Field(default=None, index=True)
    
    league_id: Optional[str] = Field(default=None, foreign_key="league.id")
    group_name: Optional[str] = Field(default=None, index=True)
    
    league: Optional["League"] = Relationship(back_populates="teams")
    players: List["Player"] = Relationship(back_populates="team")
    notes: List["Note"] = Relationship(back_populates="teams", link_model=Tiene)
    
    home_matches: List["Match"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Team.id==Match.home_team_id"}, back_populates="home_team")
    away_matches: List["Match"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Team.id==Match.away_team_id"}, back_populates="away_team")
