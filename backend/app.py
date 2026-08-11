from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Any, Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/linxiaodai.db")
SESSION_DAYS = 14
ORDER_STATUSES = {
    "pending_payment",
    "paid",
    "accepted",
    "preparing",
    "ready_for_pickup",
    "delivering",
    "completed",
    "cancelled",
}
TRANSITIONS = {
    "paid": {"accepted", "cancelled"},
    "accepted": {"preparing", "cancelled"},
    "preparing": {"ready_for_pickup"},
    "ready_for_pickup": {"delivering"},
    "delivering": {"completed"},
}

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
write_lock = RLock()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer", index=True)
    preferences_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class UserSession(Base):
    __tablename__ = "user_sessions"

    token: Mapped[str] = mapped_column(String(96), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    description: Mapped[str] = mapped_column(Text)
    rating: Mapped[float] = mapped_column(Float, default=4.5)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    categories_json: Mapped[str] = mapped_column(Text, default="[]")
    address: Mapped[str] = mapped_column(String(255))
    delivery_fee: Mapped[float] = mapped_column(Float, default=0)
    min_order_amount: Mapped[float] = mapped_column(Float, default=0)
    avg_delivery_time: Mapped[int] = mapped_column(Integer, default=30)
    opening_hours: Mapped[str] = mapped_column(String(50), default="10:00-22:00")
    phone: Mapped[str] = mapped_column(String(40), default="")
    is_open: Mapped[bool] = mapped_column(default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    restaurant_id: Mapped[str] = mapped_column(ForeignKey("restaurants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Float)
    original_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="主食")
    spice_level: Mapped[str] = mapped_column(String(20), default="none")
    ingredients_json: Mapped[str] = mapped_column(Text, default="[]")
    allergens_json: Mapped[str] = mapped_column(Text, default="[]")
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    calories: Mapped[int] = mapped_column(Integer, default=0)
    sales_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Float, default=4.5)
    stock: Mapped[int] = mapped_column(Integer, default=50)
    is_available: Mapped[bool] = mapped_column(default=True, index=True)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    requirements_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now(), index=True)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    recommendations_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    restaurant_id: Mapped[str] = mapped_column(ForeignKey("restaurants.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending_payment", index=True)
    subtotal: Mapped[float] = mapped_column(Float)
    delivery_fee: Mapped[float] = mapped_column(Float)
    total: Mapped[float] = mapped_column(Float)
    address_snapshot: Mapped[str] = mapped_column(String(255), default="")
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now(), index=True)


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), index=True)
    menu_item_id: Mapped[str] = mapped_column(ForeignKey("menu_items.id"))
    name: Mapped[str] = mapped_column(String(120))
    price: Mapped[float] = mapped_column(Float)
    quantity: Mapped[int] = mapped_column(Integer)


class OrderEvent(Base):
    __tablename__ = "order_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), index=True)
    status: Mapped[str] = mapped_column(String(30))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


