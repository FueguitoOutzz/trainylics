
import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from app.config import db
from app.model.team import Team
from app.model.match import Match
from app.model.league import League
from app.model.player import Player
from sqlalchemy import func, select

async def verify():
    db.init()
    async with db.session as session:
        leagues = await session.scalar(select(func.count()).select_from(League))
        teams = await session.scalar(select(func.count()).select_from(Team))
        matches = await session.scalar(select(func.count()).select_from(Match))
        players = await session.scalar(select(func.count()).select_from(Player))
        
        print(f"Leagues: {leagues}")
        print(f"Teams: {teams}")
        print(f"Matches: {matches}")
        print(f"Players: {players}")

if __name__ == "__main__":
    asyncio.run(verify())
