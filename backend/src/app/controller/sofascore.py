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
