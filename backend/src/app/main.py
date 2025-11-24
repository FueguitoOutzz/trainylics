import uvicorn
from fastapi import FastAPI, APIRouter
from app.config import db

def init_app():
    db.init()
    
    app = FastAPI(title = "Trainytics API", description = "Paginación de datos para análisis de entrenamiento", version="1.0.0")
    
    @app.on_event("startup")
    async def startup():
        await db.create_all()
    @app.on_event("shutdown")
    async def shutdown():
        await db.close()
    return app

app = init_app()

def start():
    """
    Inicia la aplicación FastAPI utilizando Uvicorn.
    """
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)