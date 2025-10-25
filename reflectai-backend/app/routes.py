# app/routes.py
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
import os
import uuid
from app.utils import save_upload_file

router = APIRouter()

@router.post("/analyze")
async def analyze(frame: UploadFile = File(...), audio: UploadFile = File(None)):
    """
    Accepts:
     - frame: image/jpeg (snapshot)
     - audio: optional audio file (webm/ogg/wav)
    Returns: JSON with paths + placeholders for analysis results.
    """
    out_dir = "uploads"
    os.makedirs(out_dir, exist_ok=True)

    frame_name = f"{uuid.uuid4().hex}_{frame.filename}"
    frame_path = os.path.join(out_dir, frame_name)
    await save_upload_file(frame, frame_path)

    audio_path = None
    if audio:
        audio_name = f"{uuid.uuid4().hex}_{audio.filename}"
        audio_path = os.path.join(out_dir, audio_name)
        await save_upload_file(audio, audio_path)

    # Placeholder results (Person C will replace with real analysis)
    result = {
        "frame_path": frame_path,
        "audio_path": audio_path,
        "face_emotion": "unknown",   # will be replaced later
        "transcript": None,         # will be replaced later
        "reply": "ok received — analysis pending"
    }

    return JSONResponse(result)
