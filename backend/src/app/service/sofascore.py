import logging
import asyncio
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

STADIUM_MAPPING = {
    3150: "Estadio Elías Figueroa Brander",
    3151: "Estadio San Carlos de Apoquindo",
    3152: "Estadio Municipal de San Felipe",
    3153: "Estadio Santa Laura-Universidad SEK",
    3154: "Estadio Fiscal de Talca",
    3155: "Estadio Monumental David Arellano",
    3156: "Estadio Municipal de La Pintana",
    3157: "Estadio Municipal de La Cisterna",
    3158: "Estadio Regional de Chinquihue",
    3159: "Estadio Zorros del Desierto",
    3160: "Estadio Ester Roa Rebolledo",
    3161: "Estadio Nacional Julio Martínez Prádanos",
    3162: "Estadio Bicentenario de La Florida",
    3163: "Estadio El Teniente",
    3164: "Estadio Huachipato-CAP Acero",
    3165: "Estadio Francisco Sánchez Rumoroso",
    3167: "Estadio El Cobre",
    5031: "Estadio La Portada",
    5032: "Estadio Sausalito",
    5033: "Estadio Roberto Bravo Santibáñez",
    5034: "Estadio Ester Roa Rebolledo",
    5275: "Estadio Francisco Sánchez Rumoroso",
    5276: "Estadio Tierra de Campeones",
    5277: "Estadio Luis Valenzuela Hermosilla",
    5278: "Estadio Nelson Oyarzún Arenas",
    5601: "Estadio Regional Calvo y Bascuñán",
    7029: "Estadio Nelson Oyarzún Arenas",
    33595: "Estadio La Granja",
    33596: "Estadio Tierra de Campeones",
    39219: "Estadio Carlos Dittborn",
    39220: "Estadio Lucio Fariña Fernández",
    48242: "Estadio Nicolás Chahuán Nazar",
    84875: "Estadio Municipal de Lo Barnechea",
    89506: "Estadio Luis Valenzuela Hermosilla",
    89508: "Estadio Municipal de San Bernardo",
    119072: "Estadio Germán Becker",
    243490: "Estadio Municipal Joaquín Muñoz García",
    284197: "Estadio Ester Roa Rebolledo",
    284309: "Estadio Municipal Leonel Sánchez Lineros",
    331131: "Estadio Gustavo Ocaranza",
}

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

        async with db.session_factory() as session:
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
                    stadium_name = None
                    if home_sofascore_id:
                        if home_sofascore_id in STADIUM_MAPPING:
                            stadium_name = STADIUM_MAPPING[home_sofascore_id]
                        else:
                            try:
                                detail_url = f"https://www.sofascore.com/api/v1/team/{home_sofascore_id}"
                                r_stadium = requests.get(detail_url, headers=headers, impersonate="chrome", timeout=10)
                                if r_stadium.status_code == 200:
                                    stadium_name = r_stadium.json().get("team", {}).get("venue", {}).get("name")
                            except Exception as e:
                                logger.error(f"Error fetching stadium for home team: {e}")
                            if not stadium_name:
                                stadium_name = "Estadio no registrado"
                    home_team = Team(name=home_name, league_id=league_id, sofascore_id=home_sofascore_id, stadium=stadium_name)
                    session.add(home_team)
                    await session.commit()
                    await session.refresh(home_team)
                elif home_team.sofascore_id and (not home_team.stadium or home_team.stadium == "Estadio no registrado"):
                    if home_team.sofascore_id in STADIUM_MAPPING:
                        home_team.stadium = STADIUM_MAPPING[home_team.sofascore_id]
                        session.add(home_team)
                        await session.commit()
                        await session.refresh(home_team)
                    else:
                        try:
                            detail_url = f"https://www.sofascore.com/api/v1/team/{home_team.sofascore_id}"
                            r_stadium = requests.get(detail_url, headers=headers, impersonate="chrome", timeout=10)
                            if r_stadium.status_code == 200:
                                stadium_name = r_stadium.json().get("team", {}).get("venue", {}).get("name")
                                if stadium_name:
                                    home_team.stadium = stadium_name
                                    session.add(home_team)
                                    await session.commit()
                                    await session.refresh(home_team)
                        except Exception as e:
                            logger.error(f"Error updating stadium for home team: {e}")

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
                    stadium_name = None
                    if away_sofascore_id:
                        if away_sofascore_id in STADIUM_MAPPING:
                            stadium_name = STADIUM_MAPPING[away_sofascore_id]
                        else:
                            try:
                                detail_url = f"https://www.sofascore.com/api/v1/team/{away_sofascore_id}"
                                r_stadium = requests.get(detail_url, headers=headers, impersonate="chrome", timeout=10)
                                if r_stadium.status_code == 200:
                                    stadium_name = r_stadium.json().get("team", {}).get("venue", {}).get("name")
                            except Exception as e:
                                logger.error(f"Error fetching stadium for away team: {e}")
                            if not stadium_name:
                                stadium_name = "Estadio no registrado"
                    away_team = Team(name=away_name, league_id=league_id, sofascore_id=away_sofascore_id, stadium=stadium_name)
                    session.add(away_team)
                    await session.commit()
                    await session.refresh(away_team)
                elif away_team.sofascore_id and (not away_team.stadium or away_team.stadium == "Estadio no registrado"):
                    if away_team.sofascore_id in STADIUM_MAPPING:
                        away_team.stadium = STADIUM_MAPPING[away_team.sofascore_id]
                        session.add(away_team)
                        await session.commit()
                        await session.refresh(away_team)
                    else:
                        try:
                            detail_url = f"https://www.sofascore.com/api/v1/team/{away_team.sofascore_id}"
                            r_stadium = requests.get(detail_url, headers=headers, impersonate="chrome", timeout=10)
                            if r_stadium.status_code == 200:
                                stadium_name = r_stadium.json().get("team", {}).get("venue", {}).get("name")
                                if stadium_name:
                                    away_team.stadium = stadium_name
                                    session.add(away_team)
                                    await session.commit()
                                    await session.refresh(away_team)
                        except Exception as e:
                            logger.error(f"Error updating stadium for away team: {e}")

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
            # Clean up duplicate postponed/rescheduled matches for this league and round
            stmt_dup = select(Match).where(Match.league_id == league_id, Match.round == round_num)
            res_dup = await session.execute(stmt_dup)
            matches_dup = res_dup.scalars().all()
            
            pairs = {}
            for m in matches_dup:
                key = tuple(sorted([str(m.home_team_id), str(m.away_team_id)]))
                if key not in pairs:
                    pairs[key] = []
                pairs[key].append(m)
                
            for key, match_list in pairs.items():
                if len(match_list) > 1:
                    played = [m for m in match_list if m.home_goals is not None and m.away_goals is not None]
                    unplayed = [m for m in match_list if m.home_goals is None or m.away_goals is None]
                    if played and unplayed:
                        for m in unplayed:
                            logger.info(f"Deleting duplicate unplayed postponed match ID {m.id} in sync_round")
                            await session.delete(m)

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

    @classmethod
    async def sync_teams_info(cls) -> dict:
        import urllib.parse
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        synced_results = []
        diagnostics = []
        async with db.session as session:
            # Fetch all teams
            res = await session.execute(select(Team))
            teams = res.scalars().all()
            
            diagnostics.append(f"Fetched {len(teams)} teams from database.")
            
            for team in teams:
                updated = False
                team_log = []
                team_log.append(f"Processing '{team.name}' (ID: {team.id}, sofascore_id: {team.sofascore_id}, stadium: {team.stadium})")
                
                # 1. If sofascore_id is missing, search it
                if not team.sofascore_id:
                    query_encoded = urllib.parse.quote(team.name)
                    search_url = f"https://www.sofascore.com/api/v1/search/all?q={query_encoded}"
                    team_log.append(f"Searching: {search_url}")
                    try:
                        r = requests.get(search_url, headers=headers, impersonate="chrome", timeout=10)
                        team_log.append(f"Search HTTP Status: {r.status_code}")
                        if r.status_code == 200:
                            results = r.json().get("results", [])
                            team_log.append(f"Search results count: {len(results)}")
                            found_team = False
                            for item in results:
                                if item.get("type") == "team":
                                    entity = item.get("entity", {})
                                    sport = entity.get("sport")
                                    sport_name = sport.get("name", "").lower() if sport else ""
                                    team_log.append(f"Found candidate: {entity.get('name')} (ID: {entity.get('id')}), sport: {sport_name}")
                                    if "foot" in sport_name or "socc" in sport_name or not sport_name:
                                        sofascore_id = entity.get("id")
                                        if sofascore_id:
                                            team.sofascore_id = sofascore_id
                                            updated = True
                                            found_team = True
                                            team_log.append(f"Set sofascore_id to {sofascore_id}")
                                            break
                            if not found_team:
                                team_log.append("No football team found in search results")
                        else:
                            team_log.append(f"Search failed body: {r.text[:200]}")
                    except Exception as e:
                        team_log.append(f"Search error: {str(e)}")
                
                # 2. If sofascore_id is present but stadium is missing, fetch details
                if team.sofascore_id and (not team.stadium or team.stadium == "Estadio no registrado"):
                    if team.sofascore_id in STADIUM_MAPPING:
                        stadium_name = STADIUM_MAPPING[team.sofascore_id]
                        team.stadium = stadium_name
                        updated = True
                        team_log.append(f"Set stadium to '{stadium_name}' from local mapping")
                    else:
                        detail_url = f"https://www.sofascore.com/api/v1/team/{team.sofascore_id}"
                        team_log.append(f"Fetching details: {detail_url}")
                        try:
                            r = requests.get(detail_url, headers=headers, impersonate="chrome", timeout=10)
                            team_log.append(f"Detail HTTP Status: {r.status_code}")
                            if r.status_code == 200:
                                team_info = r.json().get("team")
                                venue = team_info.get("venue") if team_info else None
                                stadium_name = venue.get("name") if venue else None
                                team_log.append(f"Details venue: {venue}, stadium_name: {stadium_name}")
                                if stadium_name:
                                    team.stadium = stadium_name
                                    updated = True
                                    team_log.append(f"Set stadium to '{stadium_name}'")
                                else:
                                    team_log.append("No stadium/venue name found in details")
                            else:
                                team_log.append(f"Detail fetch failed body: {r.text[:200]}")
                        except Exception as e:
                            team_log.append(f"Detail fetch error: {str(e)}")
                        
                if updated:
                    session.add(team)
                    synced_results.append({
                        "id": team.id,
                        "name": team.name,
                        "sofascore_id": team.sofascore_id,
                        "stadium": team.stadium
                    })
                diagnostics.append(" | ".join(team_log))
            
            if synced_results:
                await session.commit()
                
        return {
            "synced_results": synced_results,
            "diagnostics": diagnostics
        }

    @classmethod
    async def fetch_season_id(cls, tournament_id: int, season_year: str) -> Optional[int]:
        url = f"https://www.sofascore.com/api/v1/unique-tournament/{tournament_id}/seasons"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            r = requests.get(url, headers=headers, impersonate="chrome", timeout=10)
            if r.status_code == 200:
                seasons = r.json().get("seasons", [])
                for s in seasons:
                    if s.get("year") == season_year or season_year in s.get("name", ""):
                        return s.get("id")
                if seasons:
                    # Fallback to latest season if exact year not found
                    return seasons[0].get("id")
        except Exception as e:
            logger.error(f"Error fetching season ID for tournament {tournament_id}, year {season_year}: {e}")
        return None

    @classmethod
    async def get_sofascore_ids(cls, league_name: str, season: str) -> Tuple[Optional[int], Optional[int]]:
        tournament_id = None
        if "primera" in league_name.lower():
            tournament_id = 11653
        elif "tercera división b" in league_name.lower() or "tercera b" in league_name.lower():
            tournament_id = 22105
        elif "tercera división a" in league_name.lower() or "tercera a" in league_name.lower() or "tercera división" in league_name.lower():
            tournament_id = 22063
        elif "segunda" in league_name.lower():
            tournament_id = 18834
        elif "ascenso" in league_name.lower() or "b" in league_name.lower():
            tournament_id = 1240
            
        if not tournament_id:
            return None, None

        # Hardcoded mappings provided by the user for Segunda, Tercera A, and Tercera B
        mappings = {
            18834: {
                "2024": 58333,
                "2025": 68205,
                "2026": 86895
            },
            22063: {
                "2024": 58763,
                "2025": 70755,
                "2026": 91199
            },
            22105: {
                "2024": 59021,
                "2025": 73302,
                "2026": 91232
            }
        }

        if tournament_id in mappings and season in mappings[tournament_id]:
            season_id = mappings[tournament_id][season]
        else:
            season_id = await cls.fetch_season_id(tournament_id, season)
            
        return tournament_id, season_id

    @classmethod
    async def auto_sync_current_rounds(cls):
        logger.info("Starting automatic background sync of current rounds...")
        async with db.session_factory() as session:
            # 1. Fetch all leagues
            res = await session.execute(select(League))
            leagues = res.scalars().all()
            
            for league in leagues:
                tournament_id, season_id = await cls.get_sofascore_ids(league.name, league.season)
                if not tournament_id or not season_id:
                    logger.warning(f"Could not resolve Sofascore IDs for league '{league.name}' ({league.season})")
                                   # 2. Find the match in this league closest to the current date
                now = datetime.now()
                matches_res = await session.execute(
                    select(Match.round, Match.date, Match.home_goals, Match.away_goals).where(Match.league_id == league.id)
                )
                matches = matches_res.all()
                if not matches:
                    # If no matches exist, default to round 1
                    rounds_to_sync = [1]
                    logger.info(f"No matches in DB for league '{league.name}' ({league.season}). Syncing round 1.")
                else:
                    # Check if there are any matches scheduled for today (+/- 12 hours) in the database
                    # to avoid hitting Sofascore API when no matches are being played
                    from datetime import timedelta
                    margin = timedelta(hours=12)
                    has_today_matches = any(
                        (m.date >= now - margin) and (m.date <= now + margin)
                        for m in matches
                    )
                    
                    # Also check for any past unplayed matches to catch postponed/rescheduled matches
                    past_unplayed_rounds = list(set([
                        m.round for m in matches
                        if m.date < now and (m.home_goals is None or m.away_goals is None)
                    ]))
                    
                    if not has_today_matches and not past_unplayed_rounds:
                        logger.info(f"No matches scheduled around today (+/- 12h) and no past unplayed matches for league '{league.name}' ({league.season}). Skipping sync to avoid API saturation.")
                        continue
                    
                    rounds_to_sync = []
                    if has_today_matches:
                        # Find match with minimum date difference
                        closest_match = min(matches, key=lambda m: abs((m.date - now).total_seconds()))
                        current_round = closest_match.round
                        # Sync previous, current, and next round
                        rounds_to_sync.extend([max(1, current_round - 1), current_round, min(30, current_round + 1)])
                    
                    # Always include rounds of past unplayed matches to resolve postponed/rescheduled fixtures
                    rounds_to_sync.extend(past_unplayed_rounds)
                    rounds_to_sync = list(set(rounds_to_sync))
                    
                    logger.info(f"League '{league.name}' ({league.season}): syncing rounds: {rounds_to_sync}")
                
                for r in rounds_to_sync:
                    try:
                        logger.info(f"Auto syncing round {r} for league '{league.name}'...")
                        await cls.sync_round(
                            tournament_id=tournament_id,
                            season_id=season_id,
                            round_num=r,
                            league_id=league.id
                        )
                        # Sleep a bit to avoid hitting Sofascore limits
                        await asyncio.sleep(1.0)
                    except Exception as ex:
                        logger.error(f"Failed to auto sync round {r} for league '{league.name}': {ex}")

                try:
                    await cls.sync_team_groups(tournament_id=tournament_id, season_id=season_id, league_id=league.id)
                except Exception as ex:
                    logger.error(f"Failed to auto sync team groups for league '{league.name}': {ex}")

    @classmethod
    async def sync_new_tournaments_task(cls):
        logger.info("Starting background sync for Primera, Ascenso, Segunda, Tercera A, and Tercera B (2024-2026)...")
        tournaments = [
            {"name": "Liga de Primera"},
            {"name": "Liga de Ascenso"},
            {"name": "Liga de Segunda"},
            {"name": "Tercera División A"},
            {"name": "Tercera División B"}
        ]
        years = ["2024", "2025", "2026"]
        
        async with db.session_factory() as session:
            for t in tournaments:
                t_name = t["name"]
                for year in years:
                    try:
                        t_id, season_id = await cls.get_sofascore_ids(t_name, year)
                        if not t_id or not season_id:
                            logger.warning(f"Could not resolve Sofascore IDs for {t_name} ({year})")
                            continue
                        
                        # 2. Get or create League in database
                        league_res = await session.execute(
                            select(League).where(League.name == t_name, League.season == year)
                        )
                        league = league_res.scalars().first()
                        if not league:
                            league = League(name=t_name, season=year)
                            session.add(league)
                            await session.commit()
                            await session.refresh(league)
                        
                        league_id = league.id
                        
                        # Optimization: if it is a completed season (2024, 2025) and matches already exist, skip API requests to avoid rate limits
                        from sqlalchemy import func
                        from app.model.match import Match
                        
                        match_count_res = await session.execute(
                            select(func.count(Match.id)).where(Match.league_id == league_id)
                        )
                        match_count = match_count_res.scalar() or 0
                        
                        if year in ["2024", "2025"] and match_count > 0:
                            logger.info(f"Skipping background API requests for completed league {t_name} ({year}) - {match_count} matches already synced.")
                            continue

                        logger.info(f"Syncing league: {t_name} ({year}) with season ID {season_id}...")
                        
                        # 3. Sync all rounds 1 to 30
                        consecutive_empty = 0
                        for r in range(1, 31):
                            try:
                                results = await cls.sync_round(
                                    tournament_id=t_id,
                                    season_id=season_id,
                                    round_num=r,
                                    league_id=league_id
                                )
                                if not results:
                                    logger.info(f"  Round {r}: no matches returned.")
                                    consecutive_empty += 1
                                else:
                                    logger.info(f"  Round {r}: synced {len(results)} matches.")
                                    consecutive_empty = 0
                                
                                if consecutive_empty >= 3:
                                    logger.info(f"Stopping round sync for this season after {consecutive_empty} consecutive empty rounds.")
                                    break
                                await asyncio.sleep(0.5)
                            except Exception as e:
                                logger.warning(f"  Round {r} ended or failed: {e}")
                                consecutive_empty += 1
                                if consecutive_empty >= 3:
                                    logger.info(f"Stopping round sync for this season after {consecutive_empty} consecutive failures/empty rounds.")
                                    break
                        
                        # Sync team group divisions
                        await cls.sync_team_groups(tournament_id=t_id, season_id=season_id, league_id=league_id)
                    except Exception as ex:
                        logger.error(f"Error syncing {t_name} for year {year}: {ex}")

    @classmethod
    async def sync_team_groups(cls, tournament_id: int, season_id: int, league_id: str):
        url = f"https://www.sofascore.com/api/v1/unique-tournament/{tournament_id}/season/{season_id}/standings/total"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            logger.info(f"Syncing team groups for tournament {tournament_id}, season {season_id}...")
            r = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
            if r.status_code == 200:
                data = r.json()
                standings = data.get("standings", [])
                async with db.session_factory() as session:
                    for std in standings:
                        name = std.get("name", "")
                        group_name = None
                        if "zona norte" in name.lower() or "grupo norte" in name.lower() or "north" in name.lower():
                            group_name = "Zona Norte"
                        elif "zona sur" in name.lower() or "grupo sur" in name.lower() or "south" in name.lower():
                            group_name = "Zona Sur"
                        elif "zona centro" in name.lower() or "grupo centro" in name.lower() or "center" in name.lower():
                            group_name = "Zona Centro"
                        elif len(standings) > 1:
                            group_name = name
                        
                        if group_name:
                            rows = std.get("rows", [])
                            for row in rows:
                                team_info = row.get("team", {})
                                team_sofascore_id = team_info.get("id")
                                if team_sofascore_id:
                                    res = await session.execute(
                                        select(Team).where(Team.sofascore_id == team_sofascore_id, Team.league_id == league_id)
                                    )
                                    team = res.scalars().first()
                                    if team:
                                        team.group_name = group_name
                                        session.add(team)
                    await session.commit()
            else:
                logger.warning(f"Standings API returned {r.status_code} for tournament {tournament_id}, season {season_id}")
        except Exception as e:
            logger.error(f"Error syncing team groups: {e}")

    @classmethod
    async def fetch_match_lineup(cls, match_id: int) -> dict:
        url = f"https://www.sofascore.com/api/v1/event/{match_id}/lineups"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            logger.info(f"Fetching lineups for match {match_id}")
            r = requests.get(url, headers=headers, impersonate="chrome", timeout=10)
            if r.status_code == 200:
                return r.json()
            else:
                logger.warning(f"Lineups API returned status {r.status_code} for match {match_id}")
        except Exception as e:
            logger.error(f"Error fetching lineups for match {match_id}: {e}")
        return {}
