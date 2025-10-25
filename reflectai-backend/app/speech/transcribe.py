# app/speech/transcribe.py
import whisper

# Load model once at startup
model = whisper.load_model("base")  # small/medium/large for better accuracy

def transcribe_audio(audio_path: str) -> str:
    result = model.transcribe(audio_path)
    return result["text"]
