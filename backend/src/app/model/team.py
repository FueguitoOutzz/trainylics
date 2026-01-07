from typing import List, Optional
from uuid import uuid4
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin

class Team(SQLModel, TimeMixin, table=True):
    __tablename__ = "team"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    name: str = Field(index=True)
    stadium: Optional[str] = None
    
    league_id: Optional[str] = Field(default=None, foreign_key="league.id")
    league: Optional["League"] = Relationship(back_populates="teams")
    
    players: List["Player"] = Relationship(back_populates="team")
    

    home_matches: List["Match"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Team.id==Match.home_team_id"}, back_populates="home_team")
    away_matches: List["Match"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Team.id==Match.away_team_id"}, back_populates="away_team")
