import sys
# Force reload next-match logic uvicorn trigger
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
    # Force full uvicorn reload trigger
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
                await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id VARCHAR"))
                
                # Create table recibe if not exists
                await session.execute(text("""
                    CREATE TABLE IF NOT EXISTS recibe (
                        note_id VARCHAR REFERENCES note(id) ON DELETE CASCADE,
                        player_id VARCHAR REFERENCES player(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                        PRIMARY KEY (note_id, player_id)
                    )
                """))
                # Create table tiene if not exists
                await session.execute(text("""
                    CREATE TABLE IF NOT EXISTS tiene (
                        note_id VARCHAR REFERENCES note(id) ON DELETE CASCADE,
                        team_id VARCHAR REFERENCES team(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                        PRIMARY KEY (note_id, team_id)
                    )
                """))
                # Migrate existing player_id notes
                await session.execute(text("""
                    INSERT INTO recibe (note_id, player_id, created_at)
                    SELECT id, player_id, created_at FROM note 
                    WHERE player_id IS NOT NULL 
                    ON CONFLICT DO NOTHING
                """))
                # Migrate existing team_id notes
                await session.execute(text("""
                    INSERT INTO tiene (note_id, team_id, created_at)
                    SELECT id, team_id, created_at FROM note 
                    WHERE team_id IS NOT NULL 
                    ON CONFLICT DO NOTHING
                """))
                await session.commit()
            except Exception as e:
                print(f"Migration error: {e}")
        # Startup initialized successfully

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
                        # Rename any existing "Tercera División" leagues to "Tercera División A"
                        res_rename = await session.execute(
                            select(League).where(League.name == "Tercera División")
                        )
                        leagues_to_rename = res_rename.scalars().all()
                        for l in leagues_to_rename:
                            l.name = "Tercera División A"
                            session.add(l)
                        if leagues_to_rename:
                            await session.commit()
                            print(f"Renamed {len(leagues_to_rename)} leagues to 'Tercera División A' in DB", flush=True)

                        # Run group sync for Liga de Segunda 2026 if it already exists
                        res = await session.execute(
                            select(League).where(League.name == "Liga de Segunda", League.season == "2026")
                        )
                        league = res.scalars().first()
                        if league:
                            print("Running startup group sync for Liga de Segunda 2026...", flush=True)
                            await SofascoreService.sync_team_groups(18834, 86895, league.id)
                            print("Startup group sync completed for Liga de Segunda 2026.", flush=True)
                        
                        # Clean up duplicate postponed/rescheduled matches on startup
                        print("Running database-wide duplicate postponed match cleanup...", flush=True)
                        from app.model.match import Match
                        res_all_m = await session.execute(select(Match))
                        all_matches = res_all_m.scalars().all()
                        groups = {}
                        for m in all_matches:
                            teams_key = tuple(sorted([str(m.home_team_id), str(m.away_team_id)]))
                            key = (m.league_id, m.round, teams_key)
                            if key not in groups:
                                groups[key] = []
                            groups[key].append(m)
                        deleted_count = 0
                        for key, match_list in groups.items():
                            if len(match_list) > 1:
                                played = [m for m in match_list if m.home_goals is not None and m.away_goals is not None]
                                unplayed = [m for m in match_list if m.home_goals is None or m.away_goals is None]
                                if played and unplayed:
                                    for m in unplayed:
                                        await session.delete(m)
                                        deleted_count += 1
                        if deleted_count > 0:
                            await session.commit()
                            print(f"Cleanup: Deleted {deleted_count} duplicate unplayed postponed matches.", flush=True)
                        else:
                            print("Cleanup: No duplicate unplayed postponed matches found.", flush=True)
                    except Exception as ex:
                        print(f"Error during startup rename/group sync/cleanup: {ex}", flush=True)

                    # Run background sync for all tournament data (Segunda, Tercera A, Tercera B 2024-2026)
                    try:
                        print("Starting background sync for new tournaments...", flush=True)
                        asyncio.create_task(SofascoreService.sync_new_tournaments_task())
                    except Exception as ex:
                        print(f"Error during background new tournament sync: {ex}", flush=True)

                    # Train the ML model on startup with existing data
                    async def train_model_on_startup():
                        await asyncio.sleep(8) # Let the app settle and run renaming first
                        print("Running startup training for ML model...", flush=True)
                        async with db.session_factory() as session:
                            try:
                                from app.model.match import Match
                                from app.service.ml_service import predictor
                                statement = select(Match).where(Match.home_goals != None, Match.away_goals != None)
                                result = await session.execute(statement)
                                matches = result.scalars().all()
                                if matches:
                                    matches_data = [m.model_dump() for m in matches]
                                    predictor.train(matches_data)
                                    print(f"Startup ML training completed. Accuracy: {predictor.accuracy:.2f}", flush=True)
                                else:
                                    print("No played matches found in DB for startup ML training.", flush=True)
                            except Exception as ex:
                                print(f"Error during startup ML training: {ex}", flush=True)
                    asyncio.create_task(train_model_on_startup())

                    # Periodically write progress report to a text file
                    async def check_database_progress():
                        while True:
                            await asyncio.sleep(5)
                            async with db.session_factory() as session:
                                try:
                                    from app.model.league import League
                                    from app.model.team import Team
                                    from app.model.match import Match
                                    from sqlalchemy import func, select
                                    
                                    res = await session.execute(select(League))
                                    leagues = res.scalars().all()
                                    
                                    lines = ["=== REPORTE DE EXTRACCIÓN Y SINCRONIZACIÓN [DB CLEANUP ACTIVE] ===", ""]
                                    for l in leagues:
                                        t_res = await session.execute(
                                            select(func.count(Team.id)).where(Team.league_id == l.id)
                                        )
                                        t_count = t_res.scalar()
                                        
                                        m_res = await session.execute(
                                            select(func.count(Match.id)).where(Match.league_id == l.id)
                                        )
                                        m_count = m_res.scalar()
                                        
                                        played_res = await session.execute(
                                            select(func.count(Match.id)).where(Match.league_id == l.id, Match.home_goals.is_not(None))
                                        )
                                        played_count = played_res.scalar() or 0
                                        
                                        lines.append(f"Liga: {l.name} | Temporada: {l.season} | Equipos: {t_count} | Partidos: {m_count} | Jugados: {played_count}")
                                    
                                    with open(r"c:\Users\renat\OneDrive\Desktop\trainylics\sync_check_report.txt", "w", encoding="utf-8") as f:
                                        f.write("\n".join(lines))
                                except Exception as err:
                                    print(f"Error checking progress: {err}", flush=True)

                    asyncio.create_task(check_database_progress())
                        
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
    # Force reload trigger comments
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)