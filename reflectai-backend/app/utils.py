# app/utils.py
import aiofiles
from fastapi import UploadFile

async def save_upload_file(upload_file: UploadFile, destination: str):
    """
    Saves an UploadFile to disk asynchronously.
    """
    async with aiofiles.open(destination, 'wb') as out_file:
        content = await upload_file.read()  # bytes
        await out_file.write(content)
    return destination
