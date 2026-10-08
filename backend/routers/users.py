from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field

from core.db import db
from core.models import Activity, User
from core.security import get_current_user, hash_password, log_activity, set_auth_cookies, verify_password
from core.storage import save_image
from routers.auth import USERNAME_RE, user_payload

router = APIRouter(prefix="/users/me", tags=["users"])


class ProfileIn(BaseModel):
    username: str | None = None
    bio: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=60)
    mc_nick: str | None = Field(default=None, pattern="^[A-Za-z0-9_]{3,16}$")


class PasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.patch("")
async def update_profile(body: ProfileIn, user: User = Depends(get_current_user)):
    updates = body.model_dump(exclude_none=True)
    if "username" in updates and updates["username"] != user.username:
        if not USERNAME_RE.match(updates["username"]):
            raise HTTPException(400, "Никнейм: 3–20 символов, латиница, цифры и _")
        taken = await db.users.find_one({"username_lower": updates["username"].lower(), "_id": {"$ne": ObjectId(user.id)}})
        if taken:
            raise HTTPException(400, "Никнейм уже занят")
        updates["username_lower"] = updates["username"].lower()
    if updates:
        await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": updates})
        await log_activity(user.id, "profile", "Профиль обновлён")
    return await user_payload(User.from_mongo(await db.users.find_one({"_id": ObjectId(user.id)})))


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    url = await save_image(file, "avatars", user.id)
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"avatar_url": url}})
    await log_activity(user.id, "profile", "Аватар обновлён")
    return {"avatar_url": url}


@router.post("/password")
async def change_password(body: PasswordIn, request: Request, response: Response, user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"_id": ObjectId(user.id)})
    if not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(400, "Текущий пароль неверен")
    if body.current_password == body.new_password:
        raise HTTPException(400, "Новый пароль совпадает с текущим")
    user.token_version += 1
    await db.users.update_one({"_id": ObjectId(user.id)},
                              {"$set": {"password_hash": hash_password(body.new_password), "token_version": user.token_version}})
    await log_activity(user.id, "security", "Пароль изменён. Остальные сессии завершены")
    set_auth_cookies(response, user, request)
    return {"ok": True}


@router.get("/activity")
async def my_activity(limit: int = 30, user: User = Depends(get_current_user)):
    docs = await db.activities.find({"user_id": user.id}).sort("created_at", -1).limit(min(limit, 100)).to_list(100)
    return [Activity.from_mongo(d).model_dump() for d in docs]
