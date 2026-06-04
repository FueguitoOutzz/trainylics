import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

import app.main
from sqlalchemy import select
from app.config import db
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match
from app.model.note import Note

async def main():
    db.init()
    async with db.session_factory() as session:
        # 1. Fetch all leagues
        res = await session.execute(select(League))
        leagues = res.scalars().all()
        
        print("Standardizing league names and seasons...")
        
        # We will map league_id -> (new_name, new_season)
        league_updates = {
            "Liga de Primera 2022": ("Liga de Primera", "2022"),
            "Liga de Primera 2023": ("Liga de Primera", "2023"),
            "Liga de Primera 2024": ("Liga de Primera", "2024"),
            "Liga de Primera 2025": ("Liga de Primera", "2025"),
            "Liga de Primera 2026": ("Liga de Primera", "2026"),
            "Liga de Ascenso 2022": ("Liga de Ascenso", "2022"),
            "Liga de Ascenso 2023": ("Liga de Ascenso", "2023"),
            "Liga de Ascenso 2024": ("Liga de Ascenso", "2024"),
            "Liga de Ascenso 2025": ("Liga de Ascenso", "2025"),
            "Liga de Ascenso 2026": ("Liga de Ascenso", "2026"),
        }
        
        for league in leagues:
            if league.name in league_updates:
                new_name, new_season = league_updates[league.name]
                print(f"Updating: '{league.name}' -> name='{new_name}', season='{new_season}'")
                league.name = new_name
                league.season = new_season
                session.add(league)
        
        await session.commit()
        
        # Refresh leagues
        res = await session.execute(select(League))
        leagues = res.scalars().all()
        
        # 2. Find duplicate leagues by (name, season)
        leagues_by_key = {}
        for league in leagues:
            key = (league.name, league.season)
            leagues_by_key.setdefault(key, []).append(league)
            
        for key, group in leagues_by_key.items():
            if len(group) > 1:
                print(f"\nDuplicate league key found: {key} (appears {len(group)} times)")
                
                # Determine which one is the complete one and which is the incomplete one.
                # We will count matches for each.
                league_match_counts = []
                for league in group:
                    m_res = await session.execute(select(Match).where(Match.league_id == league.id))
                    m_count = len(m_res.scalars().all())
                    league_match_counts.append((m_count, league))
                    
                # Sort by count ascending, so the first is the incomplete one and the last is the complete one
                league_match_counts.sort(key=lambda x: x[0])
                complete_league = league_match_counts[-1][1]
                incomplete_leagues = [item[1] for item in league_match_counts[:-1]]
                
                print(f"Complete league: {complete_league.name} (Season: {complete_league.season}, ID: {complete_league.id}, Matches: {league_match_counts[-1][0]})")
                
                # Load all teams in complete league for mapping
                comp_teams_res = await session.execute(select(Team).where(Team.league_id == complete_league.id))
                comp_teams = comp_teams_res.scalars().all()
                comp_teams_by_name = {t.name.lower(): t for t in comp_teams}
                
                for inc_league in incomplete_leagues:
                    print(f"Incomplete league to merge/delete: {inc_league.name} (Season: {inc_league.season}, ID: {inc_league.id}, Matches: {next(x[0] for x in league_match_counts if x[1] == inc_league)})")
                    
                    # Find teams in this incomplete league
                    inc_teams_res = await session.execute(select(Team).where(Team.league_id == inc_league.id))
                    inc_teams = inc_teams_res.scalars().all()
                    
                    # Update notes linked to these teams or their players
                    for inc_team in inc_teams:
                        # Find corresponding team in complete league
                        corresp_team = comp_teams_by_name.get(inc_team.name.lower())
                        if corresp_team:
                            # Update notes for this team
                            notes_team_res = await session.execute(select(Note).where(Note.team_id == inc_team.id))
                            notes_team = notes_team_res.scalars().all()
                            for note in notes_team:
                                print(f"  Re-associating note {note.id} from team '{inc_team.name}' (ID: {inc_team.id}) to complete team (ID: {corresp_team.id})")
                                note.team_id = corresp_team.id
                                session.add(note)
                                
                            # Update notes for players of this team
                            players_res = await session.execute(select(Player).where(Player.team_id == inc_team.id))
                            players = players_res.scalars().all()
                            
                            # Load players in corresponding complete team
                            comp_players_res = await session.execute(select(Player).where(Player.team_id == corresp_team.id))
                            comp_players = comp_players_res.scalars().all()
                            comp_players_by_name = {p.name.lower(): p for p in comp_players}
                            
                            for p in players:
                                corresp_player = comp_players_by_name.get(p.name.lower())
                                if corresp_player:
                                    notes_play_res = await session.execute(select(Note).where(Note.player_id == p.id))
                                    notes_play = notes_play_res.scalars().all()
                                    for note in notes_play:
                                        print(f"  Re-associating note {note.id} from player '{p.name}' (ID: {p.id}) to complete player (ID: {corresp_player.id})")
                                        note.player_id = corresp_player.id
                                        session.add(note)
                                        
                    # Delete the incomplete league's matches, players, teams, then league
                    print(f"  Deleting incomplete matches...")
                    del_matches_res = await session.execute(select(Match).where(Match.league_id == inc_league.id))
                    for m in del_matches_res.scalars().all():
                        await session.delete(m)
                        
                    print(f"  Deleting incomplete players/teams...")
                    for inc_team in inc_teams:
                        pl_res = await session.execute(select(Player).where(Player.team_id == inc_team.id))
                        for pl in pl_res.scalars().all():
                            await session.delete(pl)
                        await session.delete(inc_team)
                        
                    print(f"  Deleting incomplete league...")
                    await session.delete(inc_league)
                    
        await session.commit()
        print("\nCleanup completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