def json_value(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_json(value: str | None, fallback: Any) -> Any:
    try:
        return json.loads(value or "")
    except json.JSONDecodeError:
        return fallback


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_hex, hash_hex = encoded.split("$", 2)
        actual = hash_password(password, bytes.fromhex(salt_hex)).split("$", 2)[2]
        return hmac.compare_digest(actual, hash_hex)
    except (TypeError, ValueError):
        return False


def profile(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "preferences": parse_json(user.preferences_json, {}),
    }


def restaurant_data(restaurant: Restaurant) -> dict[str, Any]:
    return {
        "id": restaurant.id,
        "name": restaurant.name,
        "description": restaurant.description,
        "rating": restaurant.rating,
        "ratingCount": restaurant.rating_count,
        "categories": parse_json(restaurant.categories_json, []),
        "address": restaurant.address,
        "deliveryFee": restaurant.delivery_fee,
        "minOrderAmount": restaurant.min_order_amount,
        "avgDeliveryTime": restaurant.avg_delivery_time,
        "openingHours": restaurant.opening_hours,
        "phone": restaurant.phone,
        "isOpen": restaurant.is_open,
    }


def menu_data(item: MenuItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "restaurantId": item.restaurant_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "originalPrice": item.original_price,
        "category": item.category,
        "spiceLevel": item.spice_level,
        "ingredients": parse_json(item.ingredients_json, []),
        "allergens": parse_json(item.allergens_json, []),
        "tags": parse_json(item.tags_json, []),
        "calories": item.calories,
        "salesCount": item.sales_count,
        "rating": item.rating,
        "stock": item.stock,
        "isAvailable": item.is_available,
    }


def order_data(db: Session, order: Order, include_events: bool = False) -> dict[str, Any]:
    restaurant = db.get(Restaurant, order.restaurant_id)
    rows = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    data: dict[str, Any] = {
        "id": order.id,
        "restaurantId": order.restaurant_id,
        "restaurantName": restaurant.name if restaurant else "已下线店铺",
        "items": [
            {"id": row.id, "menuItemId": row.menu_item_id, "name": row.name, "price": row.price, "quantity": row.quantity}
            for row in rows
        ],
        "subtotal": order.subtotal,
        "deliveryFee": order.delivery_fee,
        "total": order.total,
        "status": order.status,
        "estimatedDeliveryTime": restaurant.avg_delivery_time if restaurant else 30,
        "address": order.address_snapshot,
        "note": order.note,
        "createdAt": order.created_at.isoformat(),
        "updatedAt": order.updated_at.isoformat(),
    }
    if include_events:
        events = db.scalars(select(OrderEvent).where(OrderEvent.order_id == order.id).order_by(OrderEvent.created_at)).all()
        data["events"] = [{"status": event.status, "note": event.note, "createdAt": event.created_at.isoformat()} for event in events]
    return data


def add_order_event(db: Session, order: Order, actor_id: str | None, note: str = "") -> None:
    db.add(OrderEvent(id=new_id(), order_id=order.id, status=order.status, actor_id=actor_id, note=note))


def seed_database() -> None:
    with SessionLocal.begin() as db:
        if db.scalar(select(User.id).limit(1)):
            return
        customer = User(
            id="customer-demo",
            name="林小呆用户",
            email="demo@linxiaodai.com",
            password_hash=hash_password("demo123"),
            role="customer",
            preferences_json=json_value({"spiceLevel": "medium", "allergies": [], "dislikedIngredients": [], "budgetMin": 20, "budgetMax": 80, "favoriteCuisines": ["川菜", "日料"]}),
        )
        merchant = User(
            id="merchant-demo",
            name="蜀香小馆店长",
            email="merchant@linxiaodai.com",
            password_hash=hash_password("demo123"),
            role="merchant",
            preferences_json="{}",
        )
        db.add_all([customer, merchant])
        restaurants = [
            Restaurant(id="r-sichuan", owner_id=merchant.id, name="蜀香小馆", description="川味家常菜，麻辣鲜香，适合想吃辣的一餐。", rating=4.8, rating_count=2356, categories_json=json_value(["川菜", "中餐", "辣味"]), address="朝阳区建国路 88 号", delivery_fee=5, min_order_amount=25, avg_delivery_time=28, opening_hours="10:00-22:00", phone="010-10000001"),
            Restaurant(id="r-japanese", name="樱花日料", description="寿司、鳗鱼饭和日式拉面，口味清爽。", rating=4.7, rating_count=1823, categories_json=json_value(["日料", "海鲜", "清淡"]), address="朝阳区光华路 50 号", delivery_fee=8, min_order_amount=35, avg_delivery_time=35, opening_hours="11:00-21:30", phone="010-10000002"),
            Restaurant(id="r-korean", name="韩式炸鸡屋", description="酥脆炸鸡和拌饭，适合多人分享。", rating=4.5, rating_count=1205, categories_json=json_value(["韩餐", "快餐", "炸鸡"]), address="朝阳区望京街 10 号", delivery_fee=4, min_order_amount=20, avg_delivery_time=25, opening_hours="10:30-23:00", phone="010-10000003"),
            Restaurant(id="r-noodle", name="老北京面馆", description="炸酱面、打卤面和家常小菜，实惠快送。", rating=4.4, rating_count=3156, categories_json=json_value(["面食", "中餐", "快餐"]), address="东城区鼓楼大街 25 号", delivery_fee=3, min_order_amount=15, avg_delivery_time=20, opening_hours="08:00-21:00", phone="010-10000004"),
            Restaurant(id="r-light", name="轻食主义", description="沙拉、三明治和低卡餐，适合想吃轻一点。", rating=4.3, rating_count=756, categories_json=json_value(["轻食", "沙拉", "健康"]), address="朝阳区国贸三期 B1", delivery_fee=5, min_order_amount=25, avg_delivery_time=22, opening_hours="09:00-20:00", phone="010-10000008"),
        ]
        db.add_all(restaurants)
        db.add_all([
            MenuItem(id="m-mapo", restaurant_id="r-sichuan", name="麻婆豆腐", description="麻辣下饭，豆腐嫩滑。", price=22, original_price=28, category="主菜", spice_level="hot", ingredients_json=json_value(["豆腐", "牛肉末", "花椒", "辣椒"]), tags_json=json_value(["招牌", "下饭"]), calories=280, sales_count=1800, rating=4.7, stock=80),
            MenuItem(id="m-kungpao", restaurant_id="r-sichuan", name="宫保鸡丁", description="经典川菜，酸甜微辣。", price=32, category="主菜", spice_level="medium", ingredients_json=json_value(["鸡肉", "花生", "干辣椒"]), allergens_json=json_value(["花生"]), tags_json=json_value(["经典", "人气"]), calories=420, sales_count=2100, rating=4.7, stock=60),
            MenuItem(id="m-salmon", restaurant_id="r-japanese", name="三文鱼寿司拼盘", description="新鲜寿司拼盘，清爽不腻。", price=58, category="寿司", spice_level="none", ingredients_json=json_value(["三文鱼", "米饭", "海苔"]), allergens_json=json_value(["鱼"]), tags_json=json_value(["清爽", "日料"]), calories=360, sales_count=1200, rating=4.8, stock=30),
            MenuItem(id="m-unagi", restaurant_id="r-japanese", name="蒲烧鳗鱼饭", description="甜咸酱汁，米饭饱满。", price=52, category="主食", spice_level="none", ingredients_json=json_value(["鳗鱼", "米饭", "照烧汁"]), allergens_json=json_value(["鱼"]), tags_json=json_value(["招牌", "饱腹"]), calories=550, sales_count=890, rating=4.7, stock=25),
            MenuItem(id="m-chicken", restaurant_id="r-korean", name="甜辣酱炸鸡", description="外酥里嫩，甜辣开胃。", price=42, category="炸鸡", spice_level="medium", ingredients_json=json_value(["鸡肉", "韩式辣酱", "蜂蜜"]), tags_json=json_value(["人气", "分享"]), calories=680, sales_count=2100, rating=4.7, stock=40),
            MenuItem(id="m-bibimbap", restaurant_id="r-korean", name="韩式拌饭", description="蔬菜丰富，营养均衡。", price=28, category="主食", spice_level="mild", ingredients_json=json_value(["米饭", "牛肉", "蔬菜", "鸡蛋"]), allergens_json=json_value(["鸡蛋"]), tags_json=json_value(["营养", "快餐"]), calories=480, sales_count=670, rating=4.4, stock=50),
            MenuItem(id="m-zhajiang", restaurant_id="r-noodle", name="老北京炸酱面", description="地道京味，酱香浓郁。", price=18, category="主食", spice_level="none", ingredients_json=json_value(["面条", "猪肉末", "黄酱", "黄瓜"]), tags_json=json_value(["实惠", "快送"]), calories=450, sales_count=3200, rating=4.5, stock=100),
            MenuItem(id="m-caesar", restaurant_id="r-light", name="凯撒鸡胸沙拉", description="高蛋白低负担，适合工作餐。", price=32, category="沙拉", spice_level="none", ingredients_json=json_value(["生菜", "鸡胸肉", "面包丁", "凯撒酱"]), allergens_json=json_value(["乳制品"]), tags_json=json_value(["低卡", "健康"]), calories=280, sales_count=780, rating=4.3, stock=35),
        ])


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    seed_database()
    yield


app = FastAPI(title="Linxiaodai API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(linxiaodai_session: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> User:
    if not linxiaodai_session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "请先登录")
    session = db.get(UserSession, linxiaodai_session)
    expires_at = session.expires_at.replace(tzinfo=timezone.utc) if session else None
    if not session or expires_at < utc_now():
        if session:
            db.delete(session)
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "登录已过期，请重新登录")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "账户不存在")
    return user


