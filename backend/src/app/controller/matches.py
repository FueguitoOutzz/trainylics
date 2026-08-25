from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Optional

from app.config import db
from app.model.match import Match

router = APIRouter(prefix="/matches", tags=["Matches"])

async def get_db():
    async with db.session_factory() as session:
        yield session

from sqlalchemy.orm import selectinload

from app.model.match import Match, MatchRead

@router.get("/round/{round_num}", response_model=List[MatchRead])
async def get_matches_by_round(round_num: int, league_id: Optional[str] = None, session: AsyncSession = Depends(get_db)):
    """
    Get matches for a specific round, optionally filtered by league.
    """
    try:
        query = select(Match).where(Match.round == round_num)
        if league_id:
            query = query.where(Match.league_id == league_id)
        statement = query.options(
            selectinload(Match.home_team),
            selectinload(Match.away_team)
        )
        result = await session.exec(statement)
        matches = result.all()
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[MatchRead])
async def get_all_matches(session: AsyncSession = Depends(get_db)):
    """
    Get all matches.
    """
    try:
        statement = select(Match)
        result = await session.exec(statement)
        matches = result.all()
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync-league/{league_id}")
async def sync_league_all_rounds(league_id: str, session: AsyncSession = Depends(get_db)):
    """
    Sincroniza manualmente las 30 jornadas de una liga.
    """
    try:
        from sqlalchemy import select
        from app.model.league import League
        from app.service.sofascore import SofascoreService
        
        res = await session.execute(select(League).where(League.id == league_id))
        league = res.scalars().first()
        if not league:
            raise HTTPException(status_code=404, detail="League not found")
            
        tournament_id, season_id = await SofascoreService.get_sofascore_ids(league.name, league.season)
        if not tournament_id or not season_id:
            raise HTTPException(status_code=400, detail="Could not resolve Sofascore IDs")
            
        synced_rounds = []
        consecutive_empty = 0
        import asyncio
        for r in range(1, 31):
            try:
                results = await SofascoreService.sync_round(
                    tournament_id=tournament_id,
                    season_id=season_id,
                    round_num=r,
                    league_id=league_id
                )
                if not results:
                    consecutive_empty += 1
                else:
                    synced_rounds.append(r)
                    consecutive_empty = 0
                
                if consecutive_empty >= 3:
                    break
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"Error syncing round {r}: {e}")
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    break
                
        await SofascoreService.sync_team_groups(tournament_id, season_id, league_id)
        
        return {"detail": f"Sincronización completada para la liga {league.name}", "synced_rounds": synced_rounds}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/round/{round_num}/predictions")
