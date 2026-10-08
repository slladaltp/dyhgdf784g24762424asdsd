import os
import secrets
from datetime import timedelta

from core.db import db
from core.models import ConsoleGroup, GameServer, News, Product, RconTag, User, now_utc
from core.security import DEFAULT_ROLES, hash_password, verify_password

SEED_NEWS = [
    ("Сезон 5: новые биомы и данж Незера", "Обновление", "/img/mc_nether.jpg", True,
     "Новые биомы, боссы и легендарный лут в глубинах Незера."),
    ("Летний ивент: двойной опыт на SkyBlock", "Ивент", "/img/mc_hero.jpg", False,
     "Все выходные — x2 опыт и бонусные награды за задания."),
    ("Турнир BedWars с призовым фондом", "Турнир", "/img/mc_pvp.jpg", False,
     "Собирай команду и сражайся за привилегии и кейсы."),
    ("Конкурс построек: город мечты", "Конкурс", "/img/mc_build.jpg", False,
     "Лучшие постройки получат LEGEND и место на спавне."),
    ("Новые кейсы и легендарные предметы", "Магазин", "/img/mc_case.jpg", False,
     "В магазине появились кейсы с уникальными предметами."),
    ("Открыт набор в команду модераторов", "Сообщество", "/img/mc_hero_char.jpg", False,
     "Помогай игрокам и следи за порядком на серверах."),
]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username_lower", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.roles.create_index("name", unique=True)
    await db.news.create_index("slug", unique=True)
    await db.news.create_index([("status", 1), ("published_at", -1)])
    await db.activities.create_index([("user_id", 1), ("created_at", -1)])
    await db.files.create_index("storage_path")
    await db.servers.create_index("order")
    await db.audit_logs.create_index("created_at")
    await db.password_reset_tokens.create_index("token_hash")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)


async def seed_servers():
    async for s in db.servers.find({"$or": [{"plugin_token": ""}, {"plugin_token": {"$exists": False}}]}, {"_id": 1}):
        await db.servers.update_one({"_id": s["_id"]}, {"$set": {"plugin_token": "srv_" + secrets.token_urlsafe(24)}})
    if await db.servers.count_documents({}):
        return
    for i, (name, tag) in enumerate([("Lobby", ""), ("Survival", "Хит"), ("SkyBlock", ""), ("BedWars", ""), ("Anarchy", "Новый")]):
        await db.servers.insert_one(GameServer(name=name, tag=tag, order=i, plugin_token="srv_" + secrets.token_urlsafe(24)).to_mongo())


async def seed_roles():
    for role in DEFAULT_ROLES:
        if not await db.roles.find_one({"name": role.name}):
            await db.roles.insert_one(role.to_mongo())


async def seed_admin():
    email, password = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        admin = User(email=email, username="YanaAdmin", password_hash=hash_password(password), role="admin")
        admin.stats.level, admin.stats.faction, admin.stats.job = 99, "Администрация", "Основатель"
        doc = admin.to_mongo()
        doc["username_lower"] = "yanaadmin"
        await db.users.insert_one(doc)
    elif not verify_password(password, existing["password_hash"]) or existing.get("role") != "admin":
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": "admin"}})


async def seed_news():
    if await db.news.count_documents({}):
        return
    base = now_utc()
    for i, (title, tag, cover, featured, excerpt) in enumerate(SEED_NEWS):
        ts = base - timedelta(days=i * 3)
        item = News(title=title, slug=f"seed-{i + 1}", tag=tag, cover_url=cover, featured=featured, excerpt=excerpt,
                    content="Подробности уже доступны на всех серверах YanaRPG. Следите за анонсами в Discord.",
                    status="published", author_name="YanaAdmin", created_at=ts, updated_at=ts, published_at=ts)
        await db.news.insert_one(item.to_mongo())


async def seed_shop():
    if not await db.rcon_tags.count_documents({}):
        for t in [RconTag(name="moderation", title="Модерация", color="#38BDF8", patterns=["kick", "mute", "tempban", "warn"]),
                  RconTag(name="teleport", title="Телепорт", color="#22C55E", patterns=["tp", "tphere", "spawn"]),
                  RconTag(name="events", title="Ивенты", color="#A78BFA", patterns=["say", "broadcast", "title", "time set", "weather"])]:
            await db.rcon_tags.insert_one(t.to_mongo())
    if not await db.console_groups.count_documents({}):
        await db.console_groups.insert_one(ConsoleGroup(name="helper", title="HELPER · Ивенты", color="#A78BFA", tags=["events"],
                                                        daily_limit=50, duration_days=30).to_mongo())
    await db.products.update_many({"rcon_tag": {"$exists": True}}, [{"$set": {"console_group": {"$cond": [{"$eq": ["$rcon_tag", "events"]}, "helper", ""]}}},
                                                                     {"$unset": "rcon_tag"}])
    await db.users.update_many({"rcon_tags": {"$exists": True}}, {"$unset": {"rcon_tags": ""}})
    await db.roles.update_many({"rcon_tags": {"$exists": True}}, {"$unset": {"rcon_tags": ""}})
    if await db.products.count_documents({}):
        return
    items = [
        ("VIP", "privilege", 4.99, "/img/mc_hero_char.jpg", ["Префикс [VIP]", "/kit vip раз в сутки", "3 точки /home"], ["lp user {player} parent add vip"], "", 1, False),
        ("PREMIUM", "privilege", 9.99, "/img/mc_hero_char.jpg", ["Всё из VIP", "/fly в лобби", "Цветной ник", "6 точек /home"], ["lp user {player} parent add premium"], "", 1, True),
        ("LEGEND", "privilege", 19.99, "/img/mc_hero_char.jpg", ["Всё из PREMIUM", "/ec и /craft", "Уникальные частицы", "Приоритет входа"], ["lp user {player} parent add legend"], "", 1, False),
        ("Легендарный кейс", "case", 1.49, "/img/mc_case.jpg", ["Шанс на привилегию", "Редкие предметы"], ["crates key give {player} legendary {qty}"], "", 50, True),
        ("10 000 монет", "currency", 2.99, "/img/mc_build.jpg", ["Игровая валюта", "Зачисление мгновенно"], ["eco give {player} 10000"], "", 100, False),
        ("Набор «Воин»", "kit", 3.49, "/img/mc_pvp.jpg", ["Алмазная броня", "Меч с чарами", "64 золотых яблока"], ["kit warrior {player}"], "", 10, False),
        ("Консоль «Ивенты» + HELPER", "console", 24.99, "/img/mc_nether.jpg", ["Привилегия HELPER", "Веб-консоль: say, title, weather", "Доступ в личном кабинете"], ["lp user {player} parent add helper"], "helper", 1, False),
    ]
    for i, (name, cat, price, img, feats, cmds, tag, mq, pop) in enumerate(items):
        await db.products.insert_one(Product(name=name, category=cat, price_usd=price, image=img, features=feats, commands=cmds,
                                             console_group=tag, max_qty=mq, popular=pop, order=i).to_mongo())


async def migrate_stats():
    for field, old, new in (("server", "Феникс", "Survival"), ("faction", "Гражданский", "Без клана"), ("job", "Безработный", "Игрок")):
        await db.users.update_many({f"stats.{field}": old}, {"$set": {f"stats.{field}": new}})


async def run_seed():
    await ensure_indexes()
    await migrate_stats()
    await seed_roles()
    await seed_admin()
    await seed_news()
    await seed_servers()
    await seed_shop()
