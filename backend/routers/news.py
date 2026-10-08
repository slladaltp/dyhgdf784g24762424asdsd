from fastapi import APIRouter, HTTPException

from core.db import db
from core.models import News

router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
async def list_news(limit: int = 12):
    docs = await db.news.find({"status": "published"}).sort([("featured", -1), ("published_at", -1)]).limit(min(limit, 50)).to_list(50)
    return [News.from_mongo(d).model_dump(exclude={"content"}) for d in docs]


@router.get("/{slug}")
async def get_news(slug: str):
    item = News.from_mongo(await db.news.find_one({"slug": slug, "status": "published"}))
    if not item:
        raise HTTPException(404, "Новость не найдена")
    return item.model_dump()