def merchant_user(user: User = Depends(current_user)) -> User:
    if user.role not in {"merchant", "admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "需要商家权限")
    return user


class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=6, max_length=128)


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=80)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    conversationId: str | None = None


class CartLine(BaseModel):
    menuItem: dict[str, Any]
    restaurant: dict[str, Any]
    quantity: int = Field(ge=1, le=20)


class CreateOrderRequest(BaseModel):
    items: list[CartLine] = Field(min_length=1, max_length=30)
    address: str = Field(default="默认配送地址", max_length=255)
    note: str = Field(default="", max_length=300)


class ActionRequest(BaseModel):
    action: str
    note: str = Field(default="", max_length=300)


class MenuInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    price: float = Field(gt=0, le=9999)
    category: str = Field(default="主食", max_length=50)
    spiceLevel: Literal["none", "mild", "medium", "hot"] = "none"
    stock: int = Field(default=0, ge=0, le=100000)
    tags: list[str] = Field(default_factory=list)


def extract_requirements(message: str, existing: dict[str, Any] | None = None) -> dict[str, Any]:
    req = dict(existing or {})
    people = re.search(r"(\d+)\s*(?:个)?人", message)
    if people:
        req["peopleCount"] = int(people.group(1))
    else:
        for word, count in {"一": 1, "两": 2, "二": 2, "三": 3, "四": 4, "五": 5}.items():
            if f"{word}个人" in message or f"{word}人" in message:
                req["peopleCount"] = count
                break
    budget = re.search(r"(\d+)\s*(?:元|块).{0,5}(?:以内|以下|之内)", message)
    if budget:
        req["budget"] = {"min": 0, "max": int(budget.group(1))}
    range_budget = re.search(r"(\d+)\s*(?:-|到|至|~)\s*(\d+)\s*(?:元|块)", message)
    if range_budget:
        req["budget"] = {"min": int(range_budget.group(1)), "max": int(range_budget.group(2))}
    cuisine_map = {"川菜": "川菜", "日料": "日料", "寿司": "日料", "韩餐": "韩餐", "炸鸡": "韩餐", "面": "面食", "轻食": "轻食", "沙拉": "轻食"}
    cuisines = sorted({value for key, value in cuisine_map.items() if key in message})
    if cuisines:
        req["cuisines"] = cuisines
    if any(word in message for word in ["不辣", "清淡", "少油"]):
        req["spiceLevel"] = "none"
    elif any(word in message for word in ["微辣", "一点辣"]):
        req["spiceLevel"] = "mild"
    elif any(word in message for word in ["重辣", "很辣", "特辣"]):
        req["spiceLevel"] = "hot"
    elif "辣" in message:
        req["spiceLevel"] = "medium"
    avoid = set(req.get("mustAvoid", []))
    for word in ["海鲜", "鱼", "花生", "鸡蛋", "乳制品", "香菜"]:
        if f"不吃{word}" in message or f"不要{word}" in message or f"{word}过敏" in message:
            avoid.add(word)
    if avoid:
        req["mustAvoid"] = sorted(avoid)
    delivery = re.search(r"(\d+)\s*分钟", message)
    if delivery:
        req["deliveryTimeLimit"] = int(delivery.group(1))
    return req