async def get_round_predictions(round_num: int, league_id: Optional[str] = None, model: str = "rf", session: AsyncSession = Depends(get_db)):
    """
    Get matches for a specific round with ML predictions.
    """
    try:
        from app.service.ml_service import predict_single_match
        from sqlalchemy.orm import selectinload

        query = select(Match).where(Match.round == round_num)
        if league_id:
            query = query.where(Match.league_id == league_id)
            
        statement = query.options(
            selectinload(Match.home_team),
            selectinload(Match.away_team)
        )
        result = await session.exec(statement)
        matches = result.all()
        
        predictions = []
        for match in matches:
            match_data = match.model_dump()
            if round_num == 30:
                match_data['home_goals'] = None
                match_data['away_goals'] = None

            pred_all = await predict_single_match(match, session)
            pred = pred_all.get(model, pred_all.get("rf", {
                "result": "Empate",
                "accuracy": 0.33,
                "probabilities": {"Local": 33.3, "Empate": 33.4, "Visita": 33.3}
            }))
            
            predictions.append({
                **match_data,
                "home_team": match.home_team.model_dump() if match.home_team else None,
                "away_team": match.away_team.model_dump() if match.away_team else None,
                "prediction_result": pred["result"],
                "prediction_accuracy": pred["accuracy"],
                "prediction_probabilities": {k: round(v, 1) for k, v in pred.get("probabilities", {"Local": 33.3, "Empate": 33.3, "Visita": 33.3}).items()}
            })
            
        return predictions
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/round/{round_num}/predict")
async def generate_round_prediction(round_num: int, league_id: Optional[str] = None, model: str = "rf", session: AsyncSession = Depends(get_db)):
    """
    Train model on all played matches and predict for the specified round and league.
    """
    try:
        from app.service.ml_service import predictor, predict_single_match
        from sqlalchemy.orm import selectinload

        # 1. Train on all previous data with valid results
        train_statement = select(Match).where(
            Match.home_goals != None,
            Match.away_goals != None
        )
        train_result = await session.exec(train_statement)
        train_matches = train_result.all()
        
        if not train_matches:
             raise HTTPException(status_code=400, detail="Not enough historical data to train")

        matches_data = [m.model_dump() for m in train_matches]
        predictor.train(matches_data)

        # 2. Predict for target round
        target_query = select(Match).where(Match.round == round_num)
        if league_id:
            target_query = target_query.where(Match.league_id == league_id)
            
        target_statement = target_query.options(
            selectinload(Match.home_team),
            selectinload(Match.away_team)
        )
        target_result = await session.exec(target_statement)
        target_matches = target_result.all()
        
        predictions = []
        for match in target_matches:
            match_data = match.model_dump()
            
            pred_all = await predict_single_match(match, session)
            pred = pred_all.get(model, pred_all.get("rf", {
                "result": "Empate",
                "accuracy": 0.33,
                "probabilities": {"Local": 33.3, "Empate": 33.4, "Visita": 33.3}
            }))
            
            predictions.append({
                **match_data,
                "home_team": match.home_team.model_dump() if match.home_team else None,
                "away_team": match.away_team.model_dump() if match.away_team else None,
                "prediction_result": pred["result"],
                "prediction_accuracy": pred["accuracy"],
                "prediction_probabilities": {k: round(v, 1) for k, v in pred.get("probabilities", {"Local": 33.3, "Empate": 33.3, "Visita": 33.3}).items()}
            })
            
        return predictions
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/league/{league_id}/standings")
async def get_league_standings(league_id: str, session: AsyncSession = Depends(get_db)):
    """
    Calculate and return the dynamic league standings table.
    """
    try:
        from app.model.team import Team
        
        # Get all teams in this league
        teams_res = await session.execute(select(Team).where(Team.league_id == league_id))
        teams = teams_res.scalars().all()
        
        # Get all played matches in this league
        matches_res = await session.execute(
            select(Match).where(
                Match.league_id == league_id,
                Match.home_goals != None,
                Match.away_goals != None
            )
        )
        matches = matches_res.scalars().all()
        
        # Initialize stats for each team
        standings = {
            team.id: {
                "team_id": team.id,
                "team_name": team.name,
                "pj": 0,  # partidos jugados
                "pg": 0,  # partidos ganados
                "pe": 0,  # partidos empatados
                "pp": 0,  # partidos perdidos
                "gf": 0,  # goles a favor
                "gc": 0,  # goles en contra
                "dg": 0,  # diferencia de goles
                "pts": 0  # puntos
            }
            for team in teams
        }
        
        # Calculate stats based on matches
        for m in matches:
            home_id = m.home_team_id
            away_id = m.away_team_id
            home_goals = m.home_goals
            away_goals = m.away_goals
            
            # Ensure teams exist in our tracking
            if home_id not in standings or away_id not in standings:
                continue
                
            h_stat = standings[home_id]
            a_stat = standings[away_id]
            
            h_stat["pj"] += 1
            a_stat["pj"] += 1
            
            h_stat["gf"] += home_goals
            h_stat["gc"] += away_goals
            a_stat["gf"] += away_goals
            a_stat["gc"] += home_goals
            
            if home_goals > away_goals:
                h_stat["pg"] += 1
                h_stat["pts"] += 3
                a_stat["pp"] += 1
            elif home_goals < away_goals:
                a_stat["pg"] += 1
                a_stat["pts"] += 3
                h_stat["pp"] += 1
            else:
                h_stat["pe"] += 1
                h_stat["pts"] += 1
                a_stat["pe"] += 1
                a_stat["pts"] += 1
                
        # Calculate difference of goals
        for team_id, stat in standings.items():
            stat["dg"] = stat["gf"] - stat["gc"]
            
        # Check if any team has a group_name
        has_groups = any(team.group_name is not None for team in teams)
        
        if has_groups:
            # Group by group_name. Any team with None group can go to "General"
            groups_dict = {}
            for team in teams:
                g_name = team.group_name or "General"
                if g_name not in groups_dict:
                    groups_dict[g_name] = []
                    
            for team in teams:
                g_name = team.group_name or "General"
                groups_dict[g_name].append(standings[team.id])
                
            # Convert to list of dicts: [{"group_name": "Zona Norte", "rows": [...]}, ...]
            grouped_standings = []
            for g_name, rows in groups_dict.items():
                # Sort rows within the group
                rows.sort(key=lambda x: (-x["pts"], -x["dg"], -x["gf"], x["team_name"].lower()))
                grouped_standings.append({
                    "group_name": g_name,
                    "rows": rows
                })
            # Sort the groups by name (e.g. Zona Norte, then Zona Sur)
            grouped_standings.sort(key=lambda x: x["group_name"])
            return grouped_standings
        else:
            # Convert to list and sort
            standings_list = list(standings.values())
            standings_list.sort(key=lambda x: (-x["pts"], -x["dg"], -x["gf"], x["team_name"].lower()))
            return standings_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leagues")
