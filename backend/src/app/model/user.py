
from typing import List, Optional
from uuid import uuid4
from sqlalchemy import Column, String
from sqlmodel import SQLModel, Field, Relationship

from app.model.mixins import TimeMixin
from app.model.user_role import UserRole

class User(SQLModel, TimeMixin, table=True):
    __tablename__ = "users"

    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True, nullable=False)
    username: str = Field(sa_column=Column("username", String, unique=True))
    email: str = Field(sa_column=Column("email", String, unique=True))
    password: str

    person_id: Optional[str] = Field(default=None, foreign_key="person.id")
    person: Optional["Person"] = Relationship(back_populates="user")

    roles: List["Role"] = Relationship(back_populates="users", link_model=UserRole)
    notes: List["Note"] = Relationship(back_populates="user")
