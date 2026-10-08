from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.models import User
from core.security import get_current_user

router = APIRouter(tags=["players"])

BOARDS = {
    "level": ([{"$sort": {"stats.level": -1, "stats.exp": -1}}], lambda u: u["stats"]["level"]),
    "wealth": ([{"$sort": {"wealth": -1}}], lambda u: u["wealth"]),
    "hours": ([{"$sort": {"stats.hours_played": -1}}], lambda u: u["stats"]["hours_played"]),
}
WEALTH = {"$add": [{"$ifNull": ["$wallet.cash", 0]}, {"$ifNull": ["$wallet.bank", 0]}]}


def _public(u: dict) -> dict:
    return {
        "id": str(u["_id"]), "username": u["username"], "avatar_url": u.get("avatar_url"), "role": u.get("role", "user"),
        "level": u["stats"]["level"], "exp": u["stats"].get("exp", 0), "hours": u["stats"]["hours_played"],
        "faction": u["stats"].get("faction", ""), "server": u["stats"].get("server", ""), "wealth": u.get("wealth", 0),
    }


async def _ranks(u: dict) -> dict:
    base = {"status": {"$ne": "banned"}}
    level = await db.users.count_documents({**base, "$or": [
        {"stats.level": {"$gt": u["stats"]["level"]}},
        {"stats.level": u["stats"]["level"], "stats.exp": {"$gt": u["stats"].get("exp", 0)}}]}) + 1
    wealth_val = u["wallet"]["cash"] + u["wallet"]["bank"]
    wealth_res = await db.users.aggregate([{"$match": base}, {"$addFields": {"wealth": WEALTH}},
                                           {"$match": {"wealth": {"$gt": wealth_val}}}, {"$count": "n"}]).to_list(1)
    wealth = (wealth_res[0]["n"] if wealth_res else 0) + 1
    hours = await db.users.count_documents({**base, "stats.hours_played": {"$gt": u["stats"]["hours_played"]}}) + 1
    return {"level": level, "wealth": wealth, "hours": hours}


@router.get("/leaderboard")
async def leaderboard(by: str = "level", limit: int = 50):
    if by not in BOARDS:
        raise HTTPException(400, "Неизвестный рейтинг")
    pipeline = [{"$match": {"status": {"$ne": "banned"}}}, {"$addFields": {"wealth": WEALTH}},
                *BOARDS[by][0], {"$limit": min(limit, 100)}]
    docs = await db.users.aggregate(pipeline).to_list(100)
    return [{**_public(d), "rank": i + 1} for i, d in enumerate(docs)]


@router.get("/leaderboard/me")
async def my_ranks(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"username_lower": user.username.lower()})
    return await _ranks(doc)


@router.get("/players/{username}")
async def player(username: str):
    doc = await db.users.find_one({"username_lower": username.lower(), "status": {"$ne": "banned"}})
    if not doc:
        raise HTTPException(404, "Игрок не найден")
    doc["wealth"] = doc["wallet"]["cash"] + doc["wallet"]["bank"]
    return {**_public(doc), "bio": doc.get("bio", ""), "city": doc.get("city", ""), "created_at": doc.get("created_at"),
            "reputation": doc["stats"].get("reputation", 0), "job": doc["stats"].get("job", ""), "ranks": await _ranks(doc)}
