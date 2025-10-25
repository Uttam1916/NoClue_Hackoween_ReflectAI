# reflectai-backend/main.py
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import routers from app package
from app.routes import router as api_router, _run_batch_process
from app.core.config import get_frontend_origins
from app.api import onboarding  # uses app.api.onboarding

app = FastAPI(title="ReflectAI Backend")

# include onboarding router under /api
app.include_router(onboarding.router, prefix="/api")

# include your existing api routes as well
app.include_router(api_router, prefix="/api")

# CORS
origins = get_frontend_origins() if callable(get_frontend_origins) else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# background scanner (unchanged)
async def periodic_batch_runner(interval: int = 10):
    await asyncio.sleep(3)
    logging.info("Starting periodic upload scanner...")
    while True:
        try:
            result = await _run_batch_process()
            count = result.get("processed_count", 0)
            if count > 0:
                logging.info(f"[AutoBatch] Processed {count} uploads.")
        except Exception as e:
            logging.error(f"[AutoBatch] Error: {e}")
        await asyncio.sleep(interval)

@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(periodic_batch_runner(10))
