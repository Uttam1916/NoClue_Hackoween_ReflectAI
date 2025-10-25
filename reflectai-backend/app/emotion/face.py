# app/emotion/face.py
def analyze_face(image_path: str) -> str:
    # TODO: replace with real model
    # For now, return a random emotion
    import random
    return random.choice(["happy", "sad", "neutral", "angry"])
