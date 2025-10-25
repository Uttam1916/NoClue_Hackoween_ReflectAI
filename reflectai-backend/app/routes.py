# app/routes.py
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import os, uuid
from app.utils import save_upload_file
# placeholders to be implemented later by Person C/D:
# from app.emotion.face import analyze_face
# from app.speech.transcribe import transcribe_audio
# from app.dialog.logic import combine_logic

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.post("/analyze")
async def analyze(frame: UploadFile = File(...), audio: UploadFile = File(None)):
    """
    Accepts multipart/form-data:
      - frame: image/jpeg (required)
      - audio: optional audio/webm/ogg/wav
    Saves uploaded files under ./uploads and returns JSON placeholders.
    """
    out_dir = "uploads"
    os.makedirs(out_dir, exist_ok=True)

    # Save image frame
    if not frame:
        raise HTTPException(status_code=400, detail="frame is required")
    frame_name = f"{uuid.uuid4().hex}_{frame.filename}"
    frame_path = os.path.join(out_dir, frame_name)
    await save_upload_file(frame, frame_path)

    # Save audio if provided
    audio_path = None
    if audio:
        audio_name = f"{uuid.uuid4().hex}_{audio.filename}"
        audio_path = os.path.join(out_dir, audio_name)
        await save_upload_file(audio, audio_path)

    # Person C will replace these placeholders with actual analysis results.
    response = {
        "frame_path": frame_path,
        "audio_path": audio_path,
        "face_emotion": "unknown",
        "transcript": None,
        "reply": "Received files — analysis pending (backend skeleton)."
    }

    return JSONResponse(response)
