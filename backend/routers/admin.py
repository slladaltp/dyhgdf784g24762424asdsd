import csv
import io
import re
import uuid
from datetime import timedelta
from typing import List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from core.db import db
from core.models import Activity, AuditLog, GameStats, News, Role, User, Wallet, now_utc
from core.security import PERMISSIONS, audit, log_activity, require_permission
from core.storage import save_image

router = APIRouter(prefix="/admin", tags=["admin"])


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(404, "Не найдено")


# ---------- overview ----------
@router.get("/stats")
async def stats(_: User = Depends(require_permission("admin.access"))):
    week_ago = now_utc() - timedelta(days=7)
    recent = await db.activities.find({}).sort("created_at", -1).limit(12).to_list(12)
    ids = list({ObjectId(a["user_id"]) for a in recent if ObjectId.is_valid(a["user_id"])})
    names = {str(u["_id"]): u["username"] for u in await db.users.find({"_id": {"$in": ids}}, {"username": 1}).to_list(50)}
    start = (now_utc() - timedelta(days=13)).replace(hour=0, minute=0, second=0, microsecond=0)
    reg = await db.users.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "n": {"$sum": 1}}}]).to_list(30)
    reg_map = {r["_id"]: r["n"] for r in reg}
    days = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(14)]
    roles = await db.users.aggregate([{"$group": {"_id": "$role", "n": {"$sum": 1}}}]).to_list(50)
    eco = await db.users.aggregate([{"$group": {"_id": None, "cash": {"$sum": "$wallet.cash"}, "bank": {"$sum": "$wallet.bank"},
                                                 "coins": {"$sum": "$wallet.coins"}, "hours": {"$sum": "$stats.hours_played"}}}]).to_list(1)
    servers = await db.servers.find({"enabled": True}).to_list(50)
    return {
        "registrations": [{"date": d, "count": reg_map.get(d, 0)} for d in days],
        "roles": [{"role": r["_id"], "count": r["n"]} for r in roles],
        "economy": {k: (eco[0][k] if eco else 0) for k in ("cash", "bank", "coins", "hours")},
        "online": {"current": sum(s["online"] for s in servers), "max": sum(s["max_players"] for s in servers), "servers": len(servers)},
        "users_total": await db.users.count_documents({}),
        "users_new_week": await db.users.count_documents({"created_at": {"$gte": week_ago}}),
        "users_banned": await db.users.count_documents({"status": "banned"}),
        "staff": await db.users.count_documents({"role": {"$ne": "user"}}),
        "news_published": await db.news.count_documents({"status": "published"}),
        "news_draft": await db.news.count_documents({"status": "draft"}),
        "recent_activity": [{**Activity.from_mongo(a).model_dump(), "username": names.get(a["user_id"], "—")} for a in recent],
    }


