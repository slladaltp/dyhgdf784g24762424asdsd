import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.models import ConsoleGroup, GameServer, RconTag, User, now_utc
from core.rcon import rcon
from core.security import audit, require_permission
from routers.shop import oid

router = APIRouter(tags=["console"])


# ---------- helpers ----------
def aware(dt: Optional[datetime]) -> Optional[datetime]:
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


def is_active(grant: dict) -> bool:
    exp = aware(grant.get("expires_at"))
    return exp is None or exp > now_utc()


def day_start() -> datetime:
    n = now_utc()
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


def match(patterns: List[str], command: str) -> bool:
    cmd = command.strip().lstrip("/").lower()
    for p in patterns:
        p = p.strip().lstrip("/").lower()
        if not p:
            continue
        if p == "*" or cmd == p or cmd.startswith(p + " ") or (p.endswith("*") and cmd.startswith(p[:-1])):
            return True
    return False


async def group_patterns(g: ConsoleGroup) -> List[str]:
    tags = [RconTag.from_mongo(t) for t in await db.rcon_tags.find({"name": {"$in": g.tags}}).to_list(100)]
    return sorted({*g.commands, *(p for t in tags for p in t.patterns)})


async def extend_grant(user_id: str, group: ConsoleGroup, days: int, by: str) -> None:
    """Add a group to a user or extend its expiry. days=0 -> forever."""
    from bson import ObjectId
    doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"console_grants": 1}) or {}
    grants = [g for g in doc.get("console_grants", []) if g["group"] != group.name]
    current = next((g for g in doc.get("console_grants", []) if g["group"] == group.name), None)
    if days <= 0 or (current and current.get("expires_at") is None and is_active(current)):
        expires = None
    else:
        base = aware(current["expires_at"]) if current and is_active(current) else now_utc()
        expires = max(base, now_utc()) + timedelta(days=days)
    grants.append({"group": group.name, "expires_at": expires, "granted_by": by, "granted_at": now_utc()})
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"console_grants": grants}})


async def user_groups(user: User) -> List[dict]:
    """Active console groups of a user with resolved patterns, servers and today's usage."""
    rcon_servers = [GameServer.from_mongo(s) for s in await db.servers.find({"enabled": True, "mode": "rcon"}).sort("order", 1).to_list(50)]
    if user.role == "admin":
        return [{"name": "*", "title": "Администратор", "color": "#FF6B00", "patterns": ["*"], "daily_limit": 0, "used_today": 0,
                 "expires_at": None, "servers": [{"id": s.id, "name": s.name} for s in rcon_servers]}]
    active = {g.group: g for g in user.console_grants if is_active(g.model_dump())}
    if not active:
        return []
    out = []
    for doc in await db.console_groups.find({"name": {"$in": list(active)}}).to_list(100):
        g = ConsoleGroup.from_mongo(doc)
        used = await db.console_logs.count_documents({"user_id": user.id, "group": g.name, "ok": True, "created_at": {"$gte": day_start()}})
        servers = [s for s in rcon_servers if not g.server_ids or s.id in g.server_ids]
        out.append({"name": g.name, "title": g.title, "color": g.color, "patterns": await group_patterns(g), "daily_limit": g.daily_limit,
                    "used_today": used, "expires_at": active[g.name].expires_at, "servers": [{"id": s.id, "name": s.name} for s in servers]})
    return out


# ---------- player console ----------
class ExecIn(BaseModel):
    server_id: str
    command: str = Field(min_length=1, max_length=300)


@router.get("/console/me")
async def console_me(user: User = Depends(require_permission())):
    groups = await user_groups(user)
    servers = {s["id"]: s for g in groups for s in g["servers"]}
    return {"groups": groups, "servers": list(servers.values())}


