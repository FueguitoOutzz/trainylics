
import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from app.config import db
from sqlalchemy import text

async def reset_db():
    print("Resetting database...")
    db.init()
    async with db.session as session:
        # Drop tables with CASCADE to handle dependencies
        tables = ["note", "match", "player", "team", "league", "user_role", "person", "role", "users", "alembic_version"]
        for table in tables:
            print(f"Dropping {table}...")
            try:
                await session.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                await session.commit()
            except Exception as e:
                print(f"Error dropping {table}: {e}")
        
        # Drop Enum types
        print("Dropping types...")
        try:
            await session.execute(text("DROP TYPE IF EXISTS sex CASCADE"))
            await session.commit()
        except Exception as e:
            print(f"Error dropping type sex: {e}")
                
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_db())