# ---------- users ----------
class UserUpdateIn(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(active|banned)$")


class EconomyIn(BaseModel):
    wallet: Optional[Wallet] = None
    stats: Optional[GameStats] = None


@router.get("/users")
async def list_users(q: str = "", role: str = "", page: int = 1, _: User = Depends(require_permission("users.view"))):
    query = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"email": rx}, {"username": rx}]
    if role:
        query["role"] = role
    size = 20
    total = await db.users.count_documents(query)
    docs = await db.users.find(query).sort("created_at", -1).skip((max(page, 1) - 1) * size).limit(size).to_list(size)
    return {"items": [User.from_mongo(d).public() for d in docs], "total": total, "page": page, "pages": max(1, -(-total // size))}


@router.get("/audit")
async def audit_log(page: int = 1, action: str = "", _: User = Depends(require_permission("audit.view"))):
    query = {"action": {"$regex": f"^{re.escape(action)}"}} if action else {}
    size = 30
    total = await db.audit_logs.count_documents(query)
    docs = await db.audit_logs.find(query).sort("created_at", -1).skip((max(page, 1) - 1) * size).limit(size).to_list(size)
    return {"items": [AuditLog.from_mongo(d).model_dump() for d in docs], "total": total, "pages": max(1, -(-total // size))}


@router.get("/users/export")
async def export_users(admin: User = Depends(require_permission("users.view"))):
    buf = io.StringIO()
    buf.write("\ufeff")
    w = csv.writer(buf, delimiter=";")
    w.writerow(["id", "username", "email", "role", "status", "level", "cash", "bank", "coins", "hours", "created_at"])
    async for d in db.users.find({}).sort("created_at", -1):
        u = User.from_mongo(d)
        w.writerow([u.id, u.username, u.email, u.role, u.status, u.stats.level, u.wallet.cash, u.wallet.bank, u.wallet.coins,
                    u.stats.hours_played, u.created_at.isoformat()])
    await audit(admin, "users.export", "Экспорт пользователей в CSV")
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": "attachment; filename=yanarpg_users.csv"})


@router.get("/users/{user_id}")
async def get_user(user_id: str, _: User = Depends(require_permission("users.view"))):
    user = User.from_mongo(await db.users.find_one({"_id": oid(user_id)}))
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    acts = await db.activities.find({"user_id": user_id}).sort("created_at", -1).limit(20).to_list(20)
    return {**user.public(), "activity": [Activity.from_mongo(a).model_dump() for a in acts]}


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdateIn, admin: User = Depends(require_permission("users.manage"))):
    target = User.from_mongo(await db.users.find_one({"_id": oid(user_id)}))
    if not target:
        raise HTTPException(404, "Пользователь не найден")
    updates = body.model_dump(exclude_none=True)
    if target.id == admin.id and updates:
        raise HTTPException(400, "Нельзя менять собственную роль или статус")
    if "role" in updates:
        if admin.role != "admin":
            raise HTTPException(403, "Роли назначает только администратор")
        if not await db.roles.find_one({"name": updates["role"]}):
            raise HTTPException(400, "Роль не существует")
    if target.role == "admin" and admin.role != "admin":
        raise HTTPException(403, "Недостаточно прав")
    if "status" in updates or "role" in updates:
        updates["token_version"] = target.token_version + 1
    await db.users.update_one({"_id": oid(user_id)}, {"$set": updates})
    if "role" in updates:
        await log_activity(user_id, "role", f"Назначена роль: {updates['role']}")
    if "status" in updates:
        await log_activity(user_id, "security", "Аккаунт заблокирован" if updates["status"] == "banned" else "Аккаунт разблокирован")
    if "role" in updates:
        await audit(admin, "user.role", f"{target.username}: роль → {updates['role']}")
    if "status" in updates:
        await audit(admin, "user.ban" if updates["status"] == "banned" else "user.unban",
                    f"{target.username}: {'заблокирован' if updates['status'] == 'banned' else 'разблокирован'}")
    return User.from_mongo(await db.users.find_one({"_id": oid(user_id)})).public()


@router.patch("/users/{user_id}/economy")
async def update_economy(user_id: str, body: EconomyIn, admin: User = Depends(require_permission("users.balance"))):
    updates = {k: v.model_dump() for k, v in (("wallet", body.wallet), ("stats", body.stats)) if v is not None}
    res = await db.users.update_one({"_id": oid(user_id)}, {"$set": updates})
    if not res.matched_count:
        raise HTTPException(404, "Пользователь не найден")
    await log_activity(user_id, "balance", "Администрация обновила баланс или статистику")
    u = User.from_mongo(await db.users.find_one({"_id": oid(user_id)}))
    await audit(admin, "user.economy", f"{u.username}: ${u.wallet.cash} / банк ${u.wallet.bank} / {u.wallet.coins} YC / ур. {u.stats.level}")
    return u.public()


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_permission("users.manage"))):
    target = await db.users.find_one({"_id": oid(user_id)})
    if not target:
        raise HTTPException(404, "Пользователь не найден")
    if user_id == admin.id or (target["role"] == "admin" and admin.role != "admin"):
        raise HTTPException(400, "Этого пользователя нельзя удалить")
    await db.users.delete_one({"_id": oid(user_id)})
    await db.activities.delete_many({"user_id": user_id})
    await audit(admin, "user.delete", f"Удалён аккаунт {target['username']}")
    return {"ok": True}


# ---------- roles ----------
class RoleIn(BaseModel):
    name: str = Field(pattern="^[a-z0-9_]{2,24}$")
    title: str = Field(min_length=2, max_length=40)
    color: str = "#9CA3AF"
    permissions: List[str] = Field(default_factory=list)


@router.get("/permissions")
async def list_permissions(_: User = Depends(require_permission("admin.access"))):
    return [{"key": k, "label": v} for k, v in PERMISSIONS.items()]


@router.get("/roles")
async def list_roles(_: User = Depends(require_permission("admin.access"))):
    roles = [Role.from_mongo(d) for d in await db.roles.find({}).to_list(100)]
    out = []
    for r in roles:
        perms = list(PERMISSIONS) if r.name == "admin" else r.permissions
        out.append({**r.model_dump(), "permissions": perms, "users": await db.users.count_documents({"role": r.name})})
    return out


@router.post("/roles")
async def create_role(body: RoleIn, admin: User = Depends(require_permission("roles.manage"))):
    if await db.roles.find_one({"name": body.name}):
        raise HTTPException(400, "Роль с таким ключом уже есть")
    role = Role(**body.model_dump(exclude={"permissions"}), permissions=[p for p in body.permissions if p in PERMISSIONS])
    await db.roles.insert_one(role.to_mongo())
    await audit(admin, "role.create", f"Создана роль {role.title}")
    return role.model_dump()


@router.patch("/roles/{name}")
async def update_role(name: str, body: RoleIn, admin: User = Depends(require_permission("roles.manage"))):
    if name == "admin":
        raise HTTPException(400, "Роль администратора не редактируется")
    perms = [p for p in body.permissions if p in PERMISSIONS]
    res = await db.roles.update_one({"name": name}, {"$set": {"title": body.title, "color": body.color, "permissions": perms}})
    if not res.matched_count:
        raise HTTPException(404, "Роль не найдена")
    await audit(admin, "role.update", f"Права роли {body.title}: {len(perms)} шт.")
    return Role.from_mongo(await db.roles.find_one({"name": name})).model_dump()


@router.delete("/roles/{name}")
async def delete_role(name: str, admin: User = Depends(require_permission("roles.manage"))):
    role = Role.from_mongo(await db.roles.find_one({"name": name}))
    if not role:
        raise HTTPException(404, "Роль не найдена")
    if role.system:
        raise HTTPException(400, "Системную роль нельзя удалить")
    await db.users.update_many({"role": name}, {"$set": {"role": "user"}, "$inc": {"token_version": 1}})
    await db.roles.delete_one({"name": name})
    await audit(admin, "role.delete", f"Удалена роль {role.title}")
    return {"ok": True}


# ---------- news ----------
class NewsIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    excerpt: str = Field(default="", max_length=300)
    content: str = ""
    tag: str = Field(default="Новости", max_length=30)
    cover_url: str = ""
    featured: bool = False


class PublishIn(BaseModel):
    published: bool


def slugify(title: str) -> str:
    table = str.maketrans({"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i",
                           "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
                           "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch", "ы": "y", "э": "e",
                           "ю": "yu", "я": "ya", "ь": "", "ъ": ""})
    base = re.sub(r"[^a-z0-9]+", "-", title.lower().translate(table)).strip("-")[:60] or "news"
    return f"{base}-{uuid.uuid4().hex[:6]}"


async def get_news_or_404(news_id: str) -> News:
    item = News.from_mongo(await db.news.find_one({"_id": oid(news_id)}))
    if not item:
        raise HTTPException(404, "Новость не найдена")
    return item


@router.get("/news")
async def admin_list_news(status: str = "", _: User = Depends(require_permission("admin.access"))):
    query = {"status": status} if status else {}
    docs = await db.news.find(query).sort("created_at", -1).to_list(500)
    return [News.from_mongo(d).model_dump() for d in docs]


@router.get("/news/{news_id}")
async def admin_get_news(news_id: str, _: User = Depends(require_permission("admin.access"))):
    return (await get_news_or_404(news_id)).model_dump()


@router.post("/news")
async def create_news(body: NewsIn, user: User = Depends(require_permission("news.create"))):
    item = News(**body.model_dump(), slug=slugify(body.title), author_id=user.id, author_name=user.username)
    item.id = str((await db.news.insert_one(item.to_mongo())).inserted_id)
    await audit(user, "news.create", f"Создана новость «{item.title}»")
    return item.model_dump()


@router.put("/news/{news_id}")
async def update_news(news_id: str, body: NewsIn, admin: User = Depends(require_permission("news.edit"))):
    await get_news_or_404(news_id)
    await db.news.update_one({"_id": oid(news_id)}, {"$set": {**body.model_dump(), "updated_at": now_utc()}})
    await audit(admin, "news.update", f"Отредактирована «{body.title}»")
    return (await get_news_or_404(news_id)).model_dump()


@router.post("/news/{news_id}/publish")
async def publish_news(news_id: str, body: PublishIn, admin: User = Depends(require_permission("news.publish"))):
    item = await get_news_or_404(news_id)
    updates = {"status": "published" if body.published else "draft", "updated_at": now_utc()}
    if body.published and not item.published_at:
        updates["published_at"] = now_utc()
    await db.news.update_one({"_id": oid(news_id)}, {"$set": updates})
    await audit(admin, "news.publish" if body.published else "news.unpublish",
                f"{'Опубликована' if body.published else 'Снята с публикации'} «{item.title}»")
    return (await get_news_or_404(news_id)).model_dump()


@router.delete("/news/{news_id}")
async def delete_news(news_id: str, admin: User = Depends(require_permission("news.delete"))):
    item = await get_news_or_404(news_id)
    await db.news.delete_one({"_id": oid(news_id)})
    await audit(admin, "news.delete", f"Удалена «{item.title}»")
    return {"ok": True}


@router.post("/upload")
async def upload_cover(file: UploadFile = File(...), user: User = Depends(require_permission("news.edit"))):
    return {"url": await save_image(file, "news", user.id)}
