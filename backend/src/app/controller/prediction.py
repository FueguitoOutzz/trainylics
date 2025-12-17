from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.service.ml_service import predictor

router = APIRouter(prefix="/predict", tags=["Prediction"])

class MatchStats(BaseModel):
    Posesion_Local: float
    Posesion_Visitante: float
    Disparos_Totales_Local: int
    Disparos_Totales_Visitante: int
    Disparos_a_Puerta_Local: int
    Disparos_a_Puerta_Visitante: int
    Corners_Local: int
    Corners_Visitante: int

class PredictionResponse(BaseModel):
    result: str
    accuracy: float

@router.post("/", response_model=PredictionResponse)
async def predict_match(stats: MatchStats):
    """
    Predict the outcome of a match based on statistics.
    """
    try:
        # predictor.predict now returns a dict {"result": str, "accuracy": float}
        return predictor.predict(stats.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train")
async def train_model():
    """
    Trigger model training manually.
    """
    try:
        result = predictor.train()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
