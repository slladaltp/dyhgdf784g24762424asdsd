import hashlib
import os
import re
import secrets
from datetime import timedelta

from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from core.db import db
from core.email import reset_email_html, send_email
from core.models import User, now_utc
from core.security import (clear_auth_cookies, get_current_user, hash_password, log_activity, permissions_for,
                           set_auth_cookies, user_from_token, verify_password)

router = APIRouter(prefix="/auth", tags=["auth"])
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
MAX_ATTEMPTS, LOCK_MINUTES = 5, 15


class RegisterIn(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _app_url(request: Request) -> str:
    allowed = [o.strip() for o in os.environ["FRONTEND_URL"].split(",") if o.strip().startswith("https://")]
    origin = request.headers.get("origin", "")
    return origin if origin in allowed else allowed[0]


async def user_payload(user: User) -> dict:
    return {**user.public(), "permissions": await permissions_for(user.role)}


@router.post("/register")
async def register(body: RegisterIn, request: Request, response: Response):
    email = body.email.lower()
    if not USERNAME_RE.match(body.username):
        raise HTTPException(400, "Никнейм: 3–20 символов, латиница, цифры и _")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email уже зарегистрирован")
    if await db.users.find_one({"username_lower": body.username.lower()}):
        raise HTTPException(400, "Никнейм уже занят")
    user = User(email=email, username=body.username, password_hash=hash_password(body.password), last_login=now_utc())
    doc = user.to_mongo()
    doc["username_lower"] = body.username.lower()
    user.id = str((await db.users.insert_one(doc)).inserted_id)
    await log_activity(user.id, "register", "Аккаунт создан. Добро пожаловать в YanaRPG!")
    set_auth_cookies(response, user, request)
    return await user_payload(user)


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else 'unknown'}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS:
        locked_at = attempt["last"]
        if locked_at.tzinfo is None:
            locked_at = locked_at.replace(tzinfo=now_utc().tzinfo)
        if now_utc() - locked_at < timedelta(minutes=LOCK_MINUTES):
            raise HTTPException(429, "Слишком много попыток. Попробуйте через 15 минут")
        await db.login_attempts.delete_one({"identifier": ident})
    user = User.from_mongo(await db.users.find_one({"email": email}))
    if not user or not verify_password(body.password, user.password_hash):
        await db.login_attempts.update_one({"identifier": ident}, {"$inc": {"count": 1}, "$set": {"last": now_utc()}},
                                           upsert=True)
        raise HTTPException(401, "Неверный email или пароль")
    if user.status == "banned":
        raise HTTPException(403, "Аккаунт заблокирован")
    await db.login_attempts.delete_one({"identifier": ident})
    user.last_login = now_utc()
    await db.users.update_one({"email": email}, {"$set": {"last_login": user.last_login}})
    await log_activity(user.id, "login", "Вход в аккаунт")
    set_auth_cookies(response, user, request)
    return await user_payload(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    clear_auth_cookies(response, request)
    return {"ok": True}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return await user_payload(user)


@router.post("/forgot-password")
async def forgot_password(body: ForgotIn, request: Request):
    generic = {"ok": True, "message": "Если аккаунт существует, мы отправили письмо со ссылкой"}
    user = User.from_mongo(await db.users.find_one({"email": body.email.lower()}))
    if not user or user.status == "banned":
        return generic
    recent = await db.password_reset_tokens.find_one(
        {"user_id": user.id, "created_at": {"$gte": now_utc() - timedelta(seconds=60)}})
    if recent:
        raise HTTPException(429, "Письмо уже отправлено. Попробуйте через минуту")
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "user_id": user.id, "token_hash": _token_hash(token), "used": False,
        "created_at": now_utc(), "expires_at": now_utc() + timedelta(hours=1)})
    link = f"{_app_url(request)}/reset-password?token={token}"
    await send_email(to=user.email, subject=f"{os.environ['EMAIL_FROM_NAME']}: восстановление пароля",
                     html=reset_email_html(user.username, link))
    await log_activity(user.id, "security", "Запрошено восстановление пароля")
    return generic


@router.post("/reset-password")
async def reset_password(body: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token_hash": _token_hash(body.token), "used": False})
    if not rec or rec["expires_at"] < now_utc():
        raise HTTPException(400, "Ссылка недействительна или устарела")
    await db.password_reset_tokens.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    await db.password_reset_tokens.update_many({"user_id": rec["user_id"], "used": False}, {"$set": {"used": True}})
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                              {"$set": {"password_hash": hash_password(body.new_password)}, "$inc": {"token_version": 1}})
    await log_activity(rec["user_id"], "security", "Пароль восстановлен по ссылке из письма")
    return {"ok": True}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Нет refresh-токена")
    user = await user_from_token(token, "refresh")
    set_auth_cookies(response, user, request)
    return {"ok": True}
