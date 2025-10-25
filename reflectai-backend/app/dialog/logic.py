# app/dialog/logic.py
def generate_reply(emotion: str, transcript: str) -> str:
    """
    Simple rule-based response based on emotion and transcript.
    """
    if emotion == "happy":
        return "You look happy! Keep smiling 😄"
    elif emotion == "sad":
        return "I see you’re feeling down. Want to talk about it?"
    elif emotion == "angry":
        return "Take a deep breath. It's okay to feel upset sometimes."
    else:
        return "Thanks for sharing. I'm here for you!"
