import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
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

@router.get("/check-matches")
async def check_matches():
    from sqlmodel import select
    from app.config import db
    from app.model.match import Match
    from app.model.team import Team
    
    try:
        async with db.session_factory() as session:
            unplayed_stmt = select(Match).where(Match.home_goals.is_(None), Match.away_goals.is_(None))
            unplayed_res = await session.execute(unplayed_stmt)
            unplayed_matches = unplayed_res.scalars().all()
            
            deleted_details = []
            for um in unplayed_matches:
                played_stmt = select(Match).where(
                    Match.league_id == um.league_id,
                    Match.round == um.round,
                    (
                        ((Match.home_team_id == um.home_team_id) & (Match.away_team_id == um.away_team_id)) |
                        ((Match.home_team_id == um.away_team_id) & (Match.away_team_id == um.home_team_id))
                    ),
                    Match.home_goals.is_not(None),
                    Match.away_goals.is_not(None)
                )
                p_res = await session.execute(played_stmt)
                played_match = p_res.scalars().first()
                
                if played_match:
                    await session.delete(um)
                    deleted_details.append({
                        "id": um.id,
                        "round": um.round,
                        "date": um.date.isoformat() if um.date else None,
                        "league_id": um.league_id,
                        "replaced_by": played_match.id
                    })
            
            if deleted_details:
                await session.commit()
                
            return {
                "status": "success",
                "deleted_count": len(deleted_details),
                "deleted_matches": deleted_details
            }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.post("/sync-teams-info", response_model=ResponseSchema)
async def sync_teams_info(_=Depends(RoleChecker(["admin"]))):
    """
    Auto-sincroniza escudos (sofascore_id) y estadios para todos los equipos en la base de datos
    """
    try:
        res_dict = await SofascoreService.sync_teams_info()
        for diag in res_dict.get("diagnostics", []):
            print(f"DIAG: {diag}", flush=True)
            
        results = res_dict.get("synced_results", [])
        return ResponseSchema(
            detail=f"Sincronizados datos e imágenes para {len(results)} equipos.",
            result=results
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auto-sync", response_model=ResponseSchema)
async def auto_sync(_=Depends(RoleChecker(["admin"]))):
    """
    Sincroniza automáticamente las jornadas actuales de todas las ligas activas (Primera A y Ascenso)
    """
    try:
        await SofascoreService.auto_sync_current_rounds()
        return ResponseSchema(
            detail="Sincronización automática de jornadas actuales completada con éxito.",
            result=None
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/debug-search")
async def debug_search(q: str = "Colo-Colo"):
    import urllib.parse
    from curl_cffi import requests
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    encoded = urllib.parse.quote(q)
    url = f"https://www.sofascore.com/api/v1/search/all?q={encoded}"
    try:
        r = requests.get(url, headers=headers, impersonate="chrome", timeout=10)
        return {
            "status_code": r.status_code,
            "url": url,
            "response_body_snippet": r.json() if r.status_code == 200 else r.text
        }
    except Exception as e:
        return {
            "error": str(e)
        }

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "cache", "logos"))
os.makedirs(CACHE_DIR, exist_ok=True)

@router.get("/team/{sofascore_id}/image")
async def get_team_image(sofascore_id: int):
    """
    Proxy endpoint to load Sofascore team logos from the backend, bypassing Cloudflare/CORS browser blocks
    """
    cache_path = os.path.join(CACHE_DIR, f"{sofascore_id}.png")
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            return Response(content=f.read(), media_type="image/png")

    from curl_cffi import requests
    url = f"https://api.sofascore.app/api/v1/team/{sofascore_id}/image"
    headers = {
        "User-Agent": "SofaScore/3.1.0 (Android; 33)",
        "Accept": "*/*"
    }
    try:
        r = requests.get(url, headers=headers, impersonate="chrome", timeout=10)
        if r.status_code == 200 and r.content:
            with open(cache_path, "wb") as f:
                f.write(r.content)
            return Response(content=r.content, media_type="image/png")
        else:
            # Try fallback URL if sofascore.app failed
            fallback_url = f"https://www.sofascore.com/api/v1/team/{sofascore_id}/image"
            r_fallback = requests.get(fallback_url, headers=headers, impersonate="chrome", timeout=10)
            if r_fallback.status_code == 200 and r_fallback.content:
                with open(cache_path, "wb") as f:
                    f.write(r_fallback.content)
                return Response(content=r_fallback.content, media_type="image/png")
            
            raise HTTPException(status_code=404, detail="Team logo not found")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to retrieve team logo: {str(e)}")

