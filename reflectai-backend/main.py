from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router as api_router
from app.core.config import get_frontend_origins
import asyncio, logging

# ✅ Import the internal helper (not the route)
from app.routes import _run_batch_process

app = FastAPI(title="ReflectAI Backend")

origins = get_frontend_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# ---------------- BACKGROUND SCANNER ----------------
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
