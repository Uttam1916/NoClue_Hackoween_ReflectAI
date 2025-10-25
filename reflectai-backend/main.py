from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router as api_router
from app.core.config import get_frontend_origins

import asyncio
import logging
from app.routes import process_uploads  # import your function

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

# ----------------------------------------------------------------
# Background worker to auto-scan uploads/ folder every few seconds
# ----------------------------------------------------------------
async def periodic_batch_runner(interval: int = 10):
    """
    Runs process_uploads() every N seconds in the background.
    """
    await asyncio.sleep(3)  # small delay after startup
    logging.info("Starting periodic upload processor...")
    while True:
        try:
            # call your existing route logic directly
            result = await process_uploads()
            count = result.get("processed_count", 0)
            if count > 0:
                logging.info(f"[AutoBatch] Processed {count} new uploads.")
        except Exception as e:
            logging.error(f"[AutoBatch] Error during processing: {e}")
        await asyncio.sleep(interval)  # wait before next scan


@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(periodic_batch_runner(interval=10))  # every 10 sec
