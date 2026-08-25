from sqlmodel import select
from app.model.match import Match
from app.model.team import Team
from app.ML.chileanfootball import ChileanLeaguePredictor

predictor = ChileanLeaguePredictor()

async def get_team_historical_stats(team_id: str, session):
    if not team_id:
        return {"possession": 50.0, "shots": 10.0, "shots_on_target": 4.0, "corners": 5.0, "xg": 1.0}

    t_res = await session.execute(select(Team).where(Team.id == team_id))
    team = t_res.scalars().first()
    
    t_ids = [team_id]
    if team:
        if team.sofascore_id:
            all_t = await session.execute(select(Team.id).where((Team.sofascore_id == team.sofascore_id) | (Team.name == team.name)))
        else:
            all_t = await session.execute(select(Team.id).where(Team.name == team.name))
        t_ids = all_t.scalars().all() or [team_id]

    stmt_played = (
        select(Match)
        .where((Match.home_team_id.in_(t_ids)) | (Match.away_team_id.in_(t_ids)))
        .where(Match.home_goals != None)
        .where(Match.away_goals != None)
        .order_by(Match.date.desc())
        .limit(5)
    )
    res_played = await session.execute(stmt_played)
    matches_played = res_played.scalars().all()

    if not matches_played:
        return {"possession": 50.0, "shots": 10.0, "shots_on_target": 4.0, "corners": 5.0, "xg": 1.0}

    xg = 0.0
    possession = 0.0
    shots = 0.0
    shots_on_target = 0.0
    corners = 0.0
    count = len(matches_played)

    for m in matches_played:
        h = (m.home_team_id in t_ids)
        xg += (m.xg_home if h else m.xg_away) or 1.0
        possession += (m.possession_home if h else m.possession_away) or 50.0
        my_sot = (m.shots_on_target_home if h else m.shots_on_target_away)
        my_shots = (m.shots_home if h else m.shots_away)
        if (my_shots is None or my_shots == 0) and (my_sot is not None and my_sot > 0):
            my_shots = my_sot
        shots += my_shots or 10
        shots_on_target += my_sot or 4
        corners += (m.corners_home if h else m.corners_away) or 5

    return {
        "possession": round(possession / count, 2),
        "shots": round(shots / count, 2),
        "shots_on_target": round(shots_on_target / count, 2),
        "corners": round(corners / count, 2),
        "xg": round(xg / count, 2)
    }

async def predict_single_match(match: Match, session):
    """
    Unified predictor for any match (played or unplayed).
    Uses actual match stats if played, or historical 5-match team averages if unplayed.
    """
    if match.home_goals is not None and match.away_goals is not None and match.possession_home is not None:
        return predictor.predict(match.model_dump())

    home_stats = await get_team_historical_stats(match.home_team_id, session)
    away_stats = await get_team_historical_stats(match.away_team_id, session)

    input_stats = {
        "home_team_id": match.home_team_id,
        "away_team_id": match.away_team_id,
        "possession_home": home_stats["possession"],
        "possession_away": away_stats["possession"],
        "shots_home": int(home_stats["shots"]),
        "shots_away": int(away_stats["shots"]),
        "shots_on_target_home": int(home_stats["shots_on_target"]),
        "shots_on_target_away": int(away_stats["shots_on_target"]),
        "corners_home": int(home_stats["corners"]),
        "corners_away": int(away_stats["corners"]),
        "xg_home": home_stats["xg"],
        "xg_away": away_stats["xg"]
    }
    return predictor.predict(input_stats)
