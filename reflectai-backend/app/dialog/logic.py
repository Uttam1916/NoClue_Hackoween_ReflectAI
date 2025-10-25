import os
import openai
from app.core.config import GEMINI_API_KEY

openai.api_key = GEMINI_API_KEY

def get_ai_reply(emotion: str, speech_text: str, conversation_history: str = "") -> str:
    """
    Generates therapist reply based on emotion + speech + history
    """
    prompt = f"""
You are a compassionate AI therapist.

Current emotion: {emotion}
User said: {speech_text}
Conversation history: {conversation_history}

Respond with empathy, helpful advice, and a follow-up question.
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": "You are a compassionate AI therapist."},
                      {"role": "user", "content": prompt}],
            max_tokens=200
        )
        reply = response['choices'][0]['message']['content']
        return reply
    except Exception as e:
        print(f"Therapist AI error: {e}")
        return "I am here to listen."
