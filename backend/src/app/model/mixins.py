from datetime import datetime, timezone
from sqlmodel import Field


class TimeMixin:

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    modified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))