# app/utils.py
import os
import uuid

UPLOAD_DIR = "uploads/"

def save_file(file) -> str:
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path
