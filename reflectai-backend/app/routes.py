# --- Improved analyze endpoint + batch processor (drop into app/routes.py) ---
import os
import shutil
import json
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

# existing app modules you already use
from app.emotion.face import analyze_face
from app.speech.transcribe import transcribe_audio
from app.dialog.logic import get_ai_reply

# additional dependency for audio conversion
try:
    from pydub import AudioSegment
except Exception:
    AudioSegment = None  # we'll check later

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[1]   # reflectai-backend/
UPLOAD_FOLDER = BASE_DIR / "uploads"
RESULTS_FOLDER = BASE_DIR / "results"
UPLOAD_FOLDER.mkdir(exist_ok=True)
RESULTS_FOLDER.mkdir(exist_ok=True)


def _unique_filenames(user_id: str, orig_frame_name: str, orig_audio_name: str):
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")[:-3]
    frame_fname = f"{user_id}_{ts}_" + Path(orig_frame_name).name
    audio_fname = f"{user_id}_{ts}_" + Path(orig_audio_name).name
    return frame_fname, audio_fname, ts


def _save_upload(upload: UploadFile, dest_path: Path) -> Path:
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    # reset pointer in case caller reuses UploadFile
    try:
        upload.file.seek(0)
    except Exception:
        pass
    return dest_path


def _convert_to_wav_if_needed(audio_path: Path) -> Path:
    """
    Convert webm/ogg/mp4 -> wav using pydub (requires ffmpeg).
    If audio is already wav, return the same path.
    """
    suffix = audio_path.suffix.lower()
    if suffix in [".wav", ".WAV"]:
        return audio_path

    if AudioSegment is None:
        raise RuntimeError("pydub not available. Install with `pip install pydub` and ensure ffmpeg is installed.")

    wav_path = audio_path.with_suffix(".wav")
    # pydub will detect format from original suffix
    audio = AudioSegment.from_file(audio_path)
    audio.export(wav_path, format="wav")
    return wav_path


@router.post("/analyze")
async def analyze(frame: UploadFile = File(...), audio: UploadFile = File(...), user_id: str = Form(...)):
    """
    Expects:
      - frame : image file (jpg/png)
      - audio : short audio chunk from browser (webm/ogg/wav)
      - user_id: string
    Returns: { emotion, speech_text, therapist_reply, meta... }
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # create unique filenames so concurrent uploads don't collide
    frame_fname, audio_fname, ts = _unique_filenames(user_id, frame.filename, audio.filename)
    frame_path = UPLOAD_FOLDER / frame_fname
    audio_path = UPLOAD_FOLDER / audio_fname

    # save raw uploads
    _save_upload(frame, frame_path)
    _save_upload(audio, audio_path)

    # ensure audio is wav for your transcribe_audio (convert if needed)
    try:
        wav_path = _convert_to_wav_if_needed(audio_path)
    except Exception as e:
        # conversion failed, but continue - maybe transcribe_audio can handle original
        wav_path = audio_path
        print(f"[analyze] audio conversion failed, proceeding with original: {e}")

    # 1) Face emotion (your function)
    try:
        emotion = analyze_face(str(frame_path))
    except Exception as e:
        emotion = {"error": f"face analysis error: {e}"}

    # 2) Transcription
    try:
        # assume your transcribe_audio accepts a path to an audio file
        speech_text = transcribe_audio(str(wav_path))
    except Exception as e:
        speech_text = ""
        print(f"[analyze] transcription failed: {e}")

    # 3) Conversation history (if you implement memory later)
    conversation_history = ""

    # 4) Get therapist reply (your function)
    try:
        therapist_reply = get_ai_reply(emotion, speech_text, conversation_history)
    except Exception as e:
        therapist_reply = {"error": f"reply generation error: {e}"}

    # 5) Save a results file for debugging / demo fallback
    result = {
        "user_id": user_id,
        "timestamp": ts,
        "frame_saved": str(frame_path),
        "audio_saved": str(audio_path),
        "emotion": emotion,
        "speech_text": speech_text,
        "therapist_reply": therapist_reply
    }
    result_file = RESULTS_FOLDER / f"{user_id}_{ts}.json"
    result_file.write_text(json.dumps(result, indent=2, ensure_ascii=False))

    return JSONResponse(result)


# --- optional: batch processor to scan uploads/ folder and process unprocessed pairs ---
@router.post("/process_uploads")
async def process_uploads():
    """
    Scan UPLOAD_FOLDER for image+audio pairs that don't have a results file yet,
    process them using the same pipeline. Useful if frontend sometimes just drops
    files into uploads/ and you want a server-side batch runner.
    """
    processed = []
    # find candidate prefixes (user_ts_name). We'll assume our saved naming pattern above.
    for f in sorted(UPLOAD_FOLDER.iterdir()):
        if f.is_file():
            name = f.name
            # look for files that start with user_YYYY... pattern
            parts = name.split("_")
            if len(parts) < 2:
                continue
            prefix = "_".join(parts[:2])  # userid + timestamp
            # check whether a result file exists
            result_candidate = RESULTS_FOLDER / f"{prefix}.json"
            if result_candidate.exists():
                continue
            # find matching frame + audio
            related = list(UPLOAD_FOLDER.glob(f"{prefix}_*"))
            frame = None
            audio = None
            for r in related:
                if r.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                    frame = r
                if r.suffix.lower() in [".webm", ".wav", ".ogg", ".mp3", ".m4a"]:
                    audio = r
            if not frame or not audio:
                continue
            # process
            try:
                # convert audio if needed
                try:
                    wav_path = _convert_to_wav_if_needed(audio)
                except Exception:
                    wav_path = audio
                emotion = analyze_face(str(frame))
                speech_text = transcribe_audio(str(wav_path))
                therapist_reply = get_ai_reply(emotion, speech_text, "")
                out = {
                    "prefix": prefix,
                    "frame": str(frame),
                    "audio": str(audio),
                    "emotion": emotion,
                    "speech_text": speech_text,
                    "therapist_reply": therapist_reply
                }
                (RESULTS_FOLDER / f"{prefix}.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
                processed.append(out)
            except Exception as e:
                print("process_uploads error for", prefix, e)
                continue

    return {"processed_count": len(processed), "processed": processed}
