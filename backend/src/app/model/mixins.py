from datetime import datetime
from sqlmodel import Field


class TimeMixin:
    """Mixin for datetime value of when the entity was created and when it was last modified."""

    created_at: datetime = Field(default_factory=datetime.utcnow)
    modified_at: datetime = Field(default_factory=datetime.utcnow)