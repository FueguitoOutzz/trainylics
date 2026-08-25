import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from sqlmodel import select
from app.config import db
from app.model.user import User
from app.model.person import Person
from app.model.role import Role
from app.model.user_role import UserRole
from app.model.note import Note
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match
from app.model.tactic import Tactic

async def check():
    db.init()
    async with db.session_factory() as session:
        # Query leagues
        leagues_res = await session.execute(select(League))
        leagues = leagues_res.scalars().all()
        print(f"Total leagues: {len(leagues)}")
        for l in leagues:
            print(f"League ID: {l.id}, Name: {l.name}, Season: {l.season}")
            # Count total matches in this league
            cnt_res = await session.execute(
                select(Match).where(Match.league_id == l.id)
            )
            matches = cnt_res.scalars().all()
            print(f"  * Total matches: {len(matches)}")
            if matches:
                rounds = set(m.round for m in matches)
                print(f"  * Rounds present: {sorted(list(rounds))}")
                played = sum(1 for m in matches if m.home_goals is not None)
                print(f"  * Played matches: {played}")

if __name__ == "__main__":
    asyncio.run(check())
