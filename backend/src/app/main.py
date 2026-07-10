import sys
import traceback
from pathlib import Path

# Ensure project `src/` is on sys.path so `uvicorn app.main:app` works from project root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn
from fastapi import FastAPI, APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import db
from app.service.auth_service import generate_role
from app.model.note import Note
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match
from app.model.tactic import Tactic
from app.controller import authentication, users, admin, prediction, matches, notes, sofascore, tactics


def init_app():
    db.init()
    
    app = FastAPI(title = "Trainylics API", description = "Paginación de datos para análisis de entrenamiento", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "body": exc.body},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        print(f"GLOBAL ERROR CAUGHT: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={"detail": f"INTERNAL SERVER ERROR: {str(exc)}"},
        )
    
    @app.on_event("startup")
    async def startup():
        await db.create_all()
        from sqlalchemy import text
        async with db.session as session:
            try:
                await session.execute(text("ALTER TABLE team ADD COLUMN IF NOT EXISTS sofascore_id INTEGER"))
                await session.execute(text("ALTER TABLE team ADD COLUMN IF NOT EXISTS group_name VARCHAR"))
                await session.execute(text("ALTER TABLE note ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'general'"))
                await session.execute(text("ALTER TABLE note ADD COLUMN IF NOT EXISTS rating INTEGER"))
                await session.execute(text("ALTER TABLE note ADD COLUMN IF NOT EXISTS team_id VARCHAR"))
                await session.execute(text("ALTER TABLE note ADD COLUMN IF NOT EXISTS player_id VARCHAR"))
                await session.execute(text("ALTER TABLE match ALTER COLUMN home_goals DROP NOT NULL"))
                await session.execute(text("ALTER TABLE match ALTER COLUMN away_goals DROP NOT NULL"))
                await session.commit()
            except Exception as e:
                print(f"Migration error: {e}")
        # Ensure compatible admin user exists
        try:
            from curl_cffi import requests
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            mappings = {
                18834: {
                    "2024": 58333,
                    "2025": 68205,
                    "2026": 86895
                },
                22063: {
                    "2024": 58763,
                    "2025": 70755,
                    "2026": 91199
                }
            }
            with open(r"c:\Users\renat\OneDrive\Desktop\trainylics\sofascore_tables_structure.txt", "w", encoding="utf-8") as f:
                for t_id, seasons in mappings.items():
                    for year, s_id in seasons.items():
                        url = f"https://www.sofascore.com/api/v1/unique-tournament/{t_id}/season/{s_id}/standings/total"
                        f.write(f"\n--- TOURNAMENT {t_id} | SEASON {s_id} ({year}) ---\n")
                        try:
                            r = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
                            if r.status_code == 200:
                                data = r.json()
                                standings = data.get("standings", [])
                                f.write(f"Found {len(standings)} standings tables.\n")
                                for idx, std in enumerate(standings):
                                    name = std.get("name", "N/A")
                                    group_info = std.get("group", {})
                                    f.write(f"  Table {idx}: name='{name}', type='{std.get('type')}', group_name='{group_info.get('name') if group_info else None}', group_id='{group_info.get('id') if group_info else None}'\n")
                                    rows = std.get("rows", [])
                                    f.write(f"    Teams in table: {', '.join([row.get('team', {}).get('name') for row in rows])}\n")
                            else:
                                f.write(f"  Error fetching: {r.status_code}\n")
                        except Exception as e2:
                            f.write(f"  Request exception: {e2}\n")
        except Exception as e:
            print(f"Sofascore dump error: {e}")

        await generate_role()

        # Ensure compatible admin user exists
        try:
            from app.model.user import User
            from app.model.person import Person, Sex
            from app.repository.role import RoleRepo
            from app.repository.users import UserRepo
            from app.repository.user_role import UserRoleRepo
            from passlib.context import CryptContext
            import datetime
            pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
            
            async with db.session as session:
                admin_user = await UserRepo.find_by_username("admin")
                if admin_user:
                    admin_user.password = pwd_context.hash("admin123")
                    session.add(admin_user)
                    await session.commit()
                    print("Admin password hash updated successfully.", flush=True)
                else:
                    person_id = "admin-person-id"
                    user_id = "admin-user-id"
                    person = Person(
                        id=person_id,
                        name="Administrator",
                        birth=datetime.date(1990, 1, 1),
                        sex=Sex.MALE,
                        profile="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                        phone_number="+56900000000"
                    )
                    user = User(
                        id=user_id,
                        username="admin",
                        email="admin@trainylics.com",
                        password=pwd_context.hash("admin123"),
                        person_id=person_id
                    )
                    role = await RoleRepo.find_by_role_name("admin")
                    if role:
                        from app.repository.person import PersonRepo
                        await PersonRepo.create(**person.dict())
                        await UserRepo.create(**user.dict())
                        await UserRoleRepo.assign_role(user_id=user_id, role_id=role.id)
                        print("Admin user created successfully.", flush=True)
        except Exception as e:
            print(f"Error creating/updating admin user: {e}", flush=True)

        # Temporarily sync group names for Liga de Segunda 2026 on startup to populate database
        try:
            from app.model.league import League
            from sqlalchemy import select
            import asyncio
            from app.service.sofascore import SofascoreService
            
            async def run_sync_and_verify():
                await asyncio.sleep(5)  # Wait for startup to settle
                async with db.session_factory() as session:
                    try:
                        res = await session.execute(
                            select(League).where(League.name == "Liga de Segunda", League.season == "2026")
                        )
                        league = res.scalars().first()
                        if league:
                            print("Running startup group sync for Liga de Segunda 2026...", flush=True)
                            await SofascoreService.sync_team_groups(18834, 86895, league.id)
                            print("Startup group sync completed for Liga de Segunda 2026.", flush=True)
                    except Exception as ex:
                        print(f"Error during startup group sync: {ex}", flush=True)
                        
            asyncio.create_task(run_sync_and_verify())
        except Exception as e:
            print(f"Error starting startup group sync: {e}", flush=True)

        # Start background sync task loop
        import asyncio
        from app.service.sofascore import SofascoreService

        async def sync_loop():
            # Wait 30 seconds after startup to let the app initialize and stabilize
            await asyncio.sleep(30)
            while True:
                try:
                    await SofascoreService.auto_sync_current_rounds()
                except Exception as e:
                    print(f"Error in background sync loop: {e}", file=sys.stderr, flush=True)
                # Sleep for 12 hours
                await asyncio.sleep(12 * 3600)

        asyncio.create_task(sync_loop())

    @app.on_event("shutdown")
    async def shutdown():
        await db.close()
        


    app.include_router(authentication.router)
    app.include_router(users.router)
    app.include_router(admin.router)
    app.include_router(prediction.router)
    app.include_router(matches.router)
    app.include_router(notes.router)
    app.include_router(sofascore.router)
    app.include_router(tactics.router)
    
    return app

app = init_app()

def start():
    """
    Inicia la aplicación FastAPI utilizando Uvicorn.
    """
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)