import asyncio
import sys
from pathlib import Path

# Ensure app path is loaded
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from sqlmodel import select
from app.config import db

# Import all models to configure registry
from app.model.user import User
from app.model.user_role import UserRole
from app.model.note import Note
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match

async def check():
    db.init()
    async with db.session_factory() as session:
        teams_res = await session.execute(select(Team))
        teams = teams_res.scalars().all()
        
        with_sofa = [t for t in teams if t.sofascore_id is not None]
        without_sofa = [t for t in teams if t.sofascore_id is None]
        
        print(f"Total Teams: {len(teams)}")
        print(f"Teams with sofascore_id: {len(with_sofa)}")
        print(f"Teams without sofascore_id: {len(without_sofa)}")
        
        if without_sofa:
            print("Sample Teams without sofascore_id:")
            for t in without_sofa[:5]:
                print(f"  - {t.name} (League: {t.league_id})")

if __name__ == "__main__":
    asyncio.run(check())
