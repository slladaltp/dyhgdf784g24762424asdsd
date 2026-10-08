import re
from typing import List, Optional

import stripe
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from core.db import db
from core.models import Delivery, Order, OrderItem, Product, User
from core.payments import (CURRENCIES, METHODS, create_stripe_session, fulfil, get_settings, methods_public)
from core.security import get_current_user, log_activity

router = APIRouter(tags=["shop"])
NICK_RE = re.compile(r"^[A-Za-z0-9_]{3,16}$")


def oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except InvalidId:
        raise HTTPException(404, "Не найдено")


class CartItem(BaseModel):
    product_id: str
    qty: int = Field(1, ge=1, le=1000)


class CheckoutIn(BaseModel):
    items: List[CartItem] = Field(min_length=1, max_length=20)
    mc_nick: str
    currency: str = "USD"
    method: str
    origin_url: str


def public_product(p: Product) -> dict:
    return p.model_dump(exclude={"commands", "server_ids"})


@router.get("/shop/config")
async def shop_config():
    s = await get_settings()
    return {"network_ip": s["network_ip"], "rates": s["rates"], "symbols": CURRENCIES, "methods": methods_public(s),
            "demo_payments": s["demo_payments"]}


@router.get("/shop/products")
async def products():
    docs = await db.products.find({"enabled": True}).sort([("order", 1), ("price_usd", 1)]).to_list(300)
    return [public_product(Product.from_mongo(d)) for d in docs]


@router.post("/shop/checkout")
async def checkout(body: CheckoutIn, user: User = Depends(get_current_user)):
    if not NICK_RE.match(body.mc_nick):
        raise HTTPException(400, "Ник Minecraft: 3–16 символов, латиница, цифры и _")
    settings = await get_settings()
    method = METHODS.get(body.method)
    if body.currency not in CURRENCIES or not method or body.currency not in method["currencies"]:
        raise HTTPException(400, "Способ оплаты недоступен для этой валюты")
    if not method.get("live") and not settings["demo_payments"]:
        raise HTTPException(400, "Способ оплаты пока не подключён")
    items = []
    for ci in body.items:
        p = Product.from_mongo(await db.products.find_one({"_id": oid(ci.product_id), "enabled": True}))
        if not p:
            raise HTTPException(400, "Товар недоступен")
        items.append(OrderItem(product_id=p.id, name=p.name, qty=min(ci.qty, p.max_qty), price_usd=p.price_usd))
    total = round(sum(i.price_usd * i.qty for i in items), 2)
    amount = round(total * float(settings["rates"].get(body.currency, 1)), 2)
    order = Order(user_id=user.id, username=user.username, mc_nick=body.mc_nick, items=items, total_usd=total,
                  currency=body.currency, amount=amount, method=body.method)
    order.id = str((await db.orders.insert_one(order.to_mongo())).inserted_id)
    if not user.mc_nick:
        await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"mc_nick": body.mc_nick}})
    if body.method == "stripe":
        try:
            session = create_stripe_session(order, body.origin_url.rstrip("/"))
        except Exception as e:
            await db.orders.update_one({"_id": oid(order.id)}, {"$set": {"status": "cancelled"}})
            raise HTTPException(502, f"Ошибка платёжной системы: {e}")
        await db.orders.update_one({"_id": oid(order.id)}, {"$set": {"session_id": session.id}})
        return {"order_id": order.id, "url": session.url}
    return {"order_id": order.id, "url": f"{body.origin_url.rstrip('/')}/payment/{order.id}"}


async def order_view(order_id: str) -> dict:
    order = Order.from_mongo(await db.orders.find_one({"_id": oid(order_id)}))
    if not order:
        raise HTTPException(404, "Заказ не найден")
    dels = [Delivery.from_mongo(d).model_dump(include={"id", "product_name", "server_name", "status", "created_at", "delivered_at"})
            for d in await db.deliveries.find({"order_id": order_id}).to_list(200)]
    return {**order.model_dump(), "deliveries": dels, "method_title": METHODS.get(order.method, {}).get("title", order.method),
            "demo": not METHODS.get(order.method, {}).get("live", False) and not order.manual}


@router.get("/shop/orders/{order_id}")
async def get_order(order_id: str, user: User = Depends(get_current_user)):
    doc = await db.orders.find_one({"_id": oid(order_id)})
    if not doc or doc.get("user_id") != user.id:
        raise HTTPException(404, "Заказ не найден")
    if doc["status"] == "pending" and doc.get("session_id"):
        try:
            s = stripe.checkout.Session.retrieve(doc["session_id"])
            if s.payment_status == "paid":
                await fulfil(order_id)
                await log_activity(user.id, "balance", f"Оплачен заказ на ${doc['total_usd']}")
        except stripe.error.StripeError:
            pass
    return await order_view(order_id)


@router.post("/shop/orders/{order_id}/demo-pay")
async def demo_pay(order_id: str, user: User = Depends(get_current_user)):
    doc = await db.orders.find_one({"_id": oid(order_id)})
    settings = await get_settings()
    if not doc or doc.get("user_id") != user.id:
        raise HTTPException(404, "Заказ не найден")
    if METHODS.get(doc["method"], {}).get("live") or not settings["demo_payments"]:
        raise HTTPException(400, "Демо-оплата недоступна")
    await fulfil(order_id, demo=True)
    await log_activity(user.id, "balance", f"Оплачен заказ на ${doc['total_usd']} (демо {doc['method']})")
    return await order_view(order_id)


@router.get("/shop/my-orders")
async def my_orders(user: User = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": user.id}).sort("created_at", -1).limit(50).to_list(50)
    return [await order_view(str(d["_id"])) for d in docs]


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    import os
    try:
        event = stripe.Webhook.construct_event(await request.body(), request.headers.get("stripe-signature", ""),
                                               os.environ.get("STRIPE_WEBHOOK_SECRET", ""))
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(400, "Invalid signature")
    obj = event["data"]["object"]
    if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded") and obj.get("payment_status") == "paid":
        order_id: Optional[str] = (obj.get("metadata") or {}).get("order_id")
        if order_id:
            await fulfil(order_id)
    return {"status": "ok"}
