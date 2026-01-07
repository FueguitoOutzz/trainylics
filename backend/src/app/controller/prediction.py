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
        statement = select(Match).where(Match.home_goals != None).where(Match.away_goals != None).where(Match.round != 30)
        result = await session.exec(statement)
        matches = result.all()
        
        matches_data = [match.model_dump() for match in matches]
        
        result = predictor.train(matches_data)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_model_stats(session: AsyncSession = Depends(get_db)):
    try:
        from app.model.league import League
        
        statement_matches = select(Match).where(Match.round == 30)
        result_matches = await session.exec(statement_matches)
        matches_count = len(result_matches.all())
        
        statement_leagues = select(League)
        result_leagues = await session.exec(statement_leagues)
        leagues_count = len(result_leagues.all())
        
        accuracy = predictor.accuracy if hasattr(predictor, 'accuracy') else 0.0
        
        return {
            "accuracy": accuracy,
            "predicted_count": matches_count,
            "active_leagues": leagues_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
