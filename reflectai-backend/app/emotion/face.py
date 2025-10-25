# app/emotion/face.py
import cv2
import requests
import base64

GEMINI_API_URL = "https://api.gemini.ai/emotion"  # replace with actual endpoint
GEMINI_API_KEY = "your_gemini_api_key_here"

def analyze_face(image_path: str) -> str:
    """
    Reads an image, sends it to Gemini API, and returns detected emotion.
    """
    try:
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            return "unknown"

        _, img_encoded = cv2.imencode('.jpg', img)
        img_bytes = img_encoded.tobytes()
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')

        # Call Gemini API
        payload = {"image": img_base64}
        headers = {
            "Authorization": f"Bearer {GEMINI_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(GEMINI_API_URL, headers=headers, json=payload)
        if response.status_code == 200:
            data = response.json()
            return data.get("emotion", "unknown")
        else:
            print("Gemini API error:", response.text)
            return "unknown"

    except Exception as e:
        print("Error in analyze_face:", e)
        return "unknown"
