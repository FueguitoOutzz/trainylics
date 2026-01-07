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
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match
from app.controller import authentication, users, admin, prediction, matches, notes


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
        await generate_role()
    @app.on_event("shutdown")
    async def shutdown():
        await db.close()
        


    app.include_router(authentication.router)
    app.include_router(users.router)
    app.include_router(admin.router)
    app.include_router(prediction.router)
    app.include_router(matches.router)
    app.include_router(notes.router)
    
    return app

app = init_app()

def start():
    """
    Inicia la aplicación FastAPI utilizando Uvicorn.
    """
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)