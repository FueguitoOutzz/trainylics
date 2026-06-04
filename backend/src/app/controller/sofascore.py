from fastapi import APIRouter, Depends, HTTPException
from app.deps.role_checker import RoleChecker
from app.schema import ResponseSchema, SyncRoundRequest, SyncRosterRequest
from app.service.sofascore import SofascoreService

router = APIRouter(prefix="/admin/sofascore", tags=["Admin Sofascore"])

@router.post("/sync-round", response_model=ResponseSchema)
async def sync_round(request: SyncRoundRequest, _=Depends(RoleChecker(["admin"]))):
    """
    Sincroniza todos los partidos y estadísticas de una jornada/ronda de Sofascore
    """
    try:
        results = await SofascoreService.sync_round(
            tournament_id=request.tournament_id,
            season_id=request.season_id,
            round_num=request.round_num,
            league_id=request.league_id
        )
        return ResponseSchema(
            detail=f"Sincronizados {len(results)} partidos de la fecha {request.round_num}",
            result=results
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sync-roster", response_model=ResponseSchema)
async def sync_roster(request: SyncRosterRequest, _=Depends(RoleChecker(["admin"]))):
    """
    Sincroniza todos los jugadores de un equipo desde Sofascore
    """
    try:
        results = await SofascoreService.sync_roster(
            sofascore_team_id=request.sofascore_team_id,
            local_team_id=request.local_team_id
        )
        return ResponseSchema(
            detail=f"Sincronizados {len(results)} jugadores para el equipo",
            result=results
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
