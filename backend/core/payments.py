import logging
import os

import stripe
from bson import ObjectId

from core.db import db
from core.models import ConsoleGroup, Delivery, GameServer, Order, Product, now_utc
from core.rcon import rcon

logger = logging.getLogger(__name__)
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"

CURRENCIES = {"USD": "$", "EUR": "€", "RUB": "₽", "UAH": "₴"}
METHODS = {
    "stripe": {"title": "Банковская карта (Stripe)", "currencies": ["USD", "EUR"], "live": True},
    "yookassa": {"title": "ЮKassa · карты РФ, СБП", "currencies": ["RUB"], "env": "YOOKASSA_SHOP_ID"},
    "freekassa": {"title": "FreeKassa", "currencies": ["RUB"], "env": "FREEKASSA_SHOP_ID"},
    "monopay": {"title": "Monobank · monopay", "currencies": ["UAH"], "env": "MONOPAY_TOKEN"},
    "privatpay": {"title": "ПриватБанк · Privat24", "currencies": ["UAH"], "env": "PRIVATPAY_MERCHANT_ID"},
}
DEFAULT_SETTINGS = {"_id": "site", "network_ip": "play.yanarpg.ru", "rates": {"USD": 1, "EUR": 0.92, "RUB": 92, "UAH": 41},
                    "demo_payments": True}


async def get_settings() -> dict:
    doc = await db.settings.find_one({"_id": "site"})
    return {**DEFAULT_SETTINGS, **(doc or {})}


def methods_public(settings: dict) -> list:
    out = []
    for key, m in METHODS.items():
        live = m.get("live", False)
        if live or settings["demo_payments"]:
            out.append({"id": key, "title": m["title"], "currencies": m["currencies"], "demo": not live})
    return out


def create_stripe_session(order: Order, origin: str) -> stripe.checkout.Session:
    line_items = [{"quantity": i.qty, "price_data": {
        "currency": order.currency.lower(), "unit_amount": round(i.price_usd * order.amount / order.total_usd * 100),
        "product_data": {"name": f"YanaRPG · {i.name}", "tax_code": "txcd_10000000"}}} for i in order.items]
    kwargs = dict(line_items=line_items, mode="payment", metadata={"order_id": order.id},
                  success_url=f"{origin}/payment/{order.id}?session_id={{CHECKOUT_SESSION_ID}}",
                  cancel_url=f"{origin}/payment/{order.id}?cancelled=1")
    for extra in ({"managed_payments": {"enabled": True}}, {"automatic_tax": {"enabled": True}, "billing_address_collection": "required"}, {}):
        try:
            return stripe.checkout.Session.create(**kwargs, **extra)
        except stripe.error.InvalidRequestError as e:
            logger.warning(f"Stripe session fallback: {e.user_message}")
    raise RuntimeError("Stripe недоступен")


async def run_delivery(d: Delivery, demo: bool = False) -> Delivery:
    server = GameServer.from_mongo(await db.servers.find_one({"_id": ObjectId(d.server_id)}))
    if not server or server.mode != "rcon":
        return d
    d.attempts += 1
    if demo and (not server.rcon_host or not server.rcon_password):
        d.status, d.response, d.delivered_at = "sent", "Демо-выдача: RCON не настроен, команда не выполнялась", now_utc()
    else:
        try:
            d.response = (await rcon(server.rcon_host, server.rcon_port, server.rcon_password, d.command))[:500] or "OK"
            d.status, d.delivered_at = "sent", now_utc()
        except Exception as e:
            d.status, d.response = "failed", str(e)[:300]
    await db.deliveries.update_one({"_id": ObjectId(d.id)}, {"$set": {"status": d.status, "attempts": d.attempts,
                                                                        "response": d.response, "delivered_at": d.delivered_at}})
    return d


async def refresh_order_status(order_id: str) -> None:
    statuses = [x["status"] for x in await db.deliveries.find({"order_id": order_id}, {"status": 1}).to_list(500)]
    if not statuses:
        status = "delivered"
    elif all(s in ("sent", "confirmed") for s in statuses):
        status = "delivered"
    elif any(s == "failed" for s in statuses):
        status = "failed"
    else:
        status = "paid"
    await db.orders.update_one({"_id": ObjectId(order_id), "status": {"$ne": "pending"}}, {"$set": {"status": status}})


async def fulfil(order_id: str, demo: bool = False) -> None:
    res = await db.orders.update_one({"_id": ObjectId(order_id), "status": "pending"},
                                     {"$set": {"status": "paid", "paid_at": now_utc()}})
    if not res.modified_count:
        return
    order = Order.from_mongo(await db.orders.find_one({"_id": ObjectId(order_id)}))
    all_servers = [GameServer.from_mongo(s) for s in await db.servers.find({"enabled": True}).to_list(100)]
    created = []
    for item in order.items:
        product = Product.from_mongo(await db.products.find_one({"_id": ObjectId(item.product_id)}))
        if not product:
            continue
        if product.console_group and order.user_id:
            group = ConsoleGroup.from_mongo(await db.console_groups.find_one({"name": product.console_group}))
            if group:
                from routers.console import extend_grant
                await extend_grant(order.user_id, group, group.duration_days * item.qty, order.granted_by or "покупка")
        targets = [s for s in all_servers if not product.server_ids or s.id in product.server_ids]
        for server in targets:
            for cmd in product.commands:
                command = cmd.replace("{player}", order.mc_nick).replace("{qty}", str(item.qty))
                d = Delivery(order_id=order.id, product_name=product.name, mc_nick=order.mc_nick, server_id=server.id,
                             server_name=server.name, command=command, mode=server.mode)
                d.id = str((await db.deliveries.insert_one(d.to_mongo())).inserted_id)
                created.append(d)
    for d in created:
        await run_delivery(d, demo=demo)
    await refresh_order_status(order.id)