def recommendations(db: Session, requirements: dict[str, Any], limit: int = 3) -> list[dict[str, Any]]:
    restaurants = {restaurant.id: restaurant for restaurant in db.scalars(select(Restaurant).where(Restaurant.is_open.is_(True))).all()}
    items = db.scalars(select(MenuItem).where(MenuItem.is_available.is_(True), MenuItem.stock > 0)).all()
    ranked: list[tuple[float, MenuItem, Restaurant]] = []
    for item in items:
        restaurant = restaurants.get(item.restaurant_id)
        if not restaurant:
            continue
        score = item.rating * 12 + restaurant.rating * 10 + min(item.sales_count / 300, 10)
        if requirements.get("budget"):
            score += 18 if item.price + restaurant.delivery_fee <= requirements["budget"]["max"] else -18
        if requirements.get("cuisines") and any(c in parse_json(restaurant.categories_json, []) for c in requirements["cuisines"]):
            score += 20
        spice = requirements.get("spiceLevel")
        if spice == item.spice_level:
            score += 14
        elif spice == "none" and item.spice_level != "none":
            score -= 22
        ingredients = " ".join(parse_json(item.ingredients_json, []) + parse_json(item.allergens_json, []))
        if any(word in ingredients for word in requirements.get("mustAvoid", [])):
            score -= 80
        if requirements.get("deliveryTimeLimit") and restaurant.avg_delivery_time <= requirements["deliveryTimeLimit"]:
            score += 10
        ranked.append((score, item, restaurant))
    results: list[dict[str, Any]] = []
    used: set[str] = set()
    for score, item, restaurant in sorted(ranked, key=lambda row: row[0], reverse=True):
        if restaurant.id in used:
            continue
        related = [candidate for _, candidate, related_restaurant in ranked if related_restaurant.id == restaurant.id][:2]
        if item not in related:
            related.insert(0, item)
        total = round(sum(candidate.price for candidate in related), 2)
        results.append({
            "restaurant": restaurant_data(restaurant),
            "menuItems": [menu_data(candidate) for candidate in related],
            "totalPrice": total,
            "deliveryFee": restaurant.delivery_fee,
            "estimatedDeliveryTime": restaurant.avg_delivery_time,
            "reason": f"{restaurant.name}评分 {restaurant.rating}，预计 {restaurant.avg_delivery_time} 分钟送达，推荐 {item.name}",
            "score": round(max(score, 0), 1),
        })
        used.add(restaurant.id)
        if len(results) == limit:
            break
    return results


