import re
import secrets
from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.models import Delivery, GameServer, Order, OrderItem, Product, User, now_utc
from core.payments import DEFAULT_SETTINGS, METHODS, fulfil, get_settings, refresh_order_status, run_delivery
from core.security import audit, require_permission
from routers.shop import NICK_RE, oid

router = APIRouter(tags=["donate"])


# ---------- products ----------
class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    category: str = Field(pattern="^(privilege|case|currency|kit|console)$")
    price_usd: float = Field(ge=0)
    description: str = Field(default="", max_length=500)
    image: str = ""
    features: List[str] = Field(default_factory=list)
    commands: List[str] = Field(default_factory=list)
    server_ids: List[str] = Field(default_factory=list)
    console_group: str = ""
    max_qty: int = Field(1, ge=1, le=1000)
    popular: bool = False
    enabled: bool = True
    order: int = 0


@router.get("/admin/products")
async def admin_products(_: User = Depends(require_permission("admin.access"))):
    return [Product.from_mongo(d).model_dump() for d in await db.products.find({}).sort("order", 1).to_list(500)]


@router.post("/admin/products")
async def create_product(body: ProductIn, admin: User = Depends(require_permission("shop.manage"))):
    p = Product(**body.model_dump())
    p.id = str((await db.products.insert_one(p.to_mongo())).inserted_id)
    await audit(admin, "shop.create", f"Создан товар {p.name} (${p.price_usd})")
    return p.model_dump()


@router.put("/admin/products/{pid}")
async def update_product(pid: str, body: ProductIn, admin: User = Depends(require_permission("shop.manage"))):
    if not (await db.products.update_one({"_id": oid(pid)}, {"$set": body.model_dump()})).matched_count:
        raise HTTPException(404, "Товар не найден")
    await audit(admin, "shop.update", f"Изменён товар {body.name}")
    return Product.from_mongo(await db.products.find_one({"_id": oid(pid)})).model_dump()


@router.delete("/admin/products/{pid}")
async def delete_product(pid: str, admin: User = Depends(require_permission("shop.manage"))):
    doc = await db.products.find_one_and_delete({"_id": oid(pid)})
    if not doc:
        raise HTTPException(404, "Товар не найден")
    await audit(admin, "shop.delete", f"Удалён товар {doc['name']}")
    return {"ok": True}


# ---------- orders & deliveries ----------
class GrantIn(BaseModel):
    mc_nick: str
    product_id: str
    qty: int = Field(1, ge=1, le=1000)
    reason: str = Field(default="", max_length=200)


@router.get("/admin/orders")
async def admin_orders(status: str = "", q: str = "", _: User = Depends(require_permission("donate.manage"))):
    query = {"status": status} if status else {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"mc_nick": rx}, {"username": rx}]
    docs = await db.orders.find(query).sort("created_at", -1).limit(100).to_list(100)
    revenue = await db.orders.aggregate([{"$match": {"status": {"$in": ["paid", "delivered", "failed"]}, "manual": False}},
                                         {"$group": {"_id": None, "sum": {"$sum": "$total_usd"}, "n": {"$sum": 1}}}]).to_list(1)
    return {"items": [Order.from_mongo(d).model_dump() for d in docs],
            "revenue_usd": round(revenue[0]["sum"], 2) if revenue else 0, "paid_count": revenue[0]["n"] if revenue else 0}


@router.get("/admin/deliveries")
async def admin_deliveries(status: str = "", order_id: str = "", _: User = Depends(require_permission("donate.manage"))):
    query = {k: v for k, v in (("status", status), ("order_id", order_id)) if v}
    docs = await db.deliveries.find(query).sort("created_at", -1).limit(200).to_list(200)
    counts = {r["_id"]: r["n"] for r in await db.deliveries.aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}]).to_list(10)}
    return {"items": [Delivery.from_mongo(d).model_dump() for d in docs], "counts": counts}


@router.post("/admin/deliveries/{did}/retry")
async def retry_delivery(did: str, admin: User = Depends(require_permission("donate.manage"))):
    d = Delivery.from_mongo(await db.deliveries.find_one({"_id": oid(did)}))
    if not d:
        raise HTTPException(404, "Выдача не найдена")
    if d.mode == "plugin":
        await db.deliveries.update_one({"_id": oid(did)}, {"$set": {"status": "pending"}})
        d.status = "pending"
    else:
        d = await run_delivery(d)
    await refresh_order_status(d.order_id)
    await audit(admin, "donate.retry", f"Повтор выдачи «{d.product_name}» → {d.mc_nick} ({d.status})")
    return d.model_dump()


@router.post("/admin/deliveries/{did}/confirm")
async def confirm_delivery(did: str, admin: User = Depends(require_permission("donate.manage"))):
    d = Delivery.from_mongo(await db.deliveries.find_one({"_id": oid(did)}))
    if not d:
        raise HTTPException(404, "Выдача не найдена")
    await db.deliveries.update_one({"_id": oid(did)}, {"$set": {"status": "confirmed", "delivered_at": now_utc(),
                                                                "response": f"Проверено вручную: {admin.username}"}})
    await refresh_order_status(d.order_id)
    await audit(admin, "donate.confirm", f"Подтверждена выдача «{d.product_name}» → {d.mc_nick}")
    return {"ok": True}