async def get_all_leagues(session: AsyncSession = Depends(get_db)):
    try:
        from app.model.league import League
        statement = select(League)
        result = await session.exec(statement)
        return result.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/teams")
async def get_all_teams(league_id: Optional[str] = None, session: AsyncSession = Depends(get_db)):
    try:
        from app.model.team import Team
        from sqlalchemy.orm import selectinload
        statement = select(Team).options(selectinload(Team.league))
        if league_id:
            statement = statement.where(Team.league_id == league_id)
        result = await session.exec(statement)
        teams = result.all()
        
        # Deduplicar equipos por nombre si no hay filtro de liga
        if not league_id:
            def get_season_year(t):
                try:
                    if t.league and t.league.season:
                        return int(t.league.season)
                except (ValueError, TypeError):
                    pass
                return 0
            
            # Ordenar de temporada más reciente a más antigua
            teams = sorted(teams, key=get_season_year, reverse=True)
            
            seen_names = set()
            unique_teams = []
            for t in teams:
                clean_name = t.name.strip().lower()
                if clean_name not in seen_names:
                    seen_names.add(clean_name)
                    unique_teams.append(t)
            return unique_teams
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/players")
async def get_players(team_id: Optional[str] = None, session: AsyncSession = Depends(get_db)):
    try:
        from app.model.player import Player
        from app.model.team import Team
        from app.service.sofascore import SofascoreService
        import json
        import random
        import hashlib
        
        def get_player_stats(player):
            if player.technical_attributes:
                try:
                    return json.loads(player.technical_attributes)
                except Exception:
                    pass
            
            # Deterministic generation based on player name seed
            seed_num = int(hashlib.md5(player.name.encode('utf-8')).hexdigest(), 16) % 10000
            rng = random.Random(seed_num)
            pos = player.position or "Mediocampista"
            
            if pos == "Portero":
                return {
                    "Reflejos": rng.randint(70, 92),
                    "Paradas": rng.randint(70, 90),
                    "Juego Aéreo": rng.randint(65, 88),
                    "Saques": rng.randint(60, 85),
                    "Posicionamiento": rng.randint(70, 90),
                    "Físico": rng.randint(60, 80)
                }
            elif pos == "Defensa":
                return {
                    "Entradas": rng.randint(70, 92),
                    "Intercepciones": rng.randint(70, 90),
                    "Físico": rng.randint(70, 90),
                    "Juego Aéreo": rng.randint(65, 90),
                    "Velocidad": rng.randint(60, 85),
                    "Pase": rng.randint(50, 75)
                }
            elif pos == "Mediocampista":
                return {
                    "Pase": rng.randint(72, 92),
                    "Visión": rng.randint(70, 90),
                    "Regate": rng.randint(70, 88),
                    "Físico": rng.randint(65, 85),
                    "Recuperación": rng.randint(55, 80),
                    "Disparo": rng.randint(50, 78)
                }
            else:  # Delantero
                return {
                    "Definición": rng.randint(74, 94),
                    "Disparo": rng.randint(70, 90),
                    "Velocidad": rng.randint(72, 94),
                    "Regate": rng.randint(70, 90),
                    "Físico": rng.randint(65, 85),
                    "Juego Aéreo": rng.randint(55, 82)
                }

        players = []
        if team_id:
            statement = select(Player).where(Player.team_id == team_id)
            result = await session.exec(statement)
            players = result.all()
            
            if not players:
                # No players in DB, auto sync from Sofascore if team has a sofascore_id
                team_res = await session.exec(select(Team).where(Team.id == team_id))
                team = team_res.first()
                if team:
                    team_sofascore_id = getattr(team, 'sofascore_id', None)
                    if not team_sofascore_id:
                        import unicodedata
                        def clean_name(name: str) -> str:
                            n = name.lower().strip()
                            n = "".join(c for c in unicodedata.normalize('NFD', n) if unicodedata.category(c) != 'Mn')
                            n = n.replace("-", " ").replace("'", "")
                            return n
                        
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
                            3160: ["deportes concepcion", "deportes concepción"],
                            3167: ["cobresal"],
                            3162: ["audax italiano", "audax"],
                            5031: ["deportes la serena", "la serena"],
                            5034: ["universidad de concepcion", "u. de concepcion", "universidad de concepción"],
                            3163: ["ohiggins", "o'higgins", "o higgins"],
                            3161: ["universidad de chile", "u. de chile", "u de chile"]
                        }
                        
                        cleaned_team_name = clean_name(team.name)
                        for sofascore_id, variations in TEAM_MAPPING.items():
                            for var in variations:
                                cleaned_var = clean_name(var)
                                if cleaned_team_name == cleaned_var or cleaned_team_name in cleaned_var or cleaned_var in cleaned_team_name:
                                    team_sofascore_id = sofascore_id
                                    break
                            if team_sofascore_id:
                                break
                        
                        if team_sofascore_id:
                            team.sofascore_id = team_sofascore_id
                            session.add(team)
                            await session.commit()
                            await session.refresh(team)
                    
                    if team_sofascore_id:
                        try:
                            await SofascoreService.sync_roster(team_sofascore_id, team_id)
                            # Re-query players after sync
                            result = await session.exec(statement)
                            players = result.all()
                        except Exception as sync_err:
                            print(f"Failed to auto-sync roster for team {team_id}: {sync_err}")
        else:
            statement = select(Player)
            result = await session.exec(statement)
            players = result.all()
            
        players_data = []
        for p in players:
            p_dict = p.model_dump()
            p_dict["stats"] = get_player_stats(p)
            players_data.append(p_dict)
        return players_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/team/{team_id}/stats")
