from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.models import GameServer, User
from core.security import audit, require_permission
from routers.admin import oid
from routers.donate import new_plugin_token

router = APIRouter(tags=["servers"])


class ServerIn(BaseModel):
    name: str = Field(min_length=2, max_length=30)
    ip: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=200)
    online: int = Field(ge=0, default=0)
    max_players: int = Field(ge=1, default=1000)
    ping: int = Field(ge=0, default=20)
    tag: str = Field(default="", max_length=20)
    order: int = 0
    enabled: bool = True
    mode: str = Field(default="rcon", pattern="^(rcon|plugin)$")
    rcon_host: str = Field(default="", max_length=120)
    rcon_port: int = Field(default=25575, ge=1, le=65535)
    rcon_password: str = Field(default="", max_length=120)


@router.get("/servers")
async def public_servers():
    docs = await db.servers.find({"enabled": True}).sort("order", 1).to_list(50)
    return [GameServer.from_mongo(d).public() for d in docs]


@router.get("/admin/servers")
async def admin_servers(_: User = Depends(require_permission("servers.manage"))):
    docs = await db.servers.find({}).sort("order", 1).to_list(100)
    return [GameServer.from_mongo(d).model_dump() for d in docs]


@router.post("/admin/servers")
async def create_server(body: ServerIn, admin: User = Depends(require_permission("servers.manage"))):
    server = GameServer(**body.model_dump(), plugin_token=new_plugin_token())
    server.id = str((await db.servers.insert_one(server.to_mongo())).inserted_id)
    await audit(admin, "server.create", f"Создан сервер {server.name}")
    return server.model_dump()


@router.put("/admin/servers/{server_id}")
async def update_server(server_id: str, body: ServerIn, admin: User = Depends(require_permission("servers.manage"))):
    res = await db.servers.update_one({"_id": oid(server_id)}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(404, "Сервер не найден")
    await audit(admin, "server.update", f"Обновлён сервер {body.name}")
    return GameServer.from_mongo(await db.servers.find_one({"_id": oid(server_id)})).model_dump()


@router.post("/admin/servers/{server_id}/token")
async def rotate_token(server_id: str, admin: User = Depends(require_permission("servers.manage"))):
    token = new_plugin_token()
    res = await db.servers.update_one({"_id": oid(server_id)}, {"$set": {"plugin_token": token}})
    if not res.matched_count:
        raise HTTPException(404, "Сервер не найден")
    await audit(admin, "server.token", f"Выпущен новый токен плагина для сервера {server_id}")
    return {"plugin_token": token}


@router.delete("/admin/servers/{server_id}")
async def delete_server(server_id: str, admin: User = Depends(require_permission("servers.manage"))):
    doc = await db.servers.find_one({"_id": oid(server_id)})
    if not doc:
        raise HTTPException(404, "Сервер не найден")
    await db.servers.delete_one({"_id": oid(server_id)})
    await audit(admin, "server.delete", f"Удалён сервер {doc['name']}")
    return {"ok": True}
