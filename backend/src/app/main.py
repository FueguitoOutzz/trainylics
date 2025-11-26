import sys
from pathlib import Path

# Ensure project `src/` is on sys.path so `uvicorn app.main:app` works from project root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn
from fastapi import FastAPI, APIRouter
from app.config import db
from app.service.auth_service import generate_role
from app.controller import authentication, users, admin


def init_app():
    db.init()
    
    app = FastAPI(title = "Trainylics API", description = "Paginación de datos para análisis de entrenamiento", version="1.0.0")
    
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
    
    return app

app = init_app()

def start():
    """
    Inicia la aplicación FastAPI utilizando Uvicorn.
    """
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)