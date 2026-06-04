import logging
from datetime import datetime
from typing import List, Tuple, Optional
from sqlalchemy import select
from curl_cffi import requests

from app.config import db
from app.model.team import Team
from app.model.match import Match
from app.model.player import Player
from app.model.league import League

logger = logging.getLogger("app.service.sofascore")

class SofascoreService:

    @staticmethod
    def _extract_stat_value(groups: list, search_name: str, is_float: bool = False) -> Tuple[Optional[float], Optional[float]]:
        for group in groups:
            for item in group.get("statisticsItems", []):
                name = item.get("name", "").lower().strip()
                if search_name in name:
                    h_val = item.get("home")
                    a_val = item.get("away")
                    if isinstance(h_val, str):
                        h_val = h_val.replace("%", "").strip()
                    if isinstance(a_val, str):
                        a_val = a_val.replace("%", "").strip()
                    try:
                        if is_float:
                            return float(h_val) if h_val else None, float(a_val) if a_val else None
                        else:
                            return float(int(h_val)) if h_val else None, float(int(a_val)) if a_val else None
                    except ValueError:
                        return None, None
        return None, None

    @classmethod
    async def fetch_match_stats(cls, match_id: int) -> dict:
        url = f"https://www.sofascore.com/api/v1/event/{match_id}/statistics"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            logger.info(f"Fetching stats for match {match_id}")
            r = requests.get(url, headers=headers, impersonate="chrome", timeout=10)
            if r.status_code == 200:
                stats_data = r.json().get("statistics", [])
                # Look for the "ALL" period statistics
                all_stats = {}
                for period_data in stats_data:
                    if period_data.get("period") == "ALL":
                        groups = period_data.get("groups", [])
                        pos_h, pos_a = cls._extract_stat_value(groups, "possession", is_float=True)
                        shots_h, shots_a = cls._extract_stat_value(groups, "total shots", is_float=False)
                        on_target_h, on_target_a = cls._extract_stat_value(groups, "shots on target", is_float=False)
                        corners_h, corners_a = cls._extract_stat_value(groups, "corner kicks", is_float=False)
                        xg_h, xg_a = cls._extract_stat_value(groups, "expected goals", is_float=True)
                        
                        all_stats = {
                            "possession_home": pos_h,
                            "possession_away": pos_a,
                            "shots_home": int(shots_h) if shots_h is not None else None,
                            "shots_away": int(shots_a) if shots_a is not None else None,
                            "shots_on_target_home": int(on_target_h) if on_target_h is not None else None,
                            "shots_on_target_away": int(on_target_a) if on_target_a is not None else None,
                            "corners_home": int(corners_h) if corners_h is not None else None,
                            "corners_away": int(corners_a) if corners_a is not None else None,
                            "xg_home": xg_h,
                            "xg_away": xg_a
                        }
                        break
                return all_stats
        except Exception as e:
            logger.error(f"Error fetching stats for match {match_id}: {e}")
        return {}

    @classmethod
    async def sync_round(cls, tournament_id: int, season_id: int, round_num: int, league_id: str) -> List[dict]:
        url = f"https://www.sofascore.com/api/v1/unique-tournament/{tournament_id}/season/{season_id}/events/round/{round_num}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        logger.info(f"Fetching round {round_num} for tournament {tournament_id}, season {season_id}")
        r = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
        if r.status_code != 200:
            logger.error(f"Failed to fetch round. Status: {r.status_code}")
            raise Exception(f"Sofascore retornó código de estado {r.status_code}")

        events = r.json().get("events", [])
        synced_matches = []

        async with db.session as session:
            # 1. Fetch league to ensure it exists
            res = await session.execute(select(League).where(League.id == league_id))
            league = res.scalars().first()
            if not league:
                raise Exception(f"La liga local con ID {league_id} no existe.")

            for event in events:
                match_id = event.get("id")
                if not match_id:
                    continue

                home_team_info = event.get("homeTeam", {})
                away_team_info = event.get("awayTeam", {})

                home_name = home_team_info.get("name")
                away_name = away_team_info.get("name")
                home_sofascore_id = home_team_info.get("id")
                away_sofascore_id = away_team_info.get("id")

                if not home_name or not away_name:
                    continue

                # Get or create home team
                home_team = None
                if home_sofascore_id:
                    home_team = (await session.execute(
                        select(Team).where(Team.sofascore_id == home_sofascore_id, Team.league_id == league_id)
                    )).scalars().first()

                if not home_team:
                    # Fallback to name search
                    home_team = (await session.execute(
                        select(Team).where(Team.name == home_name, Team.league_id == league_id)
                    )).scalars().first()
                    
                    if home_team and home_sofascore_id:
                        # Update sofascore ID on existing team
                        home_team.sofascore_id = home_sofascore_id
                        session.add(home_team)
                        await session.commit()
                        await session.refresh(home_team)

                if not home_team:
                    home_team = Team(name=home_name, league_id=league_id, sofascore_id=home_sofascore_id)
                    session.add(home_team)
                    await session.commit()
                    await session.refresh(home_team)

                # Get or create away team
                away_team = None
                if away_sofascore_id:
                    away_team = (await session.execute(
                        select(Team).where(Team.sofascore_id == away_sofascore_id, Team.league_id == league_id)
                    )).scalars().first()

                if not away_team:
                    # Fallback to name search
                    away_team = (await session.execute(
                        select(Team).where(Team.name == away_name, Team.league_id == league_id)
                    )).scalars().first()
                    
                    if away_team and away_sofascore_id:
                        # Update sofascore ID on existing team
                        away_team.sofascore_id = away_sofascore_id
                        session.add(away_team)
                        await session.commit()
                        await session.refresh(away_team)

                if not away_team:
                    away_team = Team(name=away_name, league_id=league_id, sofascore_id=away_sofascore_id)
                    session.add(away_team)
                    await session.commit()
                    await session.refresh(away_team)

                # Check if match is played or upcoming
                status_type = event.get("status", {}).get("type", "notstarted")
                # If finished or has active goals info, treat as played
                is_played = status_type == "finished" or (event.get("homeScore", {}).get("current") is not None)

                stats = {}
                home_goals = None
                away_goals = None

                if is_played:
                    # Get stats and goals
                    stats = await cls.fetch_match_stats(match_id)
                    home_goals = event.get("homeScore", {}).get("current", 0)
                    away_goals = event.get("awayScore", {}).get("current", 0)

                # Match details
                match_date = datetime.fromtimestamp(event.get("startTimestamp", int(datetime.now().timestamp())))

                # Check if match exists
                existing_match = (await session.execute(select(Match).where(Match.id == match_id))).scalars().first()
                if existing_match:
                    # Update existing match
                    existing_match.date = match_date
                    existing_match.round = round_num
                    existing_match.home_goals = home_goals
                    existing_match.away_goals = away_goals
                    # Clear stats if it was somehow reset or populate if newly played
                    for key in ["possession_home", "possession_away", "shots_home", "shots_away", 
                                 "shots_on_target_home", "shots_on_target_away", "corners_home", "corners_away", 
                                 "xg_home", "xg_away"]:
                        setattr(existing_match, key, stats.get(key))
                    session.add(existing_match)
                    synced_matches.append({"id": match_id, "home": home_name, "away": away_name, "status": "updated"})
                else:
                    # Create new match
                    new_match = Match(
                        id=match_id,
                        date=match_date,
                        round=round_num,
                        home_goals=home_goals,
                        away_goals=away_goals,
                        league_id=league_id,
                        home_team_id=home_team.id,
                        away_team_id=away_team.id,
                        **stats
                    )
                    session.add(new_match)
                    synced_matches.append({"id": match_id, "home": home_name, "away": away_name, "status": "created"})

            await session.commit()
        return synced_matches

    @classmethod
    async def sync_roster(cls, sofascore_team_id: int, local_team_id: str) -> List[dict]:
        url = f"https://www.sofascore.com/api/v1/team/{sofascore_team_id}/players"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        logger.info(f"Fetching roster for sofascore team {sofascore_team_id}")
        r = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
        if r.status_code != 200:
            logger.error(f"Failed to fetch team roster. Status: {r.status_code}")
            raise Exception(f"Sofascore retornó código de estado {r.status_code}")

        players_data = r.json().get("players", [])
        synced_players = []

        # Position mapping
        pos_map = {
            "G": "Portero",
            "GK": "Portero",
            "goalkeeper": "Portero",
            "D": "Defensa",
            "DF": "Defensa",
            "defender": "Defensa",
            "M": "Mediocampista",
            "MF": "Mediocampista",
            "midfielder": "Mediocampista",
            "F": "Delantero",
            "FW": "Delantero",
            "forward": "Delantero",
            "attacker": "Delantero"
        }

        async with db.session as session:
            # Verify team exists
            res = await session.execute(select(Team).where(Team.id == local_team_id))
            team = res.scalars().first()
            if not team:
                raise Exception(f"El equipo con ID {local_team_id} no existe.")

            # Update team's sofascore_id if it's not set
            if team.sofascore_id != sofascore_team_id:
                team.sofascore_id = sofascore_team_id
                session.add(team)
                await session.commit()
                await session.refresh(team)

            for entry in players_data:
                player_info = entry.get("player", {})
                name = player_info.get("name")
                if not name:
                    continue

                raw_pos = player_info.get("position", "")
                mapped_pos = pos_map.get(raw_pos, "Mediocampista")

                # Check if player exists by name and team_id
                existing_player = (await session.execute(
                    select(Player).where(Player.name == name, Player.team_id == local_team_id)
                )).scalars().first()

                if existing_player:
                    existing_player.position = mapped_pos
                    session.add(existing_player)
                    synced_players.append({"name": name, "position": mapped_pos, "status": "updated"})
                else:
                    new_player = Player(
                        name=name,
                        position=mapped_pos,
                        team_id=local_team_id
                    )
                    session.add(new_player)
                    synced_players.append({"name": name, "position": mapped_pos, "status": "created"})

            await session.commit()
        return synced_players