def message_data(message: Message) -> dict[str, Any]:
    data = {"id": message.id, "role": message.role, "content": message.content, "createdAt": message.created_at.isoformat()}
    if message.recommendations_json:
        data["recommendations"] = parse_json(message.recommendations_json, [])
    return data


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"success": True, "data": {"status": "ok", "time": utc_now().isoformat(), "database": DATABASE_URL.split(":", 1)[0]}}


@app.post("/api/auth/login")
def login(payload: Credentials, response: Response, db: Session = Depends(get_db)) -> dict[str, Any]:
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "邮箱或密码不正确")
    token = secrets.token_urlsafe(48)
    db.add(UserSession(token=token, user_id=user.id, expires_at=utc_now() + timedelta(days=SESSION_DAYS)))
    db.commit()
    response.set_cookie("linxiaodai_session", token, httponly=True, samesite="lax", max_age=SESSION_DAYS * 86400)
    return {"success": True, "data": profile(user)}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: Registration, response: Response, db: Session = Depends(get_db)) -> dict[str, Any]:
    email = payload.email.lower().strip()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "这个邮箱已经注册")
    user = User(id=new_id(), name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), preferences_json=json_value({"spiceLevel": "medium", "allergies": [], "dislikedIngredients": [], "budgetMin": 20, "budgetMax": 80, "favoriteCuisines": []}))
    token = secrets.token_urlsafe(48)
    db.add_all([user, UserSession(token=token, user_id=user.id, expires_at=utc_now() + timedelta(days=SESSION_DAYS))])
    db.commit()
    response.set_cookie("linxiaodai_session", token, httponly=True, samesite="lax", max_age=SESSION_DAYS * 86400)
    return {"success": True, "data": profile(user)}


@app.post("/api/auth/logout")
def logout(response: Response, linxiaodai_session: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> dict[str, Any]:
    if linxiaodai_session:
        session = db.get(UserSession, linxiaodai_session)
        if session:
            db.delete(session)
            db.commit()
    response.delete_cookie("linxiaodai_session")
    return {"success": True, "data": {"ok": True}}


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)) -> dict[str, Any]:
    return {"success": True, "data": profile(user)}


@app.get("/api/restaurants")
def list_restaurants(db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.scalars(select(Restaurant).where(Restaurant.is_open.is_(True)).order_by(Restaurant.rating.desc())).all()
    return {"success": True, "data": [restaurant_data(row) for row in rows]}


@app.get("/api/menu-items")
def list_menu_items(restaurantId: str | None = None, db: Session = Depends(get_db)) -> dict[str, Any]:
    statement = select(MenuItem).where(MenuItem.is_available.is_(True))
    if restaurantId:
        statement = statement.where(MenuItem.restaurant_id == restaurantId)
    return {"success": True, "data": [menu_data(row) for row in db.scalars(statement).all()]}


@app.get("/api/chat")
def list_or_get_conversations(id: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    if id:
        conversation = db.get(Conversation, id)
        if not conversation or conversation.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "对话不存在")
        messages = db.scalars(select(Message).where(Message.conversation_id == id).order_by(Message.created_at)).all()
        return {"success": True, "data": {"id": conversation.id, "title": conversation.title, "messages": [message_data(message) for message in messages], "extractedRequirements": parse_json(conversation.requirements_json, {})}}
    rows = db.scalars(select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc())).all()
    return {"success": True, "data": [{"id": row.id, "title": row.title, "createdAt": row.created_at.isoformat(), "updatedAt": row.updated_at.isoformat()} for row in rows]}


