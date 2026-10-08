from datetime import datetime, timezone
from typing import Annotated, List, Optional

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True)
        if data.get("_id") is None:
            data.pop("_id", None)
        else:
            data["_id"] = ObjectId(data["_id"])
        return data


class GameStats(BaseModel):
    level: int = 1
    exp: int = 0
    hours_played: float = 0
    server: str = "Survival"
    faction: str = "Без клана"
    job: str = "Игрок"
    reputation: int = 0


class Wallet(BaseModel):
    cash: int = 50000
    bank: int = 0
    coins: int = 0


class ConsoleGrant(BaseModel):
    group: str
    expires_at: Optional[datetime] = None
    granted_by: str = ""
    granted_at: datetime = Field(default_factory=now_utc)


class ConsoleGroup(BaseDocument):
    name: str
    title: str
    color: str = "#FF6B00"
    tags: List[str] = Field(default_factory=list)
    commands: List[str] = Field(default_factory=list)
    server_ids: List[str] = Field(default_factory=list)
    daily_limit: int = 0
    duration_days: int = 0


class User(BaseDocument):
    email: str
    username: str
    password_hash: str = ""
    role: str = "user"
    status: str = "active"
    avatar_url: Optional[str] = None
    bio: str = ""
    city: str = ""
    token_version: int = 0
    mc_nick: str = ""
    console_grants: List[ConsoleGrant] = Field(default_factory=list)
    stats: GameStats = Field(default_factory=GameStats)
    wallet: Wallet = Field(default_factory=Wallet)
    created_at: datetime = Field(default_factory=now_utc)
    last_login: Optional[datetime] = None

    def public(self) -> dict:
        return self.model_dump(exclude={"password_hash", "token_version"})


class Role(BaseDocument):
    name: str
    title: str
    color: str = "#9CA3AF"
    permissions: List[str] = Field(default_factory=list)
    system: bool = False


class News(BaseDocument):
    title: str
    slug: str
    excerpt: str = ""
    content: str = ""
    tag: str = "Новости"
    cover_url: str = ""
    status: str = "draft"
    featured: bool = False
    author_id: Optional[str] = None
    author_name: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
    published_at: Optional[datetime] = None


class GameServer(BaseDocument):
    name: str
    ip: str = ""
    description: str = ""
    online: int = 0
    max_players: int = 1000
    ping: int = 20
    tag: str = ""
    order: int = 0
    enabled: bool = True
    mode: str = "rcon"
    rcon_host: str = ""
    rcon_port: int = 25575
    rcon_password: str = ""
    plugin_token: str = ""
    last_seen: Optional[datetime] = None

    def public(self) -> dict:
        return self.model_dump(include={"id", "name", "description", "online", "max_players", "ping", "tag", "order"})


class Product(BaseDocument):
    name: str
    category: str
    price_usd: float
    description: str = ""
    image: str = ""
    features: List[str] = Field(default_factory=list)
    commands: List[str] = Field(default_factory=list)
    server_ids: List[str] = Field(default_factory=list)
    console_group: str = ""
    max_qty: int = 1
    popular: bool = False
    enabled: bool = True
    order: int = 0


class OrderItem(BaseModel):
    product_id: str
    name: str
    qty: int = 1
    price_usd: float


class Order(BaseDocument):
    user_id: Optional[str] = None
    username: str = ""
    mc_nick: str
    items: List[OrderItem]
    total_usd: float
    currency: str = "USD"
    amount: float
    method: str
    status: str = "pending"
    session_id: str = ""
    manual: bool = False
    granted_by: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    paid_at: Optional[datetime] = None


class Delivery(BaseDocument):
    order_id: str
    product_name: str
    mc_nick: str
    server_id: str
    server_name: str
    command: str
    mode: str
    status: str = "pending"
    attempts: int = 0
    response: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class RconTag(BaseDocument):
    name: str
    title: str
    color: str = "#FF6B00"
    patterns: List[str] = Field(default_factory=list)


class AuditLog(BaseDocument):
    actor_id: str
    actor_name: str
    action: str
    message: str
    created_at: datetime = Field(default_factory=now_utc)


class Activity(BaseDocument):
    user_id: str
    type: str
    message: str
    created_at: datetime = Field(default_factory=now_utc)
