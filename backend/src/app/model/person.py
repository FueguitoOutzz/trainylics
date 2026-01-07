

from datetime import date
from enum import Enum
from typing import Optional
from pydantic import ConfigDict
from sqlalchemy import table
from sqlmodel import SQLModel, Field, Relationship
from app.model.mixins import TimeMixin


class Sex(str, Enum):
    Hombre = "Hombre"
    Mujer = "Mujer"


class Person(SQLModel, TimeMixin, table=True):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    __tablename__ = "person"

    id: Optional[str] = Field(None, primary_key=True, nullable=False)
    name: str
    birth: date
    sex: Sex
    profile: str
    phone_number: str

    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={'uselist': False}, back_populates="person")