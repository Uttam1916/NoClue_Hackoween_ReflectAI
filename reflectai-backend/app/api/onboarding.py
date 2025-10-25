# file: reflectai-backend/app/api/onboarding.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from reflectai_back_end.app.core import config as core_config  # adjust import path to match your package layout
import logging

router = APIRouter()

class OnboardingConfigModel(BaseModel):
    mode: str
    tone: str
    depth: str
    intervention_type: str
    frequency: str
    audio_enabled: bool
    raw_answers: Optional[Dict[str, Any]] = None

@router.post("/api/onboarding/config")
async def save_onboarding_config(payload: OnboardingConfigModel, user_id: Optional[str] = None):
    try:
        cfg = payload.dict()
        # optionally enrich cfg with user_id and timestamp
        if user_id:
            cfg["_user_id"] = user_id
        # save to core.config (in-memory + persist)
        core_config.set_onboarding_config(cfg)
        return {"status": "ok"}
    except Exception as e:
        logging.exception("Failed to save onboarding config")
        raise HTTPException(status_code=500, detail=str(e))
