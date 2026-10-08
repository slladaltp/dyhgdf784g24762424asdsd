from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import logging
import os

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from core.db import client
from core.seed import run_seed
from core.storage import init_storage
from routers import admin, auth, console, donate, files, news, players, servers, shop, users

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [o.strip() for o in os.environ["FRONTEND_URL"].split(",") if o.strip()]

app = FastAPI(title="YanaRPG API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "YanaRPG API", "status": "ok"}


for module in (auth, users, news, admin, files, players, servers, shop, donate, console):
    api.include_router(module.router)
app.include_router(api)


@app.middleware("http")
async def origin_guard(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and origin and origin not in ALLOWED_ORIGINS:
        return JSONResponse({"detail": "Недопустимый источник запроса"}, status_code=403)
    return await call_next(request)


app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await run_seed()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
