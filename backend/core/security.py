import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Request, Response

from core.db import db
from core.models import Activity, AuditLog, Role, User

JWT_ALGORITHM = "HS256"

PERMISSIONS = {
    "admin.access": "Доступ в админ-панель",
    "users.view": "Просмотр пользователей",
    "users.manage": "Управление пользователями",
    "users.balance": "Изменение баланса и статистики",
    "news.create": "Создание новостей",
    "news.edit": "Редактирование новостей",
    "news.publish": "Публикация новостей",
    "news.delete": "Удаление новостей",
    "roles.manage": "Управление ролями",
    "servers.manage": "Управление серверами",
    "audit.view": "Журнал действий",
    "shop.manage": "Управление магазином",
    "donate.manage": "Заказы, выдача доната",
    "console.manage": "RCON: теги и логи консоли",
    "settings.manage": "Настройки сайта и оплат",
}

DEFAULT_ROLES = [
    Role(name="user", title="Игрок", color="#9CA3AF", permissions=[], system=True),
    Role(name="moderator", title="Модератор", color="#38BDF8", system=True,
         permissions=["admin.access", "users.view", "news.create", "news.edit"]),
    Role(name="admin", title="Администратор", color="#FF6B00", system=True, permissions=list(PERMISSIONS)),
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_token(user: User, kind: str, delta: timedelta) -> str:
    payload = {"sub": user.id, "tv": user.token_version, "type": kind, "exp": datetime.now(timezone.utc) + delta}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def _cookie_secure(request: Request | None) -> bool:
    env = os.environ.get("COOKIE_SECURE", "").strip().lower()
    if env in ("true", "1", "yes"):
        return True
    if env in ("false", "0", "no"):
        return False
    if request is None:
        return False
    proto = request.headers.get("x-forwarded-proto", "")
    if proto:
        return proto.split(",")[0].strip().lower() == "https"
    return request.url.scheme == "https"


def _cookie_opts(request: Request | None) -> dict:
    secure = _cookie_secure(request)
    # SameSite=None игнорируется браузерами без Secure, поэтому на http используем Lax.
    return dict(httponly=True, secure=secure, samesite="none" if secure else "lax", path="/")


def set_auth_cookies(response: Response, user: User, request: Request | None = None) -> None:
    access = create_token(user, "access", timedelta(minutes=15))
    refresh = create_token(user, "refresh", timedelta(days=7))
    opts = _cookie_opts(request)
    response.set_cookie("access_token", access, max_age=900, **opts)
    response.set_cookie("refresh_token", refresh, max_age=604800, **opts)


def clear_auth_cookies(response: Response, request: Request | None = None) -> None:
    opts = _cookie_opts(request)
    for name in ("access_token", "refresh_token"):
        response.delete_cookie(name, **opts)


async def user_from_token(token: str, kind: str) -> User:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != kind:
            raise HTTPException(401, "Неверный тип токена")
        doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Сессия истекла")
    except (jwt.InvalidTokenError, InvalidId):
        raise HTTPException(401, "Недействительный токен")
    user = User.from_mongo(doc)
    if not user or user.token_version != payload.get("tv"):
        raise HTTPException(401, "Сессия недействительна")
    if user.status == "banned":
        raise HTTPException(403, "Аккаунт заблокирован")
    return user


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Требуется авторизация")
    return await user_from_token(token, "access")


async def permissions_for(role_name: str) -> list:
    if role_name == "admin":
        return list(PERMISSIONS)
    role = Role.from_mongo(await db.roles.find_one({"name": role_name}))
    return role.permissions if role else []


def require_permission(*perms: str):
    async def checker(user: User = Depends(get_current_user)) -> User:
        granted = await permissions_for(user.role)
        if not all(p in granted for p in perms):
            raise HTTPException(403, "Недостаточно прав")
        return user
    return checker


async def audit(actor: User, action: str, message: str) -> None:
    await db.audit_logs.insert_one(AuditLog(actor_id=actor.id, actor_name=actor.username, action=action, message=message).to_mongo())


async def log_activity(user_id: str, kind: str, message: str) -> None:
    await db.activities.insert_one(Activity(user_id=user_id, type=kind, message=message).to_mongo())