async def get_team_stats(team_id: str, session: AsyncSession = Depends(get_db)):
    try:
        from app.model.team import Team
        from app.model.match import Match
        
        # Verify team exists
        team_statement = select(Team).where(Team.id == team_id)
        team_res = await session.exec(team_statement)
        team = team_res.first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
            
        # Get all played matches where this team played
        matches_statement = select(Match).where(
            ((Match.home_team_id == team_id) | (Match.away_team_id == team_id)) &
            (Match.home_goals != None) & (Match.away_goals != None)
        ).order_by(Match.date.desc())
        
        matches_res = await session.exec(matches_statement)
        matches = matches_res.all()
        
        total_matches = len(matches)
        if total_matches == 0:
            return {
                "team_id": team_id,
                "team_name": team.name,
                "sofascore_id": team.sofascore_id,
                "stadium": team.stadium,
                "total_matches": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
                "goals_scored": 0,
                "goals_conceded": 0,
                "avg_possession": 0,
                "avg_shots": 0,
                "avg_shots_on_target": 0,
                "avg_corners": 0,
                "avg_xg": 0,
                "recent_form": []
            }
            
        wins = 0
        draws = 0
        losses = 0
        goals_scored = 0
        goals_conceded = 0
        
        possession_sum = 0
        possession_count = 0
        shots_sum = 0
        shots_count = 0
        shots_on_target_sum = 0
        shots_on_target_count = 0
        corners_sum = 0
        corners_count = 0
        xg_sum = 0
        xg_count = 0
        
        recent_form = []
        
        teams_map_res = await session.exec(select(Team.id, Team.name))
        teams_map = {row[0]: row[1] for row in teams_map_res.all()}
        
        for m in matches:
            is_home = m.home_team_id == team_id
            opponent_id = m.away_team_id if is_home else m.home_team_id
            opponent_name = teams_map.get(opponent_id, "Oponente")
            
            h_g = m.home_goals
            a_g = m.away_goals
            
            my_goals = h_g if is_home else a_g
            opp_goals = a_g if is_home else h_g
            
            goals_scored += my_goals
            goals_conceded += opp_goals
            
            if my_goals > opp_goals:
                wins += 1
                result_char = "W"
            elif my_goals < opp_goals:
                losses += 1
                result_char = "L"
            else:
                draws += 1
                result_char = "D"
                
            my_poss = m.possession_home if is_home else m.possession_away
            if my_poss is not None:
                possession_sum += my_poss
                possession_count += 1
                
            my_sot = m.shots_on_target_home if is_home else m.shots_on_target_away
            my_shots = m.shots_home if is_home else m.shots_away
            
            if (my_shots is None or my_shots == 0) and (my_sot is not None and my_sot > 0):
                my_shots = my_sot
                
            if my_shots is not None:
                shots_sum += my_shots
                shots_count += 1
                
            my_sot = m.shots_on_target_home if is_home else m.shots_on_target_away
            if my_sot is not None:
                shots_on_target_sum += my_sot
                shots_on_target_count += 1
                
            my_corners = m.corners_home if is_home else m.corners_away
            if my_corners is not None:
                corners_sum += my_corners
                corners_count += 1
                
            my_xg = m.xg_home if is_home else m.xg_away
            if my_xg is not None:
                xg_sum += my_xg
                xg_count += 1
                
            if len(recent_form) < 5:
                recent_form.append({
                    "match_id": m.id,
                    "date": m.date.isoformat() if m.date else None,
                    "opponent": opponent_name,
                    "is_home": is_home,
                    "result": result_char,
                    "score": f"{my_goals}-{opp_goals}"
                })
                
        return {
            "team_id": team_id,
            "team_name": team.name,
            "sofascore_id": team.sofascore_id,
            "stadium": team.stadium,
            "total_matches": total_matches,
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "goals_scored": goals_scored,
            "goals_conceded": goals_conceded,
            "avg_possession": round(possession_sum / possession_count, 1) if possession_count > 0 else 0,
            "avg_shots": round(shots_sum / shots_count, 1) if shots_count > 0 else 0,
            "avg_shots_on_target": round(shots_on_target_sum / shots_on_target_count, 1) if shots_on_target_count > 0 else 0,
            "avg_corners": round(corners_sum / corners_count, 1) if corners_count > 0 else 0,
            "avg_xg": round(xg_sum / xg_count, 2) if xg_count > 0 else 0,
            "recent_form": recent_form[::-1]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/league/{league_id}/current_round")
async def get_current_round(league_id: str, session: AsyncSession = Depends(get_db)):
    """
    Get the round of the match closest to today's date.
    """
    try:
        from datetime import datetime
        statement = select(Match.round, Match.date).where(Match.league_id == league_id)
        result = await session.exec(statement)
        matches = result.all()
        if not matches:
            return {"current_round": 1}
        
        now = datetime.now()
        # Find match with minimum absolute difference from now
        closest_match = min(matches, key=lambda m: abs((m.date - now).total_seconds()))
        return {"current_round": closest_match.round}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/team/{team_id}/last-match-formation")
async def get_last_match_formation(team_id: str, session: AsyncSession = Depends(get_db)):
    try:
        from app.model.team import Team
        from app.service.sofascore import SofascoreService
        import unicodedata

        # 1. Fetch the team
        team_res = await session.execute(select(Team).where(Team.id == team_id))
        team = team_res.scalars().one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # 2. Helper to normalize team names for comparison
        def clean_norm(name: str) -> str:
            if not name: return ""
            n = str(name).lower().strip()
            n = "".join(c for c in unicodedata.normalize('NFD', n) if unicodedata.category(c) != 'Mn')
            n = n.replace("-", " ").replace("'", "").replace(".", "")
            words = n.split()
            norm_words = []
            for w in words:
                if w in ["u", "univ", "universidad"]:
                    norm_words.append("u")
                elif w in ["catolica", "católica"]:
                    norm_words.append("catolica")
                elif w in ["concepcion", "concepción"]:
                    norm_words.append("concepcion")
                elif w in ["de", "del", "la", "las", "los", "el", "san", "santa"]:
                    continue
                else:
                    norm_words.append(w)
            return " ".join(norm_words)

        all_teams_res = await session.execute(select(Team))
        all_db_teams = all_teams_res.scalars().all()

        target_norm = clean_norm(team.name)
        target_sofascore_id = team.sofascore_id
        matched_team_ids = set([str(team.id)])

        for t in all_db_teams:
            t_norm = clean_norm(t.name)
            is_match = False
            if target_sofascore_id and t.sofascore_id and t.sofascore_id == target_sofascore_id:
                is_match = True
            elif target_norm and t_norm and (target_norm == t_norm or target_norm in t_norm or t_norm in target_norm):
                is_match = True
            if is_match:
                matched_team_ids.add(str(t.id))

        # 3. Find the latest played match involving this team
        stmt = (
            select(Match)
            .where((Match.home_team_id.in_(matched_team_ids)) | (Match.away_team_id.in_(matched_team_ids)))
            .where(Match.home_goals != None)
            .where(Match.away_goals != None)
            .order_by(Match.date.desc())
            .limit(1)
        )
        match_res = await session.execute(stmt)
        last_match = match_res.scalars().first()

        fallback_res = {
            "match_id": None,
            "opponent_name": None,
            "is_home": True,
            "date": None,
            "formation": "4-3-3",
            "players": []
        }

        if not last_match:
            return fallback_res

        # 4. Fetch lineups from Sofascore
        lineups = await SofascoreService.fetch_match_lineup(last_match.id)
        if not lineups:
            return fallback_res

        # Determine if target team is home or away in that match
        is_home_side = (str(last_match.home_team_id) in matched_team_ids or last_match.home_team_id in matched_team_ids)
        side_key = "home" if is_home_side else "away"
        side_data = lineups.get(side_key, {})

        formation = side_data.get("formation", "4-3-3")
        raw_players = side_data.get("players", [])

        formatted_players = []
        for rp in raw_players:
            p_info = rp.get("player", {})
            substitute = rp.get("substitute", False)
            # Only keep starters (non-substitute)
            if not substitute:
                formatted_players.append({
                    "id": str(p_info.get("id", "")),
                    "name": p_info.get("name", "Jugador"),
                    "position": p_info.get("position", "Defensa"),
                    "shirt_number": rp.get("shirtNumber", 0),
                    "status": "Titular"
                })

        # Fetch opponent team name
        opp_id = last_match.away_team_id if is_home_side else last_match.home_team_id
        opp_res = await session.execute(select(Team).where(Team.id == opp_id))
        opp_team = opp_res.scalars().first()

        return {
            "match_id": last_match.id,
            "opponent_name": opp_team.name if opp_team else "Oponente",
            "is_home": is_home_side,
            "date": last_match.date.isoformat() if last_match.date else None,
            "formation": formation,
            "players": formatted_players
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


