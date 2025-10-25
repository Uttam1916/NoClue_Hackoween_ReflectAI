# app/dialog/logic.py
def generate_reply(emotion: str, transcript: str) -> str:
    if emotion == "happy":
        return "You look happy! Keep smiling 😄"
    elif emotion == "sad":
        return "I see you’re feeling down. Want to talk about it?"
    else:
        return "Thanks for sharing. I’m here for you!"
