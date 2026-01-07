from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin

if TYPE_CHECKING:
    from app.model.team import Team
    from app.model.league import League

class TeamRead(SQLModel):
    id: str
    name: str

class MatchBase(SQLModel):
    date: datetime
    round: int
    home_goals: int
    away_goals: int
    
    possession_home: Optional[float] = None
    possession_away: Optional[float] = None
    shots_home: Optional[int] = None
    shots_away: Optional[int] = None
    shots_on_target_home: Optional[int] = None
    shots_on_target_away: Optional[int] = None
    corners_home: Optional[int] = None
    corners_away: Optional[int] = None

    xg_home: Optional[float] = None
    xg_away: Optional[float] = None
    
    league_id: Optional[str] = Field(default=None, foreign_key="league.id")
    home_team_id: Optional[str] = Field(default=None, foreign_key="team.id")
    away_team_id: Optional[str] = Field(default=None, foreign_key="team.id")

class Match(MatchBase, TimeMixin, table=True):
    __tablename__ = "match"
    id: Optional[int] = Field(default=None, primary_key=True, nullable=False)
    
    league: Optional["League"] = Relationship(back_populates="matches")
    
    home_team: Optional["Team"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Match.home_team_id"}, back_populates="home_matches")
    away_team: Optional["Team"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Match.away_team_id"}, back_populates="away_matches")

class MatchRead(MatchBase):
    id: int
    home_team: Optional[TeamRead] = None
    away_team: Optional[TeamRead] = None
