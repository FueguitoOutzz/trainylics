from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List

from app.config import db
from app.model.match import Match

router = APIRouter(prefix="/matches", tags=["Matches"])

async def get_db():
    async with db.session_factory() as session:
        yield session

from sqlalchemy.orm import selectinload

from app.model.match import Match, MatchRead

@router.get("/round/{round_num}", response_model=List[MatchRead])
async def get_matches_by_round(round_num: int, session: AsyncSession = Depends(get_db)):
    """
    Get matches for a specific round.
    """
    try:
        statement = select(Match).where(Match.round == round_num).options(
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
async def generate_round_prediction(round_num: int, session: AsyncSession = Depends(get_db)):
    """
    Train model on previous rounds and predict for the specified round.
    """
    try:
        from app.service.ml_service import predictor
        from sqlalchemy.orm import selectinload

        # 1. Train on previous data
        # Fetch matches with valid results from rounds BEFORE the target round
        train_statement = select(Match).where(
            Match.home_goals != None,
            Match.away_goals != None,
            Match.round < round_num
        )
        train_result = await session.exec(train_statement)
        train_matches = train_result.all()
        
        if not train_matches:
             raise HTTPException(status_code=400, detail="Not enough historical data to train")

        matches_data = [m.model_dump() for m in train_matches]
        predictor.train(matches_data)

        # 2. Predict for target round
        # Fetch target matches
        target_statement = select(Match).where(Match.round == round_num).options(
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
