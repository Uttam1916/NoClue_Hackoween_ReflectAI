

# app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

def get_frontend_origins():
    origins = os.getenv("FRONTEND_ORIGINS", "")
    if not origins:
        return ["http://localhost:3000"]
    return [o.strip() for o in origins.split(",")]
