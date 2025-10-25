# app/routes.py
from fastapi import APIRouter, UploadFile, File
from app.emotion.face import analyze_face
from app.speech.transcribe import transcribe_audio
from app.dialog.logic import generate_reply
from app.utils import save_file

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/analyze")
async def analyze(frame: UploadFile = File(...), audio: UploadFile = File(None)):
    # Save uploaded files
    frame_path = save_file(frame)
    face_emotion = analyze_face(frame_path)

    audio_path = None
    transcript = None
    if audio:
        audio_path = save_file(audio)
        transcript = transcribe_audio(audio_path)

    reply = generate_reply(face_emotion, transcript or "")

    return {
        "frame_path": frame_path,
        "audio_path": audio_path,
        "face_emotion": face_emotion,
        "transcript": transcript,
        "reply": reply
    }
