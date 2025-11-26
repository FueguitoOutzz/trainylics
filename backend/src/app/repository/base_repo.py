from typing import TypeVar, Optional, Type
from sqlalchemy import update as sql_update, delete as sql_delete
from sqlalchemy.future import select
from app.config import db, commit_session

T = TypeVar('T')


class BaseRepo:
    model: Optional[Type[T]] = None

    @classmethod
    async def create(cls, **kwargs):
        instance = cls.model(**kwargs)
        db.add(instance)
        await commit_session()
        return instance

    @classmethod
    async def get_all(cls):
        query = select(cls.model)
        result = await db.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_id(cls, model_id: str):
        query = select(cls.model).where(cls.model.id == model_id)
        result = await db.execute(query)
        return result.scalars().one_or_none()

    @classmethod
    async def update(cls, model_id: str, **kwargs):
        query = (
            sql_update(cls.model)
            .where(cls.model.id == model_id)
            .values(**kwargs)
            .execution_options(synchronize_session="fetch")
        )
        await db.execute(query)
        await commit_session()

    @classmethod
    async def delete(cls, model_id: str):
        query = sql_delete(cls.model).where(cls.model.id == model_id)
        await db.execute(query)
        await commit_session()