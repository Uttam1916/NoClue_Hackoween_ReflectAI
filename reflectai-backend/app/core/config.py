from dotenv import load_dotenv
import json
import os
from typing import Any, Dict, Optional

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PERSIST_PATH = os.path.join(BASE_DIR, "onboarding_config.json")

# Default in-memory config (None until saved)
ONBOARDING_CONFIG: Optional[Dict[str, Any]] = None

def load_onboarding_config() -> Optional[Dict[str, Any]]:
    global ONBOARDING_CONFIG
    if ONBOARDING_CONFIG is not None:
        return ONBOARDING_CONFIG
    if os.path.exists(PERSIST_PATH):
        try:
            with open(PERSIST_PATH, "r", encoding="utf-8") as fh:
                ONBOARDING_CONFIG = json.load(fh)
                return ONBOARDING_CONFIG
        except Exception:
            # ignore and return None if file corrupted
            return None
    return None

def set_onboarding_config(cfg: Dict[str, Any]) -> None:
    """
    Save onboarding config in-memory and persist to disk.
    cfg should be JSON-serializable (dict).
    """
    global ONBOARDING_CONFIG
    ONBOARDING_CONFIG = cfg
    try:
        with open(PERSIST_PATH, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, ensure_ascii=False, indent=2)
    except Exception as e:
        # For reliability, raise the error so calling endpoint can report failure
        raise

def get_onboarding_config() -> Optional[Dict[str, Any]]:
    return load_onboarding_config()

def get_frontend_origins():
    origins = os.getenv("FRONTEND_ORIGINS", "")
    if not origins:
        return ["http://localhost:3000"]
    return [o.strip() for o in origins.split(",")]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
