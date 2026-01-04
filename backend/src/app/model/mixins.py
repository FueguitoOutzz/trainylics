from datetime import datetime, timezone
from sqlmodel import Field


class TimeMixin:
    """Mixin for datetime value of when the entity was created and when it was last modified."""

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))