@router.post("/console/exec")
async def console_exec(body: ExecIn, user: User = Depends(require_permission())):
    server = GameServer.from_mongo(await db.servers.find_one({"_id": oid(body.server_id)}))
    if not server:
        raise HTTPException(404, "Сервер не найден")
    groups = [g for g in await user_groups(user) if any(s["id"] == server.id for s in g["servers"])]
    if not groups:
        raise HTTPException(403, "Нет доступа к консоли этого сервера")
    allowed = [g for g in groups if match(g["patterns"], body.command)]
    if not allowed:
        raise HTTPException(403, "Команда не разрешена вашими группами консоли")
    group = next((g for g in allowed if not g["daily_limit"] or g["used_today"] < g["daily_limit"]), None)
    if not group:
        raise HTTPException(429, "Дневной лимит команд исчерпан")
    command = body.command.strip().lstrip("/")
    try:
        response, ok = await rcon(server.rcon_host, server.rcon_port, server.rcon_password, command), True
    except Exception as e:
        response, ok = str(e), False
    await db.console_logs.insert_one({"user_id": user.id, "username": user.username, "server_name": server.name, "command": command,
                                      "group": group["name"], "tag": group["title"], "ok": ok, "response": response[:1000],
                                      "created_at": now_utc()})
    left = group["daily_limit"] - group["used_today"] - int(ok) if group["daily_limit"] else None
    return {"ok": ok, "response": response, "group": group["title"], "left_today": left}


@router.get("/admin/console/logs")
async def console_logs(_: User = Depends(require_permission("console.manage"))):
    docs = await db.console_logs.find({}).sort("created_at", -1).limit(100).to_list(100)
    return [{**{k: v for k, v in d.items() if k != "_id"}, "id": str(d["_id"])} for d in docs]


# ---------- command tags ----------
class TagIn(BaseModel):
    name: str = Field(pattern="^[a-z0-9_]{2,24}$")
    title: str = Field(min_length=2, max_length=40)
    color: str = "#FF6B00"
    patterns: List[str] = Field(default_factory=list)


@router.get("/admin/rcon-tags")
async def list_tags(_: User = Depends(require_permission("admin.access"))):
    return [RconTag.from_mongo(t).model_dump() for t in await db.rcon_tags.find({}).to_list(100)]


@router.post("/admin/rcon-tags")
async def create_tag(body: TagIn, admin: User = Depends(require_permission("console.manage"))):
    if await db.rcon_tags.find_one({"name": body.name}):
        raise HTTPException(400, "Тег уже существует")
    tag = RconTag(**body.model_dump())
    await db.rcon_tags.insert_one(tag.to_mongo())
    await audit(admin, "console.tag", f"Создан тег {tag.title}: {', '.join(tag.patterns)}")
    return tag.model_dump()


@router.put("/admin/rcon-tags/{name}")
async def update_tag(name: str, body: TagIn, admin: User = Depends(require_permission("console.manage"))):
    await db.rcon_tags.update_one({"name": name}, {"$set": {"title": body.title, "color": body.color, "patterns": body.patterns}})
    await audit(admin, "console.tag", f"Изменён тег {body.title}: {', '.join(body.patterns)}")
    return RconTag.from_mongo(await db.rcon_tags.find_one({"name": name})).model_dump()


@router.delete("/admin/rcon-tags/{name}")
async def delete_tag(name: str, admin: User = Depends(require_permission("console.manage"))):
    await db.rcon_tags.delete_one({"name": name})
    await db.console_groups.update_many({}, {"$pull": {"tags": name}})
    await audit(admin, "console.tag", f"Удалён тег {name}")
    return {"ok": True}


# ---------- console groups ----------
class GroupIn(BaseModel):
    name: str = Field(pattern="^[a-z0-9_]{2,24}$")
    title: str = Field(min_length=2, max_length=40)
    color: str = "#FF6B00"
    tags: List[str] = Field(default_factory=list)
    commands: List[str] = Field(default_factory=list, max_length=200)
    server_ids: List[str] = Field(default_factory=list)
    daily_limit: int = Field(0, ge=0, le=100000)
    duration_days: int = Field(0, ge=0, le=3650)


async def group_view(g: ConsoleGroup) -> dict:
    holders = await db.users.count_documents({"console_grants.group": g.name})
    return {**g.model_dump(), "patterns": await group_patterns(g), "holders": holders}


