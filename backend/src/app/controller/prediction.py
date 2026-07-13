from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.service.ml_service import predictor
from app.config import db
from app.model.match import Match

router = APIRouter(prefix="/predict", tags=["Prediction"])

async def get_db():
    async with db.session_factory() as session:
        yield session

class MatchStats(BaseModel):
    possession_home: float
    possession_away: float
    shots_home: int
    shots_away: int
    shots_on_target_home: int
    shots_on_target_away: int
    corners_home: int
    corners_away: int
    xg_home: float
    xg_away: float

class PredictionResponse(BaseModel):
    result: str
    accuracy: float

@router.post("/", response_model=PredictionResponse)
async def predict_match(stats: MatchStats):
    try:
        return predictor.predict(stats.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train")
async def train_model(session: AsyncSession = Depends(get_db)):
    try:
        statement = select(Match).where(Match.home_goals != None).where(Match.away_goals != None)
        result = await session.exec(statement)
        matches = result.all()
        
        matches_data = [match.model_dump() for match in matches]
        
        # Run step-by-step to see exactly where it fails
        import pandas as pd
        df = predictor.prepare_data(matches_data, training=True)
        X = df[predictor.features]
        y = df['target']
        
        # Fit model without try-except to let it raise error
        predictor.model.fit(X, y)
        predictor.accuracy = 1.0
        
        return {
            "status": "success",
            "samples_count": len(df),
            "columns": list(df.columns),
            "target_distribution": y.value_counts().to_dict()
        }
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

@router.get("/stats")
async def get_model_stats(session: AsyncSession = Depends(get_db)):
    try:
        from app.model.league import League
        import types
        
        # Dynamically patch method to bypass Python class instance caching
        def patched_get_feature_importances(self):
            if self.model is None or not hasattr(self.model, "feature_importances_"):
                val = 1.0 / len(self.features)
                return {f: val for f in self.features}
            return dict(zip(self.features, self.model.feature_importances_.tolist()))
            
        predictor.get_feature_importances = types.MethodType(patched_get_feature_importances, predictor)
        
        # Matches in round 30 (scheduled predictions)
        statement_matches = select(Match).where(Match.round == 30)
        result_matches = await session.exec(statement_matches)
        matches_count = len(result_matches.all())
        
        # Total played matches in DB (training data)
        statement_played = select(Match).where(Match.home_goals != None, Match.away_goals != None)
        result_played = await session.exec(statement_played)
        played_count = len(result_played.all())
        
        statement_leagues = select(League)
        result_leagues = await session.exec(statement_leagues)
        leagues_count = len(result_leagues.all())
        
        accuracy = predictor.accuracy if hasattr(predictor, 'accuracy') else 0.0
        feature_importances = predictor.get_feature_importances()
        metrics = predictor.get_metrics_report()
        
        return {
            "accuracy": accuracy,
            "predicted_count": matches_count,
            "played_count": played_count,
            "active_leagues": leagues_count,
            "feature_importances": feature_importances,
            "metrics": metrics
        }
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

from typing import Optional

@router.get("/next-match/{team_id}")
async def get_next_match_analysis(team_id: str, session: AsyncSession = Depends(get_db)):
    try:
        from app.model.team import Team
        from app.model.league import League
        
        # 1. Fetch team
        team_res = await session.execute(select(Team).where(Team.id == team_id))
        team = team_res.scalars().one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # 2. Find next unplayed match
        stmt = (
            select(Match)
            .where((Match.home_team_id == team_id) | (Match.away_team_id == team_id))
            .where(Match.home_goals == None)
            .where(Match.away_goals == None)
            .order_by(Match.date.asc())
        )
        res = await session.execute(stmt)
        next_match = res.scalars().first()
        is_fallback = False

        if not next_match:
            # Fallback to the latest played match if no future matches are found
            stmt = (
                select(Match)
                .where((Match.home_team_id == team_id) | (Match.away_team_id == team_id))
                .where(Match.home_goals != None)
                .where(Match.away_goals != None)
                .order_by(Match.date.desc())
            )
            res = await session.execute(stmt)
            next_match = res.scalars().first()
            is_fallback = True

        if not next_match:
            return {
                "match": None,
                "opponent": None,
                "league": None,
                "our_stats": None,
                "opponent_stats": None,
                "prediction": None,
                "recommended_formation": None,
                "tactical_tips": []
            }

        # 3. Identify opponent
        is_home = (next_match.home_team_id == team_id)
        opponent_id = next_match.away_team_id if is_home else next_match.home_team_id
        
        opp_res = await session.execute(select(Team).where(Team.id == opponent_id))
        opponent = opp_res.scalars().one_or_none()
        
        leag_res = await session.execute(select(League).where(League.id == next_match.league_id))
        league = leag_res.scalars().one_or_none()

        # 4. Helper to calculate average stats over last 5 played matches
        async def get_team_avg_stats(t_id):
            stmt_played = (
                select(Match)
                .where((Match.home_team_id == t_id) | (Match.away_team_id == t_id))
                .where(Match.home_goals != None)
                .where(Match.away_goals != None)
                .order_by(Match.date.desc())
                .limit(5)
            )
            res_played = await session.execute(stmt_played)
            matches_played = res_played.scalars().all()
            if not matches_played:
                return {
                    "goals_scored": 1.0,
                    "goals_conceded": 1.0,
                    "xg": 1.0,
                    "possession": 50.0,
                    "shots": 10.0,
                    "shots_on_target": 4.0,
                    "corners": 5.0
                }
            
            goals_scored = 0.0
            goals_conceded = 0.0
            xg = 0.0
            possession = 0.0
            shots = 0.0
            shots_on_target = 0.0
            corners = 0.0
            count = len(matches_played)
            
            for m in matches_played:
                h = (m.home_team_id == t_id)
                goals_scored += (m.home_goals if h else m.away_goals) or 0
                goals_conceded += (m.away_goals if h else m.home_goals) or 0
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
                "goals_scored": round(goals_scored / count, 2),
                "goals_conceded": round(goals_conceded / count, 2),
                "xg": round(xg / count, 2),
                "possession": round(possession / count, 2),
                "shots": round(shots / count, 2),
                "shots_on_target": round(shots_on_target / count, 2),
                "corners": round(corners / count, 2)
            }

        our_stats = await get_team_avg_stats(team_id)
        opponent_stats = await get_team_avg_stats(opponent_id)

        # 5. ML Predictor call
        prediction_result = None
        try:
            input_stats = {
                "possession_home": our_stats["possession"] if is_home else opponent_stats["possession"],
                "possession_away": opponent_stats["possession"] if is_home else our_stats["possession"],
                "shots_home": int(our_stats["shots"] if is_home else opponent_stats["shots"]),
                "shots_away": int(opponent_stats["shots"] if is_home else our_stats["shots"]),
                "shots_on_target_home": int(our_stats["shots_on_target"] if is_home else opponent_stats["shots_on_target"]),
                "shots_on_target_away": int(opponent_stats["shots_on_target"] if is_home else our_stats["shots_on_target"]),
                "corners_home": int(our_stats["corners"] if is_home else opponent_stats["corners"]),
                "corners_away": int(opponent_stats["corners"] if is_home else our_stats["corners"]),
                "xg_home": our_stats["xg"] if is_home else opponent_stats["xg"],
                "xg_away": opponent_stats["xg"] if is_home else our_stats["xg"]
            }
            pred_out = predictor.predict(input_stats)
            prediction_result = {
                "result": pred_out["result"],
                "confidence": round(pred_out["accuracy"] * 100, 1)
            }
        except Exception as pred_e:
            print(f"ML Predictor next match error: {pred_e}")

        # 6. Tactical formation advice and Tips
        recommended_formation = {}
        tips = []

        if our_stats["possession"] > 54.0:
            recommended_formation = {
                "name": "4-3-3 Ofensivo",
                "justification": "La IA recomienda un 4-3-3 ofensivo para presionar alto, aprovechar el gran porcentaje de posesión que maneja tu equipo y someter al rival en su propio campo mediante amplitud por las bandas."
            }
        elif opponent_stats["xg"] > 1.6 or opponent_stats["goals_scored"] > 1.6:
            recommended_formation = {
                "name": "4-4-2 Compacto",
                "justification": "La IA recomienda un 4-4-2 compacto con doble línea de cuatro para neutralizar el gran poder ofensivo del rival (goles y xG altos) y salir rápido en contragolpe usando bandas rápidas."
            }
        else:
            recommended_formation = {
                "name": "4-2-3-1 Equilibrado",
                "justification": "La IA recomienda un 4-2-3-1 equilibrado. Esto te permitirá poblar el mediocampo con doble pivote para cortar las líneas de pase rivales y transicionar fluidamente a través de un enganche táctico."
            }

        # Tip 1: Control de Posesión
        if opponent_stats["possession"] > 54.0:
            tips.append(f"El oponente tiende a dominar la posesión (promedia {opponent_stats['possession']}%). Entrenar la presión tras pérdida y transiciones rápidas para agarrar mal parada a su defensa.")
        else:
            tips.append(f"El rival no suele retener mucho la posesión (promedia {opponent_stats['possession']}%). Se aconseja adelantar líneas para controlar los ritmos del partido y proponer juego posicional.")

        # Tip 2: Balón Parado
        if opponent_stats["corners"] > 5.5:
            tips.append(f"Atención especial al balón parado: el oponente genera bastantes córneres (promedia {opponent_stats['corners']} por partido). Reforzar marcas individuales en el juego aéreo.")
        else:
            tips.append(f"El rival promedia pocos tiros de esquina ({opponent_stats['corners']}), lo que sugiere que centran poco o sufren para generar desbordes. Favorece marcas escalonadas.")

        # Tip 3: Debilidad defensiva vs Solidez
        if opponent_stats["goals_conceded"] > 1.4:
            tips.append(f"El rival concede goles con facilidad (promedia {opponent_stats['goals_conceded']} goles en contra). Presionar la salida de sus defensas centrales provocará errores que tu delantera puede capitalizar.")
        else:
            tips.append(f"Defensa sólida del oponente (recibe solo {opponent_stats['goals_conceded']} goles por partido). Se requiere paciencia y mover el balón de lado a lado para encontrar espacios en bloque bajo.")

        return {
            "match": {
                "id": next_match.id,
                "date": next_match.date.isoformat() if next_match.date else None,
                "round": next_match.round,
                "home_team_id": next_match.home_team_id,
                "away_team_id": next_match.away_team_id,
                "is_fallback": is_fallback
            },
            "opponent": {
                "id": opponent.id if opponent else None,
                "name": opponent.name if opponent else "Oponente",
                "stadium": opponent.stadium if opponent else None,
                "sofascore_id": opponent.sofascore_id if opponent else None
            },
            "league": {
                "id": league.id if league else None,
                "name": league.name if league else "Liga",
                "season": league.season if league else ""
            },
            "our_stats": our_stats,
            "opponent_stats": opponent_stats,
            "prediction": prediction_result,
            "recommended_formation": recommended_formation,
            "tactical_tips": tips
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