@app.post("/api/chat")
def chat(payload: ChatRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        conversation = db.get(Conversation, payload.conversationId) if payload.conversationId else None
        if conversation and conversation.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "对话不存在")
        if not conversation:
            conversation = Conversation(id=new_id(), user_id=user.id, title=payload.message[:24])
            db.add(conversation)
        requirements = extract_requirements(payload.message, parse_json(conversation.requirements_json, {}))
        recs = recommendations(db, requirements)
        reply = "我按人数、预算、口味和配送时间筛选了可下单的餐厅。"
        if recs:
            reply += f" 首推 {recs[0]['restaurant']['name']} 的 {recs[0]['menuItems'][0]['name']}。"
        user_message = Message(id=new_id(), conversation_id=conversation.id, role="user", content=payload.message)
        assistant_message = Message(id=new_id(), conversation_id=conversation.id, role="assistant", content=reply, recommendations_json=json_value(recs))
        conversation.requirements_json = json_value(requirements)
        conversation.updated_at = utc_now()
        db.add_all([user_message, assistant_message])
        db.commit()
        return {"success": True, "data": {"conversationId": conversation.id, "message": message_data(assistant_message), "extractedRequirements": requirements}}


@app.post("/api/blind-box")
def blind_box(requirements: dict[str, Any], user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    recs = recommendations(db, requirements, limit=5)
    if not recs:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "没有符合条件的可售菜品")
    return {"success": True, "data": recs[secrets.randbelow(len(recs))]}


@app.get("/api/orders")
def list_orders(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.scalars(select(Order).where(Order.customer_id == user.id).order_by(Order.created_at.desc())).all()
    return {"success": True, "data": [order_data(db, row, include_events=True) for row in rows]}


@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
def create_order(payload: CreateOrderRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        item_ids = [line.menuItem.get("id") for line in payload.items]
        menu_items = {item.id: item for item in db.scalars(select(MenuItem).where(MenuItem.id.in_(item_ids))).all()}
        if len(menu_items) != len(set(item_ids)):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "购物车中包含不存在的菜品")
        restaurant_ids = {menu_items[item_id].restaurant_id for item_id in item_ids}
        if len(restaurant_ids) != 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "一次订单只能选择一家餐厅")
        restaurant = db.get(Restaurant, restaurant_ids.pop())
        if not restaurant or not restaurant.is_open:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "餐厅当前未营业")
        subtotal = round(sum(menu_items[line.menuItem["id"]].price * line.quantity for line in payload.items), 2)
        if subtotal < restaurant.min_order_amount:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"起送价为 ¥{restaurant.min_order_amount:g}")
        order = Order(id=new_id(), customer_id=user.id, restaurant_id=restaurant.id, status="pending_payment", subtotal=subtotal, delivery_fee=restaurant.delivery_fee, total=round(subtotal + restaurant.delivery_fee, 2), address_snapshot=payload.address, note=payload.note)
        db.add(order)
        for line in payload.items:
            item = menu_items[line.menuItem["id"]]
            if not item.is_available or item.stock < line.quantity:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{item.name} 库存不足")
            db.add(OrderItem(id=new_id(), order_id=order.id, menu_item_id=item.id, name=item.name, price=item.price, quantity=line.quantity))
        add_order_event(db, order, user.id, "订单已创建，等待支付")
        db.commit()
        return {"success": True, "data": order_data(db, order, include_events=True)}


@app.post("/api/orders/{order_id}")
def update_customer_order(order_id: str, payload: ActionRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        order = db.get(Order, order_id)
        if not order or order.customer_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "订单不存在")
        if payload.action == "pay":
            if order.status != "pending_payment":
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "当前订单不能支付")
            lines = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
            for line in lines:
                item = db.get(MenuItem, line.menu_item_id)
                if not item or not item.is_available or item.stock < line.quantity:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{line.name} 库存不足，请重新下单")
            for line in lines:
                item = db.get(MenuItem, line.menu_item_id)
                item.stock -= line.quantity
                item.sales_count += line.quantity
            order.status = "paid"
            order.updated_at = utc_now()
            add_order_event(db, order, user.id, "模拟支付成功，等待商家接单")
        elif payload.action == "cancel":
            if order.status not in {"pending_payment", "paid"}:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "当前订单不能取消")
            order.status = "cancelled"
            order.updated_at = utc_now()
            add_order_event(db, order, user.id, payload.note or "用户取消订单")
        else:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "不支持的订单操作")
        db.commit()
        return {"success": True, "data": order_data(db, order, include_events=True)}


