
import pandas as pd
import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from sqlalchemy import select
from app.config import db
from app.model.league import League
from app.model.team import Team
from app.model.match import Match
from app.model.user import User

async def import_data():
    print("Initializing database...")
    await db.init()
    
    async with db.session as session:
        # Check League
        print("Checking League...")
        res = await session.execute(select(League).where(League.name == "Liga de Primera"))
        league = res.scalars().first()
        if not league:
            print("Creating League 'Liga de Primera'...")
            league = League(name="Liga de Primera", season="2025")
            session.add(league)
            await session.commit()
            await session.refresh(league)
        else:
            print(f"League found: {league.name}")
        
        league_id = league.id
        
        # Load CSV
        csv_path = "src/app/data/liga_chile_2025_dataset_limpio.csv"
        print(f"Reading CSV from {csv_path}...")
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            print(f"Error reading CSV: {e}")
            return
        
        # Collect teams
        teams = set(df['Equipo_Local'].unique()) | set(df['Equipo_Visitante'].unique())
        print(f"Found {len(teams)} unique teams.")
        
        team_map = {} # name -> id
        
        # Check existing teams in this league (or globals if teams are shared? For now assume league specific or global name check)
        # We check by name globally
        res = await session.execute(select(Team).where(Team.name.in_(teams)))
        existing_teams = res.scalars().all()
        for t in existing_teams:
            team_map[t.name] = t.id
            
        # Create missing teams
        new_teams_count = 0
        for t_name in teams:
            if t_name not in team_map:
                new_team = Team(name=t_name, league_id=league_id)
                session.add(new_team)
                await session.commit()
                await session.refresh(new_team)
                team_map[t_name] = new_team.id
                new_teams_count += 1
        
        print(f"Created {new_teams_count} new teams.")
        
        # Import Matches
        print("Importing matches...")
        matches_count = 0
        new_matches_count = 0
        
        for _, row in df.iterrows():
            matches_count += 1
            match_id = int(row['ID_Partido'])
            
            # Check if match exists
            res = await session.execute(select(Match).where(Match.id == match_id))
            if res.scalars().first():
                continue
            
            match_date = pd.to_datetime(row['Fecha_Hora'])
            home_team_id = team_map[row['Equipo_Local']]
            away_team_id = team_map[row['Equipo_Visitante']]
            
            match = Match(
                id=match_id,
                date=match_date,
                round=int(row['Jornada']),
                home_goals=int(row['Goles_Local']),
                away_goals=int(row['Goles_Visitante']),
                possession_home=float(row['Posesion_Local']),
                possession_away=float(row['Posesion_Visitante']),
                shots_home=int(row['Disparos_Totales_Local']),
                shots_away=int(row['Disparos_Totales_Visitante']),
                shots_on_target_home=int(row['Disparos_a_Puerta_Local']),
                shots_on_target_away=int(row['Disparos_a_Puerta_Visitante']),
                corners_home=int(row['Corners_Local']),
                corners_away=int(row['Corners_Visitante']),
                league_id=league_id,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                status="Finalizado"
            )
            session.add(match)
            new_matches_count += 1
        
        await session.commit()
        print(f"Import completed. Processed {matches_count} matches. Added {new_matches_count} new matches.")

if __name__ == "__main__":
    asyncio.run(import_data())
