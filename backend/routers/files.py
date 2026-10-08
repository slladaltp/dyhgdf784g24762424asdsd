import requests
from fastapi import APIRouter, HTTPException, Response

from core.db import db
from core.storage import load_object

router = APIRouter(tags=["files"])


@router.get("/files/{path:path}")
async def get_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(404, "Файл не найден")
    try:
        data = load_object(path)
    except requests.RequestException:
        raise HTTPException(502, "Хранилище файлов недоступно")
    return Response(content=data, media_type=record["content_type"], headers={"Cache-Control": "public, max-age=86400"})
