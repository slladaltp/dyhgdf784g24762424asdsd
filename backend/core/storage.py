import logging
import os
import uuid

import requests
from fastapi import HTTPException, UploadFile

from core.db import db
from core.models import now_utc

logger = logging.getLogger(__name__)
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_SIZE = 5 * 1024 * 1024
_storage_key = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _request(method: str, path: str, **kwargs):
    resp = requests.request(method, f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": init_storage(), **kwargs.pop("headers", {})}, **kwargs)
    if resp.status_code == 404 and method == "PUT":
        resp = requests.request(method, f"{STORAGE_URL}/objects/{path}",
                                headers={"X-Storage-Key": init_storage(force=True), **kwargs.get("headers", {})}, **kwargs)
    resp.raise_for_status()
    return resp


async def save_image(file: UploadFile, folder: str, owner_id: str) -> str:
    ext = IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(400, "Допустимы только изображения JPG, PNG, WEBP или GIF")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "Файл больше 5 МБ")
    path = f"{os.environ['APP_NAME']}/{folder}/{owner_id}/{uuid.uuid4()}.{ext}"
    try:
        result = _request("PUT", path, headers={"Content-Type": file.content_type}, data=data, timeout=120).json()
    except requests.RequestException as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(502, "Хранилище файлов недоступно")
    await db.files.insert_one({
        "storage_path": result["path"], "original_filename": file.filename, "content_type": file.content_type,
        "size": result.get("size", len(data)), "owner_id": owner_id, "is_deleted": False, "created_at": now_utc(),
    })
    return f"/api/files/{result['path']}"


def load_object(path: str) -> bytes:
    return _request("GET", path, timeout=60).content
