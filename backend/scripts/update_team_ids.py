import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from sqlalchemy import select
from app.config import db
from app.model.team import Team
# Import other models so relationships resolve correctly
from app.model.note import Note
from app.model.league import League
from app.model.player import Player
from app.model.match import Match
from app.model.user import User

TEAM_MAPPING = {
    3155: ["colo colo", "colo-colo"],
    3151: ["universidad catolica", "u. catolica", "u catolica", "universidad católica"],
    3165: ["coquimbo unido", "coquimbo"],
    5032: ["everton", "everton de viña del mar", "everton de vina del mar"],
    3164: ["huachipato"],
    331131: ["deportes limache", "limache"],
    3157: ["palestino"],
    7029: ["nublense", "ñublense"],
    48242: ["union la calera", "la calera", "unión la calera"],
    3160: ["deportes concepcion", "deportes concepción", "deportes concepcion"],
    3167: ["cobresal"],
    3162: ["audax italiano", "audax"],
    5031: ["deportes la serena", "la serena"],
    5034: ["universidad de concepcion", "u. de concepcion", "universidad de concepción"],
    3163: ["ohiggins", "o'higgins", "o higgins"],
    3161: ["universidad de chile", "u. de chile", "u de chile"]
}

def clean_name(name: str) -> str:
    import unicodedata
    n = name.lower().strip()
    # Remove accents
    n = "".join(c for c in unicodedata.normalize('NFD', n) if unicodedata.category(c) != 'Mn')
    n = n.replace("-", " ").replace("'", "")
    return n

async def update_ids():
    print("Updating team Sofascore IDs in database...")
    db.init()
    
    async with db.session as session:
        # Get all teams
        res = await session.execute(select(Team))
        teams = res.scalars().all()
        
        updated_count = 0
        for team in teams:
            cleaned_team_name = clean_name(team.name)
            
            # Find matching Sofascore ID
            matched_id = None
            for sofascore_id, variations in TEAM_MAPPING.items():
                for var in variations:
                    cleaned_var = clean_name(var)
                    if cleaned_team_name == cleaned_var or cleaned_team_name in cleaned_var or cleaned_var in cleaned_team_name:
                        matched_id = sofascore_id
                        break
                if matched_id:
                    break
            
            if matched_id:
                team.sofascore_id = matched_id
                session.add(team)
                print(f"Mapped team '{team.name}' -> Sofascore ID: {matched_id}")
                updated_count += 1
            else:
                print(f"No mapping found for team '{team.name}'")
                
        await session.commit()
        print(f"Finished updating team IDs! Total updated: {updated_count}")

if __name__ == "__main__":
    asyncio.run(update_ids())
