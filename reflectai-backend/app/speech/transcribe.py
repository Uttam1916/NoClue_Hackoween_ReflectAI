import whisper

# Load model once
model = whisper.load_model("base")  # can change to small/medium/large

def transcribe_audio(audio_path: str) -> str:
    """
    Transcribes audio file to text
    """
    try:
        result = model.transcribe(audio_path)
        return result['text']
    except Exception as e:
        print(f"Whisper error: {e}")
        return ""