@router.post("/admin/grant")
async def manual_grant(body: GrantIn, admin: User = Depends(require_permission("donate.manage"))):
    if not NICK_RE.match(body.mc_nick):
        raise HTTPException(400, "Некорректный ник Minecraft")
    p = Product.from_mongo(await db.products.find_one({"_id": oid(body.product_id)}))
    if not p:
        raise HTTPException(404, "Товар не найден")
    target = await db.users.find_one({"mc_nick": {"$regex": f"^{re.escape(body.mc_nick)}$", "$options": "i"}})
    order = Order(user_id=str(target["_id"]) if target else None, username=target["username"] if target else "",
                  mc_nick=body.mc_nick, items=[OrderItem(product_id=p.id, name=p.name, qty=body.qty, price_usd=p.price_usd)],
                  total_usd=0, amount=0, method="manual", manual=True, granted_by=admin.username)
    order.id = str((await db.orders.insert_one(order.to_mongo())).inserted_id)
    await fulfil(order.id)
    await audit(admin, "donate.grant", f"Ручная выдача «{p.name}» x{body.qty} → {body.mc_nick}. {body.reason}")
    return Order.from_mongo(await db.orders.find_one({"_id": oid(order.id)})).model_dump()


# ---------- settings ----------
class SettingsIn(BaseModel):
    network_ip: str = Field(min_length=3, max_length=80)
    rates: dict
    demo_payments: bool


@router.get("/admin/settings")
async def admin_settings(_: User = Depends(require_permission("admin.access"))):
    import os
    s = await get_settings()
    providers = [{"id": k, "title": m["title"], "currencies": m["currencies"],
                  "status": "live" if m.get("live") else ("keys" if os.environ.get(m.get("env", "")) else "demo")} for k, m in METHODS.items()]
    return {**{k: v for k, v in s.items() if k != "_id"}, "providers": providers}


@router.put("/admin/settings")
async def save_settings(body: SettingsIn, admin: User = Depends(require_permission("settings.manage"))):
    rates = {c: float(body.rates.get(c, DEFAULT_SETTINGS["rates"][c])) for c in DEFAULT_SETTINGS["rates"]}
    if any(v <= 0 for v in rates.values()):
        raise HTTPException(400, "Курс должен быть больше нуля")
    rates["USD"] = 1.0
    await db.settings.update_one({"_id": "site"}, {"$set": {"network_ip": body.network_ip, "rates": rates,
                                                            "demo_payments": body.demo_payments}}, upsert=True)
    await audit(admin, "settings.update", f"Настройки: IP {body.network_ip}, демо-оплата {'вкл' if body.demo_payments else 'выкл'}")
    return await get_settings()


# ---------- plugin API ----------
async def plugin_server(token: str) -> GameServer:
    s = GameServer.from_mongo(await db.servers.find_one({"plugin_token": token})) if token else None
    if not s:
        raise HTTPException(401, "Неверный токен сервера")
    return s


PLUGIN_RESEND_AFTER = timedelta(minutes=5)


@router.get("/plugin/deliveries")
async def plugin_pull(x_server_token: str = Header("")):
    s = await plugin_server(x_server_token)
    now = now_utc()
    query = {"server_id": s.id, "$or": [{"status": "pending"}, {"status": "sent", "mode": "plugin", "sent_at": {"$lt": now - PLUGIN_RESEND_AFTER}}]}
    docs = await db.deliveries.find(query).sort("created_at", 1).limit(50).to_list(50)
    ids = [d["_id"] for d in docs]
    await db.deliveries.update_many({"_id": {"$in": ids}}, {"$set": {"status": "sent", "sent_at": now}, "$inc": {"attempts": 1}})
    await db.servers.update_one({"_id": oid(s.id)}, {"$set": {"last_seen": now}})
    return [{"id": str(d["_id"]), "order_id": d["order_id"], "player": d["mc_nick"], "product": d["product_name"],
             "command": d["command"]} for d in docs]


class AckIn(BaseModel):
    success: bool
    response: str = ""


@router.post("/plugin/deliveries/{did}/ack")
async def plugin_ack(did: str, body: AckIn, x_server_token: str = Header("")):
    s = await plugin_server(x_server_token)
    d = await db.deliveries.find_one({"_id": oid(did), "server_id": s.id})
    if not d:
        raise HTTPException(404, "Выдача не найдена")
    if d["status"] == "confirmed":
        return {"ok": True, "duplicate": True}
    await db.deliveries.update_one({"_id": d["_id"]}, {"$set": {"status": "confirmed" if body.success else "failed",
                                                                 "response": body.response[:500], "delivered_at": now_utc()}})
    await refresh_order_status(d["order_id"])
    return {"ok": True}


class HeartbeatIn(BaseModel):
    online: int = Field(ge=0)
    max_players: int = Field(ge=1, default=1000)


@router.post("/plugin/heartbeat")
async def plugin_heartbeat(body: HeartbeatIn, x_server_token: str = Header("")):
    s = await plugin_server(x_server_token)
    await db.servers.update_one({"_id": oid(s.id)}, {"$set": {"online": body.online, "max_players": body.max_players, "last_seen": now_utc()}})
    return {"ok": True}


def new_plugin_token() -> str:
    return "srv_" + secrets.token_urlsafe(24)
