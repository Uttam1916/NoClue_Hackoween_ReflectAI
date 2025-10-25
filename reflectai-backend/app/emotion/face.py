from deepface import DeepFace

def analyze_face(image_path: str) -> str:
    """
    Returns dominant emotion from the given image
    """
    try:
        result = DeepFace.analyze(img_path=image_path, actions=['emotion'])
        return result['dominant_emotion']
    except Exception as e:
        print(f"DeepFace error: {e}")
        return "neutral"
