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

@router.get("/round/{round_num}/predictions")
async def get_round_predictions(round_num: int, session: AsyncSession = Depends(get_db)):
    """
    Get matches for a specific round with ML predictions.
    """
    try:
        from app.service.ml_service import predictor
        from sqlalchemy.orm import selectinload

        statement = select(Match).where(Match.round == round_num).options(
            selectinload(Match.home_team),
            selectinload(Match.away_team)
        )
        result = await session.exec(statement)
        matches = result.all()
        
        predictions = []
        for match in matches:
            # Construct match_data from match object
            match_data = match.model_dump()
            
            # For round 30 (prediction), we logically treat results as unknown
            if round_num == 30:
                match_data['home_goals'] = None
                match_data['away_goals'] = None


            # Predict
            pred = predictor.predict(match_data)
            
            predictions.append({
                **match_data,
                "home_team": match.home_team.model_dump() if match.home_team else None,
                "away_team": match.away_team.model_dump() if match.away_team else None,
                "prediction_result": pred["result"],
                "prediction_accuracy": pred["accuracy"]
            })
            
        return predictions
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/round/{round_num}/predict")
async def generate_round_prediction(round_num: int, league_id: Optional[str] = None, session: AsyncSession = Depends(get_db)):
    """
    Train model on all played matches and predict for the specified round and league.
    """
    try:
        from app.service.ml_service import predictor
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
        # Fetch target matches
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
            
            # Mask results for prediction context
            match_data['home_goals'] = None
            match_data['away_goals'] = None
            
            pred = predictor.predict(match_data)
            
            predictions.append({
                **match_data,
                "home_team": match.home_team.model_dump() if match.home_team else None,
                "away_team": match.away_team.model_dump() if match.away_team else None,
                "prediction_result": pred["result"],
                "prediction_accuracy": pred["accuracy"]
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
        statement = select(Team)
        if league_id:
            statement = statement.where(Team.league_id == league_id)
        result = await session.exec(statement)
        return result.all()
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
                if team and team.sofascore_id:
                    try:
                        await SofascoreService.sync_roster(team.sofascore_id, team_id)
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

