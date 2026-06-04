from typing import Optional
from uuid import uuid4
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin

class Tactic(SQLModel, TimeMixin, table=True):
    __tablename__ = "tactic"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    title: str
    description: Optional[str] = None
    formation: str = Field(default="4-3-3")
    positions_json: str  # Stringified JSON array of player coordinate mapping

    team_id: Optional[str] = Field(default=None, foreign_key="team.id")
    team: Optional["Team"] = Relationship()

    user_id: Optional[str] = Field(default=None, foreign_key="users.id")
    user: Optional["User"] = Relationship()