def merchant_restaurant(db: Session, user: User) -> Restaurant:
    restaurant = db.scalar(select(Restaurant).where(Restaurant.owner_id == user.id))
    if not restaurant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "商家尚未绑定餐厅")
    return restaurant


@app.get("/api/merchant/dashboard")
def merchant_dashboard(user: User = Depends(merchant_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    restaurant = merchant_restaurant(db, user)
    orders = db.scalars(select(Order).where(Order.restaurant_id == restaurant.id).order_by(Order.created_at.desc())).all()
    today = utc_now().date()
    today_orders = [order for order in orders if order.created_at.date() == today]
    return {"success": True, "data": {"restaurant": restaurant_data(restaurant), "metrics": {"todayOrders": len(today_orders), "todayRevenue": round(sum(order.total for order in today_orders if order.status != "cancelled"), 2), "pendingOrders": sum(order.status == "paid" for order in orders), "activeOrders": sum(order.status in {"accepted", "preparing", "ready_for_pickup", "delivering"} for order in orders)}, "recentOrders": [order_data(db, order, include_events=True) for order in orders[:10]]}}


@app.get("/api/merchant/orders")
def merchant_orders(user: User = Depends(merchant_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    restaurant = merchant_restaurant(db, user)
    orders = db.scalars(select(Order).where(Order.restaurant_id == restaurant.id).order_by(Order.created_at.desc())).all()
    return {"success": True, "data": [order_data(db, order, include_events=True) for order in orders]}


@app.post("/api/merchant/orders/{order_id}")
def merchant_update_order(order_id: str, payload: ActionRequest, user: User = Depends(merchant_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        restaurant = merchant_restaurant(db, user)
        order = db.get(Order, order_id)
        if not order or order.restaurant_id != restaurant.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "订单不存在")
        if payload.action not in ORDER_STATUSES or payload.action not in TRANSITIONS.get(order.status, set()):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "不符合订单状态流转规则")
        order.status = payload.action
        order.updated_at = utc_now()
        add_order_event(db, order, user.id, payload.note or "商家更新订单状态")
        db.commit()
        return {"success": True, "data": order_data(db, order, include_events=True)}


@app.get("/api/merchant/menu-items")
def merchant_menu_items(user: User = Depends(merchant_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    restaurant = merchant_restaurant(db, user)
    rows = db.scalars(select(MenuItem).where(MenuItem.restaurant_id == restaurant.id).order_by(MenuItem.category, MenuItem.name)).all()
    return {"success": True, "data": [menu_data(row) for row in rows]}


@app.post("/api/merchant/menu-items", status_code=status.HTTP_201_CREATED)
def merchant_create_menu_item(payload: MenuInput, user: User = Depends(merchant_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    restaurant = merchant_restaurant(db, user)
    item = MenuItem(id=new_id(), restaurant_id=restaurant.id, name=payload.name, description=payload.description, price=payload.price, category=payload.category, spice_level=payload.spiceLevel, stock=payload.stock, tags_json=json_value(payload.tags), is_available=payload.stock > 0)
    db.add(item)
    db.commit()
    return {"success": True, "data": menu_data(item)}


@app.patch("/api/merchant/menu-items/{item_id}")
def merchant_update_menu_item(item_id: str, payload: MenuInput, user: User = Depends(merchant_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    restaurant = merchant_restaurant(db, user)
    item = db.get(MenuItem, item_id)
    if not item or item.restaurant_id != restaurant.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "菜品不存在")
    item.name, item.description, item.price, item.category = payload.name, payload.description, payload.price, payload.category
    item.spice_level, item.stock, item.tags_json, item.is_available = payload.spiceLevel, payload.stock, json_value(payload.tags), payload.stock > 0
    db.commit()
    return {"success": True, "data": menu_data(item)}


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return Response(content=json.dumps({"success": False, "data": None, "error": str(exc.detail)}, ensure_ascii=False), status_code=exc.status_code, media_type="application/json")