@router.get("/admin/console-groups")
async def list_groups(_: User = Depends(require_permission("admin.access"))):
    return [await group_view(ConsoleGroup.from_mongo(d)) for d in await db.console_groups.find({}).sort("title", 1).to_list(100)]


@router.post("/admin/console-groups")
async def create_group(body: GroupIn, admin: User = Depends(require_permission("console.manage"))):
    if await db.console_groups.find_one({"name": body.name}):
        raise HTTPException(400, "Группа с таким ключом уже есть")
    g = ConsoleGroup(**body.model_dump())
    g.id = str((await db.console_groups.insert_one(g.to_mongo())).inserted_id)
    await audit(admin, "console.group", f"Создана группа консоли {g.title}")
    return await group_view(g)


@router.put("/admin/console-groups/{name}")
async def update_group(name: str, body: GroupIn, admin: User = Depends(require_permission("console.manage"))):
    data = body.model_dump(exclude={"name"})
    if not (await db.console_groups.update_one({"name": name}, {"$set": data})).matched_count:
        raise HTTPException(404, "Группа не найдена")
    await audit(admin, "console.group", f"Изменена группа консоли {body.title}")
    return await group_view(ConsoleGroup.from_mongo(await db.console_groups.find_one({"name": name})))


@router.delete("/admin/console-groups/{name}")
async def delete_group(name: str, admin: User = Depends(require_permission("console.manage"))):
    if not (await db.console_groups.delete_one({"name": name})).deleted_count:
        raise HTTPException(404, "Группа не найдена")
    await db.users.update_many({}, {"$pull": {"console_grants": {"group": name}}})
    await db.products.update_many({"console_group": name}, {"$set": {"console_group": ""}})
    await audit(admin, "console.group", f"Удалена группа консоли {name}")
    return {"ok": True}


# ---------- grants ----------
class GrantIn(BaseModel):
    player: str = Field(min_length=2, max_length=40)
    group: str
    days: Optional[int] = Field(None, ge=0, le=3650)


@router.get("/admin/console-grants")
async def list_grants(_: User = Depends(require_permission("console.manage"))):
    out = []
    async for u in db.users.find({"console_grants.0": {"$exists": True}}, {"username": 1, "mc_nick": 1, "console_grants": 1}).limit(500):
        for g in u["console_grants"]:
            out.append({"user_id": str(u["_id"]), "username": u["username"], "mc_nick": u.get("mc_nick", ""), "group": g["group"],
                        "expires_at": g.get("expires_at"), "granted_by": g.get("granted_by", ""), "active": is_active(g)})
    return sorted(out, key=lambda x: (not x["active"], x["username"].lower()))


@router.post("/admin/console-grants")
async def grant(body: GrantIn, admin: User = Depends(require_permission("console.manage"))):
    group = ConsoleGroup.from_mongo(await db.console_groups.find_one({"name": body.group}))
    if not group:
        raise HTTPException(404, "Группа не найдена")
    rx = {"$regex": f"^{re.escape(body.player)}$", "$options": "i"}
    target = await db.users.find_one({"$or": [{"username": rx}, {"mc_nick": rx}]})
    if not target:
        raise HTTPException(404, "Игрок с таким аккаунтом или ником не найден")
    days = group.duration_days if body.days is None else body.days
    await extend_grant(str(target["_id"]), group, days, admin.username)
    await audit(admin, "console.grant", f"Группа консоли «{group.title}» → {target['username']} ({days or '∞'} дн.)")
    return {"ok": True}


@router.delete("/admin/console-grants/{uid}/{group}")
async def revoke(uid: str, group: str, admin: User = Depends(require_permission("console.manage"))):
    res = await db.users.update_one({"_id": oid(uid)}, {"$pull": {"console_grants": {"group": group}}})
    if not res.modified_count:
        raise HTTPException(404, "Доступ не найден")
    await audit(admin, "console.revoke", f"Снят доступ к группе {group} у {uid}")
    return {"ok": True}
