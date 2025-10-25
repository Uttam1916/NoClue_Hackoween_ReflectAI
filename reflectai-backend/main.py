# main.py
from fastapi import FastAPI
from app.routes import router

app = FastAPI(title="ReflectAI Backend")

app.include_router(router, prefix="/api")
