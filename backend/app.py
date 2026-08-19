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

from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/linxiaodai.db")
SESSION_DAYS = 14
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


class MealReflection(Base):
    __tablename__ = "meal_reflections"
    __table_args__ = (UniqueConstraint("order_id", name="uq_meal_reflection_order"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    mood: Mapped[str] = mapped_column(String(30))
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    note: Mapped[str] = mapped_column(String(160), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now(), index=True)


class DiningRoom(Base):
    __tablename__ = "dining_rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    host_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(80), default="今晚吃什么")
    requirements_json: Mapped[str] = mapped_column(Text, default="{}")
    candidates_json: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class DiningRoomMember(Base):
    __tablename__ = "dining_room_members"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_dining_room_member"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("dining_rooms.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class DiningRoomVote(Base):
    __tablename__ = "dining_room_votes"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_dining_room_vote"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("dining_rooms.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    candidate_index: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class BlindBoxRecord(Base):
    __tablename__ = "blind_box_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    requirements_json: Mapped[str] = mapped_column(Text, default="{}")
    result_json: Mapped[str] = mapped_column(Text)
    data_source: Mapped[str] = mapped_column(String(50), default="demo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now(), index=True)


class BlindBoxFeedback(Base):
    __tablename__ = "blind_box_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    box_id: Mapped[str] = mapped_column(ForeignKey("blind_box_records.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class SavedMeal(Base):
    __tablename__ = "saved_meals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    restaurant_id: Mapped[str] = mapped_column(ForeignKey("restaurants.id"), index=True)
    menu_item_ids_json: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(80))
    occasion: Mapped[str] = mapped_column(String(30), default="anytime", index=True)
    reason_snapshot: Mapped[str] = mapped_column(String(300), default="")
    total_price_snapshot: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)


class ProviderSource(Base):
    __tablename__ = "provider_sources"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(30), default="demo", index=True)
    sync_mode: Mapped[str] = mapped_column(String(30), default="manual")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


class ProviderRestaurantLink(Base):
    __tablename__ = "provider_restaurant_links"
    __table_args__ = (UniqueConstraint("provider_key", "restaurant_id", name="uq_provider_restaurant_link"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_key: Mapped[str] = mapped_column(ForeignKey("provider_sources.key"), index=True)
    restaurant_id: Mapped[str] = mapped_column(ForeignKey("restaurants.id"), index=True)
    external_restaurant_id: Mapped[str] = mapped_column(String(120))
    order_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OrderFulfillmentSnapshot(Base):
    __tablename__ = "order_fulfillment_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), unique=True, index=True)
    provider_key: Mapped[str] = mapped_column(ForeignKey("provider_sources.key"), index=True)
    external_order_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tracking_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    rider_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    rider_vehicle: Mapped[str | None] = mapped_column(String(80), nullable=True)
    rider_status: Mapped[str | None] = mapped_column(String(120), nullable=True)
    estimated_arrival_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: utc_now())


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


def provider_data(source: ProviderSource, restaurant_count: int) -> dict[str, Any]:
    return {
        "key": source.key,
        "name": source.name,
        "status": source.status,
        "syncMode": source.sync_mode,
        "lastSyncedAt": utc_iso(source.last_synced_at) if source.last_synced_at else None,
        "lastError": source.last_error,
        "restaurantCount": restaurant_count,
        "orderRedirectEnabled": source.status == "authorized",
    }


def saved_meal_data(db: Session, saved: SavedMeal) -> dict[str, Any]:
    restaurant = db.get(Restaurant, saved.restaurant_id)
    item_ids = parse_json(saved.menu_item_ids_json, [])
    items_by_id = {item.id: item for item in db.scalars(select(MenuItem).where(MenuItem.id.in_(item_ids))).all()} if item_ids else {}
    menu_items = [items_by_id[item_id] for item_id in item_ids if item_id in items_by_id]
    unavailable_count = sum(1 for item_id in item_ids if item_id not in items_by_id or not items_by_id[item_id].is_available or items_by_id[item_id].stock < 1)
    current_total = round(sum(item.price for item in menu_items), 2)
    is_available = bool(restaurant and restaurant.is_open and menu_items and unavailable_count == 0 and len(menu_items) == len(item_ids))
    return {
        "id": saved.id,
        "title": saved.title,
        "occasion": saved.occasion,
        "reason": saved.reason_snapshot,
        "restaurant": restaurant_data(restaurant) if restaurant else None,
        "menuItemIds": item_ids,
        "menuItems": [menu_data(item) for item in menu_items],
        "snapshotTotal": saved.total_price_snapshot,
        "currentTotal": current_total,
        "priceChanged": abs(current_total - saved.total_price_snapshot) >= 0.01,
        "isAvailable": is_available,
        "unavailableCount": unavailable_count,
        "createdAt": utc_iso(saved.created_at),
        "updatedAt": utc_iso(saved.updated_at),
        "deletedAt": utc_iso(saved.deleted_at) if saved.deleted_at else None,
    }


def order_provider_data(
    db: Session,
    restaurant_id: str,
    preferred_provider_key: str | None = None,
) -> tuple[ProviderSource | None, ProviderRestaurantLink | None]:
    links = db.scalars(
        select(ProviderRestaurantLink).where(ProviderRestaurantLink.restaurant_id == restaurant_id)
    ).all()
    candidates = [(db.get(ProviderSource, link.provider_key), link) for link in links]
    if preferred_provider_key:
        preferred = next(
            ((source, link) for source, link in candidates if source and source.key == preferred_provider_key),
            None,
        )
        if preferred:
            return preferred
    authorized = next(((source, link) for source, link in candidates if source and source.status == "authorized"), None)
    return authorized or (candidates[0] if candidates else (None, None))


ORDER_DELIVERY_COPY: dict[str, tuple[int, str, str | None]] = {
    "pending_payment": (0, "完成支付后，门店才会开始处理", "提交至履约渠道"),
    "paid": (8, "订单正在安全提交至履约渠道", "等待渠道确认"),
    "accepted": (24, "门店已接单，马上开始准备餐品", "开始制作"),
    "preparing": (46, "餐品正在制作，完成后会匹配配送员", "等待取餐"),
    "ready_for_pickup": (64, "餐品已经备好，正在匹配配送员", "配送员取餐"),
    "picked_up": (78, "配送员已取餐，正在前往收货地址", "开始配送"),
    "delivering": (90, "配送员正在送往收货地址", "送达"),
    "completed": (100, "订单已经送达，祝你用餐愉快", None),
    "cancelled": (0, "订单已取消，不会继续履约", None),
}


def order_fulfillment_data(
    db: Session,
    order: Order,
    restaurant: Restaurant | None,
    events: list[OrderEvent],
) -> dict[str, Any]:
    snapshot = db.scalar(select(OrderFulfillmentSnapshot).where(OrderFulfillmentSnapshot.order_id == order.id))
    source, link = order_provider_data(
        db,
        order.restaurant_id,
        snapshot.provider_key if snapshot else None,
    )
    is_live = bool(source and source.status == "authorized")
    paid_event = next((event for event in events if event.status == "paid"), None)
    eta_base = paid_event.created_at if paid_event else order.updated_at
    if eta_base.tzinfo is None:
        eta_base = eta_base.replace(tzinfo=timezone.utc)
    terminal = order.status in {"completed", "cancelled", "pending_payment"}
    estimated_arrival_at = (
        None
        if terminal
        else snapshot.estimated_arrival_at
        if snapshot and snapshot.estimated_arrival_at
        else eta_base + timedelta(minutes=restaurant.avg_delivery_time if restaurant else 30)
    )
    if estimated_arrival_at and estimated_arrival_at.tzinfo is None:
        estimated_arrival_at = estimated_arrival_at.replace(tzinfo=timezone.utc)
    progress_percent, current_action, next_milestone = ORDER_DELIVERY_COPY.get(
        order.status,
        (0, "正在读取最新履约状态", None),
    )
    is_delayed = bool(estimated_arrival_at and utc_now() > estimated_arrival_at)
    rider = None
    if snapshot and order.status in {"picked_up", "delivering"} and any((snapshot.rider_name, snapshot.rider_vehicle, snapshot.rider_status)):
        rider = {
            "displayName": snapshot.rider_name or "平台配送员",
            "vehicle": snapshot.rider_vehicle or "平台配送",
            "status": snapshot.rider_status or current_action,
        }
    elif not is_live and order.status in {"picked_up", "delivering"}:
        rider = {
            "displayName": "演示配送员",
            "vehicle": "模拟配送",
            "status": "已取餐，准备出发" if order.status == "picked_up" else "正送往收货地址",
        }
    return {
        "providerKey": source.key if source else "demo",
        "providerName": source.name if source else "本地演示数据",
        "mode": "platform" if is_live else "demo",
        "isLive": is_live,
        "trackingMode": "provider_callback" if is_live else "simulated",
        "trackingUrl": (
            snapshot.tracking_url
            if snapshot and snapshot.tracking_url
            else link.order_url if is_live and link else None
        ),
        "notice": "订单与配送进度由平台实时同步" if is_live else "当前为演示履约，不会发起真实扣款或配送",
        "lastSyncedAt": utc_iso(snapshot.last_synced_at) if snapshot else utc_iso(order.updated_at),
        "estimatedArrivalAt": utc_iso(estimated_arrival_at) if estimated_arrival_at else None,
        "progressPercent": progress_percent,
        "currentAction": current_action,
        "nextMilestone": next_milestone,
        "delayStatus": "delayed" if is_delayed else "on_time",
        "rider": rider,
    }


DEMO_ORDER_STAGES = [
    (0, "paid", "演示支付成功，正在向履约渠道提交订单"),
    (4, "accepted", "渠道已确认订单"),
    (9, "preparing", "餐品正在准备中"),
    (16, "ready_for_pickup", "餐品已准备好，正在匹配配送"),
    (24, "picked_up", "配送员已取餐"),
    (28, "delivering", "配送员正在送往收货地址"),
    (42, "completed", "订单已送达"),
]


def refresh_demo_order(db: Session, order: Order) -> bool:
    if order.status in {"pending_payment", "cancelled", "completed"}:
        return False
    source, _ = order_provider_data(db, order.restaurant_id)
    if source and source.status == "authorized":
        return False
    paid_event = db.scalar(
        select(OrderEvent)
        .where(OrderEvent.order_id == order.id, OrderEvent.status == "paid")
        .order_by(OrderEvent.created_at)
    )
    if not paid_event:
        return False
    started_at = paid_event.created_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    elapsed = max(0, int((utc_now() - started_at).total_seconds()))
    current_index = next((index for index, (_, value, _) in enumerate(DEMO_ORDER_STAGES) if value == order.status), 0)
    target_index = max(index for index, (seconds, _, _) in enumerate(DEMO_ORDER_STAGES) if elapsed >= seconds)
    if target_index <= current_index:
        return False
    for index in range(current_index + 1, target_index + 1):
        _, next_status, note = DEMO_ORDER_STAGES[index]
        order.status = next_status
        order.updated_at = utc_now()
        add_order_event(db, order, None, note)
    return True


def order_data(db: Session, order: Order, include_events: bool = False) -> dict[str, Any]:
    restaurant = db.get(Restaurant, order.restaurant_id)
    rows = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    reflection = db.scalar(select(MealReflection).where(MealReflection.order_id == order.id))
    events = db.scalars(select(OrderEvent).where(OrderEvent.order_id == order.id).order_by(OrderEvent.created_at)).all()
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
        "fulfillment": order_fulfillment_data(db, order, restaurant, list(events)),
        "createdAt": utc_iso(order.created_at),
        "updatedAt": utc_iso(order.updated_at),
        "reflection": {
            "mood": reflection.mood,
            "tags": parse_json(reflection.tags_json, []),
            "note": reflection.note,
            "createdAt": utc_iso(reflection.created_at),
        } if reflection else None,
    }
    if include_events:
        data["events"] = [{"status": event.status, "note": event.note, "createdAt": utc_iso(event.created_at)} for event in events]
    return data


def add_order_event(
    db: Session,
    order: Order,
    actor_id: str | None,
    note: str = "",
    created_at: datetime | None = None,
) -> None:
    db.add(
        OrderEvent(
            id=new_id(),
            order_id=order.id,
            status=order.status,
            actor_id=actor_id,
            note=note,
            created_at=created_at or utc_now(),
        )
    )


def taste_profile_data(db: Session, user: User, check_in_count: int | None = None) -> dict[str, Any]:
    preferences = parse_json(user.preferences_json, {})
    reflections = db.scalars(select(MealReflection).where(MealReflection.user_id == user.id).order_by(MealReflection.created_at.desc())).all()
    tag_counts: dict[str, int] = {}
    mood_counts: dict[str, int] = {}
    for reflection in reflections:
        mood_counts[reflection.mood] = mood_counts.get(reflection.mood, 0) + 1
        for tag in parse_json(reflection.tags_json, []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    favorite_cuisines = preferences.get("favoriteCuisines", [])
    count = len(reflections) if check_in_count is None else int(check_in_count)
    level = 1 + min(count // 3, 4)
    level_names = ["初尝者", "寻味人", "风味收藏家", "味觉策展人", "懂吃生活家"]
    return {
        "checkInCount": count,
        "level": level,
        "levelName": level_names[level - 1],
        "nextLevelAt": level * 3 if level < 5 else None,
        "favoriteCuisines": favorite_cuisines[:5],
        "topTags": [key for key, _ in sorted(tag_counts.items(), key=lambda item: (-item[1], item[0]))[:4]],
        "dominantMood": max(mood_counts, key=mood_counts.get) if mood_counts else None,
    }


PASSPORT_STAMPS = [
    {"cuisine": "川菜", "label": "热烈川味", "description": "麻辣鲜香，把胃口彻底叫醒"},
    {"cuisine": "日料", "label": "清鲜日和", "description": "清爽细腻，收藏一份克制的鲜"},
    {"cuisine": "韩餐", "label": "韩味分享", "description": "热闹浓郁，适合和饭搭子一起吃"},
    {"cuisine": "面食", "label": "碳水故乡", "description": "一碗踏实主食，稳稳接住今天"},
    {"cuisine": "轻食", "label": "轻盈绿洲", "description": "吃得满足，也保留身体的轻快"},
]


def taste_passport_data(db: Session, user: User) -> dict[str, Any]:
    completed_orders = db.scalars(
        select(Order).where(Order.customer_id == user.id, Order.status == "completed").order_by(Order.created_at)
    ).all()
    china_timezone = timezone(timedelta(hours=8))
    local_now = utc_now().astimezone(china_timezone)
    local_week_start = (local_now - timedelta(days=local_now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = local_week_start.astimezone(timezone.utc)
    cuisine_orders: dict[str, list[datetime]] = {stamp["cuisine"]: [] for stamp in PASSPORT_STAMPS}
    weekly_cuisines: set[str] = set()
    for order in completed_orders:
        restaurant = db.get(Restaurant, order.restaurant_id)
        categories = parse_json(restaurant.categories_json, []) if restaurant else []
        order_time = order.created_at if order.created_at.tzinfo else order.created_at.replace(tzinfo=timezone.utc)
        for cuisine in cuisine_orders:
            if cuisine in categories:
                cuisine_orders[cuisine].append(order_time)
                if order_time >= week_start:
                    weekly_cuisines.add(cuisine)
    stamps = [
        {
            **stamp,
            "unlocked": bool(cuisine_orders[stamp["cuisine"]]),
            "orderCount": len(cuisine_orders[stamp["cuisine"]]),
            "unlockedAt": utc_iso(cuisine_orders[stamp["cuisine"]][0]) if cuisine_orders[stamp["cuisine"]] else None,
        }
        for stamp in PASSPORT_STAMPS
    ]
    unlocked_count = sum(1 for stamp in stamps if stamp["unlocked"])
    reflection_count = db.scalar(select(func.count(MealReflection.id)).where(MealReflection.user_id == user.id)) or 0
    suggested = next((stamp["cuisine"] for stamp in stamps if not stamp["unlocked"]), None)
    weekly_goal = 3
    return {
        "stamps": stamps,
        "unlockedCount": unlocked_count,
        "totalStamps": len(stamps),
        "completedOrderCount": len(completed_orders),
        "explorerPoints": unlocked_count * 100 + len(completed_orders) * 20 + int(reflection_count) * 10,
        "weeklyDistinctCount": min(len(weekly_cuisines), weekly_goal),
        "weeklyGoal": weekly_goal,
        "weeklyCompleted": len(weekly_cuisines) >= weekly_goal,
        "suggestedCuisine": suggested,
    }


def weekly_taste_recap_data(db: Session, user: User, week_offset: int = 0) -> dict[str, Any]:
    china_timezone = timezone(timedelta(hours=8))
    local_now = utc_now().astimezone(china_timezone)
    current_week_start = (local_now - timedelta(days=local_now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    local_start = current_week_start - timedelta(weeks=week_offset)
    local_end = local_start + timedelta(days=7)
    utc_start, utc_end = local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc)
    orders = db.scalars(
        select(Order).where(
            Order.customer_id == user.id,
            Order.status == "completed",
            Order.created_at >= utc_start,
            Order.created_at < utc_end,
        ).order_by(Order.created_at)
    ).all()

    cuisine_counts: dict[str, int] = {}
    restaurant_counts: dict[str, int] = {}
    mood_counts: dict[str, int] = {}
    tag_counts: dict[str, int] = {}
    active_days: set[str] = set()
    item_count = 0
    total_spent = 0.0
    moment_counts = {"lunch": 0, "dinner": 0, "late": 0}
    for order in orders:
        restaurant = db.get(Restaurant, order.restaurant_id)
        categories = parse_json(restaurant.categories_json, []) if restaurant else []
        for cuisine in categories:
            if cuisine in {stamp["cuisine"] for stamp in PASSPORT_STAMPS}:
                cuisine_counts[cuisine] = cuisine_counts.get(cuisine, 0) + 1
        restaurant_name = restaurant.name if restaurant else "已下线店铺"
        restaurant_counts[restaurant_name] = restaurant_counts.get(restaurant_name, 0) + 1
        order_time = order.created_at if order.created_at.tzinfo else order.created_at.replace(tzinfo=timezone.utc)
        local_order_time = order_time.astimezone(china_timezone)
        active_days.add(local_order_time.date().isoformat())
        if 11 <= local_order_time.hour < 15:
            moment_counts["lunch"] += 1
        elif 17 <= local_order_time.hour < 22:
            moment_counts["dinner"] += 1
        else:
            moment_counts["late"] += 1
        total_spent += order.total
        item_count += sum(row.quantity for row in db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all())
        reflection = db.scalar(select(MealReflection).where(MealReflection.order_id == order.id))
        if reflection:
            mood_counts[reflection.mood] = mood_counts.get(reflection.mood, 0) + 1
            for tag in parse_json(reflection.tags_json, []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    top_cuisine = max(cuisine_counts, key=cuisine_counts.get) if cuisine_counts else None
    top_restaurant = max(restaurant_counts, key=restaurant_counts.get) if restaurant_counts else None
    dominant_mood = max(mood_counts, key=mood_counts.get) if mood_counts else None
    top_tags = [tag for tag, _ in sorted(tag_counts.items(), key=lambda item: (-item[1], item[0]))[:3]]
    moment_key = max(moment_counts, key=moment_counts.get) if orders else None
    moment_labels = {"lunch": "午间能量站", "dinner": "晚餐仪式派", "late": "错峰觅食家"}
    available_cuisines = [stamp["cuisine"] for stamp in PASSPORT_STAMPS]
    challenge_cuisine = next((cuisine for cuisine in available_cuisines if cuisine not in cuisine_counts), top_cuisine or available_cuisines[0])
    if len(cuisine_counts) >= 3:
        persona = {"title": "味觉漫游家", "summary": f"这一周走过 {len(cuisine_counts)} 种风味，你没有把胃口困在熟悉答案里。"}
    elif len(orders) >= 3 and top_cuisine:
        persona = {"title": f"{top_cuisine}坚定派", "summary": f"这一周你把喜欢投给了 {top_cuisine}，稳定的偏爱也很有力量。"}
    elif orders:
        persona = {"title": "认真吃饭的人", "summary": "哪怕生活很忙，你仍然为自己留出了好好吃饭的时刻。"}
    else:
        persona = {"title": "等待开席的探索者", "summary": "这一周的味觉页面还是空白，下一餐可以从一个新选择开始。"}
    label = f"{local_start.month}月{local_start.day}日—{(local_end - timedelta(days=1)).month}月{(local_end - timedelta(days=1)).day}日"
    challenge = {
        "cuisine": challenge_cuisine,
        "title": f"下一周，去遇见一次{challenge_cuisine}",
        "description": "让熟悉之外的味道，为普通的一天留下一点新鲜记忆。",
        "prompt": f"帮我完成下周饭感任务：想尝试一次{challenge_cuisine}，请结合我的口味推荐一餐",
    }
    share_text = None if not orders else f"我的林小呆一周饭感：{persona['title']}。这一周认真吃了 {len(orders)} 餐，走过 {len(cuisine_counts)} 种风味。下周想去遇见一次{challenge_cuisine}。"
    return {
        "weekOffset": week_offset,
        "period": {"start": utc_iso(utc_start), "end": utc_iso(utc_end), "label": label},
        "hasData": bool(orders),
        "orderCount": len(orders),
        "itemCount": item_count,
        "totalSpent": round(total_spent, 2),
        "averageOrderValue": round(total_spent / len(orders), 2) if orders else 0,
        "activeDays": len(active_days),
        "distinctCuisineCount": len(cuisine_counts),
        "topCuisine": top_cuisine,
        "topRestaurant": top_restaurant,
        "dominantMood": dominant_mood,
        "topTags": top_tags,
        "mealMoment": {"key": moment_key, "label": moment_labels[moment_key]} if moment_key else None,
        "persona": persona,
        "challenge": challenge,
        "shareText": share_text,
    }


def dining_room_data(db: Session, room: DiningRoom, user: User) -> dict[str, Any]:
    candidates = parse_json(room.candidates_json, [])
    members = db.scalars(select(DiningRoomMember).where(DiningRoomMember.room_id == room.id).order_by(DiningRoomMember.joined_at)).all()
    votes = db.scalars(select(DiningRoomVote).where(DiningRoomVote.room_id == room.id)).all()
    counts = [0 for _ in candidates]
    for vote in votes:
        if 0 <= vote.candidate_index < len(counts):
            counts[vote.candidate_index] += 1
    my_vote = next((vote.candidate_index for vote in votes if vote.user_id == user.id), None)
    participant_data = []
    for member in members:
        member_user = db.get(User, member.user_id)
        participant_data.append({
            "id": member.user_id,
            "name": member_user.name if member_user else "饭搭子",
            "isHost": member.user_id == room.host_id,
            "hasVoted": any(vote.user_id == member.user_id for vote in votes),
        })
    candidate_data = []
    for index, candidate in enumerate(candidates):
        candidate_data.append({**candidate, "votes": counts[index], "index": index})
    leaders = [index for index, count in enumerate(counts) if count == max(counts, default=0) and count > 0]
    consensus_index = leaders[0] if len(leaders) == 1 else None
    return {
        "id": room.id,
        "code": room.code,
        "title": room.title,
        "status": "expired" if dining_room_expired(room) else room.status,
        "isHost": room.host_id == user.id,
        "participants": participant_data,
        "candidates": candidate_data,
        "myVote": my_vote,
        "totalVotes": len(votes),
        "consensusIndex": consensus_index,
        "createdAt": utc_iso(room.created_at),
        "expiresAt": utc_iso(room.expires_at),
    }


def unique_room_code(db: Session) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(12):
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        if not db.scalar(select(DiningRoom.id).where(DiningRoom.code == code)):
            return code
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "暂时无法创建选餐房，请稍后再试")


def dining_room_expired(room: DiningRoom) -> bool:
    now = utc_now()
    expires_at = room.expires_at
    if expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    return expires_at < now


def utc_iso(value: datetime) -> str:
    """Serialize SQLite's naive UTC datetimes consistently for browser clients."""
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).astimezone(timezone.utc).isoformat()


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
        catalog_owner = User(
            id="catalog-demo",
            name="演示商品目录",
            email="catalog@internal.linxiaodai",
            password_hash=hash_password("demo123"),
            role="system",
            preferences_json="{}",
        )
        db.add_all([customer, catalog_owner])
        restaurants = [
            Restaurant(id="r-sichuan", owner_id=catalog_owner.id, name="蜀香小馆", description="川味家常菜，麻辣鲜香，适合想吃辣的一餐。", rating=4.8, rating_count=2356, categories_json=json_value(["川菜", "中餐", "辣味"]), address="朝阳区建国路 88 号", delivery_fee=5, min_order_amount=25, avg_delivery_time=28, opening_hours="10:00-22:00", phone="010-10000001"),
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


def seed_provider_sources() -> None:
    with SessionLocal.begin() as db:
        source = db.get(ProviderSource, "demo")
        if not source:
            source = ProviderSource(
                key="demo",
                name="本地演示数据",
                status="demo",
                sync_mode="manual",
                last_synced_at=utc_now(),
            )
            db.add(source)
        restaurant_ids = db.scalars(select(Restaurant.id)).all()
        linked = set(
            db.scalars(
                select(ProviderRestaurantLink.restaurant_id).where(ProviderRestaurantLink.provider_key == "demo")
            ).all()
        )
        for restaurant_id in restaurant_ids:
            if restaurant_id not in linked:
                db.add(
                    ProviderRestaurantLink(
                        id=new_id(),
                        provider_key="demo",
                        restaurant_id=restaurant_id,
                        external_restaurant_id=restaurant_id,
                        last_synced_at=utc_now(),
                    )
                )


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    seed_database()
    seed_provider_sources()
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
    if user.role != "customer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "当前产品仅面向消费者")
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


class CartQuoteRequest(BaseModel):
    items: list[CartLine] = Field(min_length=1, max_length=30)


class ActionRequest(BaseModel):
    action: str
    note: str = Field(default="", max_length=300)


class ProviderOrderCallback(BaseModel):
    status: Literal["accepted", "preparing", "ready_for_pickup", "picked_up", "delivering", "completed", "cancelled"]
    externalOrderId: str | None = Field(default=None, max_length=120)
    trackingUrl: str | None = Field(default=None, max_length=1000)
    estimatedArrivalAt: datetime | None = None
    riderName: str | None = Field(default=None, max_length=80)
    riderVehicle: str | None = Field(default=None, max_length=80)
    riderStatus: str | None = Field(default=None, max_length=120)
    note: str = Field(default="", max_length=300)
    occurredAt: datetime | None = None


PROVIDER_ORDER_STATUS_RANK = {
    "paid": 0,
    "accepted": 1,
    "preparing": 2,
    "ready_for_pickup": 3,
    "picked_up": 4,
    "delivering": 5,
    "completed": 6,
}

PROVIDER_ORDER_STATUS_LABEL = {
    "accepted": "渠道已确认订单",
    "preparing": "餐品正在准备中",
    "ready_for_pickup": "餐品已备好，等待取餐",
    "picked_up": "配送员已取餐",
    "delivering": "配送员正在送往收货地址",
    "completed": "订单已送达",
    "cancelled": "履约渠道已取消订单",
}


class BlindBoxFeedbackRequest(BaseModel):
    action: Literal["liked", "disliked", "reopened", "platform_opened"]


class MealReflectionRequest(BaseModel):
    mood: Literal["delighted", "comforted", "satisfied", "not_for_me"]
    tags: list[Literal["flavorful", "just_right", "fresh", "generous", "fast", "surprising", "reorder"]] = Field(default_factory=list, max_length=4)
    note: str = Field(default="", max_length=160)


SAVED_MEAL_OCCASIONS = {"anytime", "workday", "reward", "together", "light"}


class SaveMealRequest(BaseModel):
    restaurantId: str
    menuItemIds: list[str] = Field(min_length=1, max_length=6)
    title: str = Field(default="", max_length=80)
    occasion: str = Field(default="anytime", max_length=30)
    reason: str = Field(default="", max_length=300)
    totalPrice: float = Field(default=0, ge=0)


class UpdateSavedMealRequest(BaseModel):
    title: str | None = Field(default=None, max_length=80)
    occasion: str | None = Field(default=None, max_length=30)
    restore: bool = False


class CreateDiningRoomRequest(BaseModel):
    title: str = Field(default="今晚吃什么", max_length=80)
    requirements: dict[str, Any] = Field(default_factory=dict)


class JoinDiningRoomRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class DiningRoomVoteRequest(BaseModel):
    candidateIndex: int = Field(ge=0, le=2)


def extract_requirements(message: str, existing: dict[str, Any] | None = None) -> dict[str, Any]:
    req = dict(existing or {})
    clear_spice = any(phrase in message for phrase in ["口味不限", "辣度不限", "不限辣度"])
    if any(phrase in message for phrase in ["不限菜系", "菜系不限", "取消菜系限制"]):
        req.pop("cuisines", None)
    if clear_spice:
        req.pop("spiceLevel", None)
    if any(phrase in message for phrase in ["商品价", "菜品价", "配送费另算"]):
        req["budgetScope"] = "item"
    elif any(phrase in message for phrase in ["到手价", "实付", "含配送", "连配送", "算上配送"]):
        req["budgetScope"] = "delivered"
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
    if not clear_spice:
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
    if any(word in message for word in ["销量", "月售", "热销", "卖得最好"]):
        req["sortBy"] = "sales"
    elif any(word in message for word in ["评分", "好评", "口碑最好"]):
        req["sortBy"] = "rating"
    elif any(word in message for word in ["最快", "尽快", "送得快"]):
        req["sortBy"] = "speed"
    elif any(word in message for word in ["性价比", "最划算", "实惠"]):
        req["sortBy"] = "value"
    if "早餐" in message:
        req["mealTime"] = "breakfast"
    elif "午餐" in message or "中饭" in message:
        req["mealTime"] = "lunch"
    elif "晚餐" in message or "晚饭" in message:
        req["mealTime"] = "dinner"
    return req


def recommendations(db: Session, requirements: dict[str, Any], limit: int = 3, user_id: str | None = None) -> list[dict[str, Any]]:
    restaurants = {restaurant.id: restaurant for restaurant in db.scalars(select(Restaurant).where(Restaurant.is_open.is_(True))).all()}
    items = db.scalars(select(MenuItem).where(MenuItem.is_available.is_(True), MenuItem.stock > 0)).all()
    sources = {source.key: source for source in db.scalars(select(ProviderSource)).all()}
    links: dict[str, ProviderRestaurantLink] = {}
    for link in db.scalars(select(ProviderRestaurantLink)).all():
        existing = links.get(link.restaurant_id)
        existing_source = sources.get(existing.provider_key) if existing else None
        candidate_source = sources.get(link.provider_key)
        if not existing or (
            candidate_source
            and candidate_source.status == "authorized"
            and (not existing_source or existing_source.status != "authorized")
        ):
            links[link.restaurant_id] = link

    # Explicit consumer constraints are hard filters. Never surface an item that violates
    # a stated budget, cuisine, delivery-time or taste requirement.
    cuisines = requirements.get("cuisines", [])
    cuisine_matches = {
        restaurant_id for restaurant_id, restaurant in restaurants.items()
        if any(cuisine in parse_json(restaurant.categories_json, []) for cuisine in cuisines)
    }
    if cuisines:
        restaurants = {restaurant_id: restaurant for restaurant_id, restaurant in restaurants.items() if restaurant_id in cuisine_matches}

    delivery_limit = requirements.get("deliveryTimeLimit")
    delivery_matches = {
        restaurant_id for restaurant_id, restaurant in restaurants.items()
        if delivery_limit and restaurant.avg_delivery_time <= delivery_limit
    }
    if delivery_limit:
        restaurants = {restaurant_id: restaurant for restaurant_id, restaurant in restaurants.items() if restaurant_id in delivery_matches}

    candidates = [item for item in items if item.restaurant_id in restaurants]
    avoided = requirements.get("mustAvoid", [])
    if avoided:
        candidates = [
            item for item in candidates
            if not any(word in " ".join(parse_json(item.ingredients_json, []) + parse_json(item.allergens_json, [])) for word in avoided)
        ]

    spice = requirements.get("spiceLevel")
    if spice:
        candidates = [item for item in candidates if item.spice_level == spice]

    budget = requirements.get("budget")
    budget_scope = requirements.get("budgetScope", "item")
    if budget:
        candidates = [
            item for item in candidates
            if budget.get("min", 0)
            <= (item.price + restaurants[item.restaurant_id].delivery_fee if budget_scope == "delivered" else item.price)
            <= budget["max"]
        ]

    ranked: list[tuple[float, MenuItem, Restaurant]] = []
    learned_cuisines: dict[str, float] = {}
    if user_id:
        reflections = db.scalars(select(MealReflection).where(MealReflection.user_id == user_id)).all()
        for reflection in reflections:
            order = db.get(Order, reflection.order_id)
            restaurant = db.get(Restaurant, order.restaurant_id) if order else None
            if not restaurant:
                continue
            weight = {"delighted": 8.0, "comforted": 6.0, "satisfied": 3.0, "not_for_me": -9.0}.get(reflection.mood, 0.0)
            if "reorder" in parse_json(reflection.tags_json, []):
                weight += 5.0
            for category in parse_json(restaurant.categories_json, []):
                learned_cuisines[category] = learned_cuisines.get(category, 0.0) + weight
    for item in candidates:
        restaurant = restaurants.get(item.restaurant_id)
        if not restaurant:
            continue
        score = item.rating * 12 + restaurant.rating * 10 + min(item.sales_count / 300, 10)
        score += max((learned_cuisines.get(category, 0.0) for category in parse_json(restaurant.categories_json, [])), default=0.0)
        if requirements.get("budget"):
            score += 18
        if requirements.get("cuisines") and any(c in parse_json(restaurant.categories_json, []) for c in requirements["cuisines"]):
            score += 20
        if spice == item.spice_level:
            score += 14
        elif spice == "none" and item.spice_level != "none":
            score -= 22
        if requirements.get("deliveryTimeLimit") and restaurant.avg_delivery_time <= requirements["deliveryTimeLimit"]:
            score += 10
        ranked.append((score, item, restaurant))
    sort_by = requirements.get("sortBy")
    if sort_by == "sales":
        ranked.sort(key=lambda row: (row[1].sales_count, row[1].rating, row[0]), reverse=True)
    elif sort_by == "rating":
        ranked.sort(key=lambda row: (row[1].rating, row[2].rating, row[1].sales_count), reverse=True)
    elif sort_by == "speed":
        ranked.sort(key=lambda row: (row[2].avg_delivery_time, -row[0]))
    elif sort_by == "value":
        ranked.sort(key=lambda row: (row[1].price / max(row[1].rating, 0.1), -row[1].sales_count))
    else:
        ranked.sort(key=lambda row: row[0], reverse=True)

    results: list[dict[str, Any]] = []
    used: set[str] = set()
    for score, item, restaurant in ranked:
        if restaurant.id in used:
            continue
        link = links.get(restaurant.id)
        source = sources.get(link.provider_key if link else "demo")
        synced_at = link.last_synced_at if link and link.last_synced_at else source.last_synced_at if source else None
        freshness_status = "demo"
        freshness_label = "演示样本"
        if source and source.status == "authorized" and synced_at:
            aware_synced_at = synced_at.replace(tzinfo=timezone.utc) if synced_at.tzinfo is None else synced_at
            age_minutes = max(0, int((utc_now() - aware_synced_at).total_seconds() // 60))
            if age_minutes <= 15:
                freshness_status, freshness_label = "live", "15 分钟内已同步"
            elif age_minutes <= 60:
                freshness_status, freshness_label = "recent", f"{age_minutes} 分钟前同步"
            else:
                freshness_status, freshness_label = "stale", "价格更新较早"
        original_price = item.original_price if item.original_price and item.original_price > item.price else item.price
        estimated_payable = round(item.price + restaurant.delivery_fee, 2)
        savings = round(max(0, original_price - item.price), 2)
        matched_price = estimated_payable if budget_scope == "delivered" else item.price
        reason_prefix = {
            "sales": f"销量优先：{item.name} 已售 {item.sales_count} 份",
            "rating": f"口碑优先：{item.name} 评分 {item.rating}",
            "speed": f"送达优先：预计 {restaurant.avg_delivery_time} 分钟",
            "value": f"性价比优先：{item.name} ¥{item.price:g}",
        }.get(sort_by, f"综合推荐 {item.name}")
        results.append({
            "restaurant": restaurant_data(restaurant),
            "menuItems": [menu_data(item)],
            "totalPrice": item.price,
            "deliveryFee": restaurant.delivery_fee,
            "estimatedDeliveryTime": restaurant.avg_delivery_time,
            "reason": f"{reason_prefix}，预计到手 ¥{estimated_payable:g}",
            "score": round(max(score, 0), 1),
            "heatScore": min(99, round(item.sales_count / 35 + item.rating * 12)),
            "dataStatus": "synced" if source and source.status == "authorized" else "demo",
            "syncedAt": utc_iso(synced_at) if synced_at else None,
            "pricing": {
                "itemPrice": item.price,
                "originalItemPrice": original_price,
                "deliveryFee": restaurant.delivery_fee,
                "estimatedPayable": estimated_payable,
                "savings": savings,
                "budgetScope": budget_scope,
                "matchedPrice": matched_price,
                "disclaimer": "预计到手价不含平台专属红包，下单前会再次校验",
            },
            "freshness": {
                "status": freshness_status,
                "label": freshness_label,
                "syncedAt": utc_iso(synced_at) if synced_at else None,
            },
            "provider": {
                "key": source.key if source else "demo",
                "name": source.name if source else "本地演示数据",
                "orderUrl": link.order_url if link and source and source.status == "authorized" else None,
            },
        })
        used.add(restaurant.id)
        if len(results) == limit:
            break
    return results


def message_data(message: Message) -> dict[str, Any]:
    data = {"id": message.id, "role": message.role, "content": message.content, "createdAt": utc_iso(message.created_at)}
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
    if user.role != "customer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "林小呆现在仅面向消费者，请使用用户账号")
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


@app.get("/api/providers")
def list_provider_sources(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    sources = db.scalars(select(ProviderSource).order_by(ProviderSource.name)).all()
    payload = []
    for source in sources:
        count = len(
            db.scalars(
                select(ProviderRestaurantLink.id).where(ProviderRestaurantLink.provider_key == source.key)
            ).all()
        )
        payload.append(provider_data(source, count))
    return {"success": True, "data": payload}


@app.post("/api/provider-callbacks/{provider_key}/orders/{order_id}")
async def receive_provider_order_callback(
    provider_key: str,
    order_id: str,
    request: Request,
    x_provider_signature: str | None = Header(default=None, alias="X-Provider-Signature"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    env_key = re.sub(r"[^A-Za-z0-9]", "_", provider_key).upper()
    secret = os.getenv(f"PROVIDER_{env_key}_WEBHOOK_SECRET") or os.getenv("PROVIDER_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "配送回调密钥未配置")

    raw_body = await request.body()
    supplied_signature = (x_provider_signature or "").strip().lower()
    if supplied_signature.startswith("sha256="):
        supplied_signature = supplied_signature.removeprefix("sha256=")
    expected_signature = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not supplied_signature or not hmac.compare_digest(supplied_signature, expected_signature):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "配送回调签名无效")

    try:
        payload = ProviderOrderCallback.model_validate_json(raw_body)
    except ValidationError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "配送回调数据格式无效") from error

    with write_lock:
        source = db.get(ProviderSource, provider_key)
        if not source or source.status != "authorized":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "配送渠道尚未授权")
        order = db.get(Order, order_id)
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "订单不存在")
        link = db.scalar(
            select(ProviderRestaurantLink).where(
                ProviderRestaurantLink.provider_key == provider_key,
                ProviderRestaurantLink.restaurant_id == order.restaurant_id,
            )
        )
        if not link:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "配送渠道与当前门店未绑定")

        received_at = utc_now()
        callback_time = payload.occurredAt or received_at
        callback_time = (
            callback_time.replace(tzinfo=timezone.utc)
            if callback_time.tzinfo is None
            else callback_time.astimezone(timezone.utc)
        )
        order_updated_at = (
            order.updated_at.replace(tzinfo=timezone.utc)
            if order.updated_at.tzinfo is None
            else order.updated_at.astimezone(timezone.utc)
        )
        if payload.occurredAt and callback_time < order_updated_at:
            return {
                "success": True,
                "data": {
                    "acknowledged": True,
                    "stale": True,
                    "order": order_data(db, order, include_events=True),
                },
            }

        current_status = order.status
        if current_status == "pending_payment":
            raise HTTPException(status.HTTP_409_CONFLICT, "订单尚未支付，不能同步履约进度")
        if current_status in {"completed", "cancelled"} and payload.status != current_status:
            raise HTTPException(status.HTTP_409_CONFLICT, "订单已结束，不能变更履约状态")
        if payload.status != "cancelled" and payload.status != current_status:
            current_rank = PROVIDER_ORDER_STATUS_RANK.get(current_status)
            next_rank = PROVIDER_ORDER_STATUS_RANK.get(payload.status)
            if current_rank is None or next_rank is None or next_rank < current_rank:
                raise HTTPException(status.HTTP_409_CONFLICT, "配送状态不能回退")

        snapshot = db.scalar(
            select(OrderFulfillmentSnapshot).where(OrderFulfillmentSnapshot.order_id == order.id)
        )
        if snapshot and snapshot.provider_key != provider_key:
            raise HTTPException(status.HTTP_409_CONFLICT, "订单已由其他履约渠道接管")
        if not snapshot:
            snapshot = OrderFulfillmentSnapshot(
                id=new_id(),
                order_id=order.id,
                provider_key=provider_key,
            )
            db.add(snapshot)

        callback_fields = {
            "externalOrderId": "external_order_id",
            "trackingUrl": "tracking_url",
            "estimatedArrivalAt": "estimated_arrival_at",
            "riderName": "rider_name",
            "riderVehicle": "rider_vehicle",
            "riderStatus": "rider_status",
        }
        for payload_field, snapshot_field in callback_fields.items():
            if payload_field in payload.model_fields_set:
                setattr(snapshot, snapshot_field, getattr(payload, payload_field))

        status_changed = payload.status != current_status
        order.status = payload.status
        order.updated_at = max(order_updated_at, callback_time)
        snapshot.last_synced_at = received_at
        source.last_synced_at = received_at
        source.last_error = None
        link.last_synced_at = received_at
        if status_changed:
            note = payload.note.strip() or f"{source.name}同步：{PROVIDER_ORDER_STATUS_LABEL[payload.status]}"
            add_order_event(db, order, None, note, created_at=callback_time)
        db.commit()
        return {
            "success": True,
            "data": {
                "acknowledged": True,
                "stale": False,
                "order": order_data(db, order, include_events=True),
            },
        }


@app.get("/api/chat")
def list_or_get_conversations(id: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    if id:
        conversation = db.get(Conversation, id)
        if not conversation or conversation.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "对话不存在")
        messages = db.scalars(select(Message).where(Message.conversation_id == id).order_by(Message.created_at)).all()
        return {"success": True, "data": {"id": conversation.id, "title": conversation.title, "messages": [message_data(message) for message in messages], "extractedRequirements": parse_json(conversation.requirements_json, {})}}
    rows = db.scalars(select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc())).all()
    return {"success": True, "data": [{"id": row.id, "title": row.title, "createdAt": utc_iso(row.created_at), "updatedAt": utc_iso(row.updated_at)} for row in rows]}


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
        recs = recommendations(db, requirements, user_id=user.id)
        price_scope_copy = "到手价（含配送费）" if requirements.get("budgetScope") == "delivered" else "商品价（配送费另计）"
        reply = f"我已按{price_scope_copy}、口味、忌口与配送条件进行了严格筛选。"
        if recs:
            sort_copy = {"sales": "销量", "rating": "评分", "speed": "送达速度", "value": "性价比"}.get(requirements.get("sortBy"), "综合匹配度")
            reply += f" 按{sort_copy}首推 {recs[0]['restaurant']['name']} 的 {recs[0]['menuItems'][0]['name']}。"
        else:
            reply += " 暂时没有同时满足所有条件的可售商品，可以尝试稍微放宽预算或配送时间。"
        user_message = Message(id=new_id(), conversation_id=conversation.id, role="user", content=payload.message)
        assistant_message = Message(id=new_id(), conversation_id=conversation.id, role="assistant", content=reply, recommendations_json=json_value(recs))
        conversation.requirements_json = json_value(requirements)
        conversation.updated_at = utc_now()
        db.add_all([user_message, assistant_message])
        db.commit()
        return {"success": True, "data": {"conversationId": conversation.id, "message": message_data(assistant_message), "extractedRequirements": requirements}}


@app.post("/api/blind-box")
def blind_box(requirements: dict[str, Any], user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    recs = recommendations(db, requirements, limit=5, user_id=user.id)
    if not recs:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "没有符合条件的可售商品")
    primary_index = secrets.randbelow(min(3, len(recs)))
    primary = recs.pop(primary_index)
    record = BlindBoxRecord(
        id=new_id(),
        user_id=user.id,
        requirements_json=json_value(requirements),
        result_json=json_value(primary),
        data_source="demo",
    )
    db.add(record)
    db.commit()
    return {
        "success": True,
        "data": {
            "boxId": record.id,
            "recommendation": primary,
            "alternatives": recs[:2],
            "dataStatus": "demo",
            "message": "当前结果来自演示数据。接入授权平台后会显示实时价格、营业状态和跳转链接。",
        },
    }


@app.post("/api/blind-box/{box_id}/feedback")
def blind_box_feedback(box_id: str, payload: BlindBoxFeedbackRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    record = db.get(BlindBoxRecord, box_id)
    if not record or record.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "盲盒记录不存在")
    db.add(BlindBoxFeedback(id=new_id(), box_id=box_id, user_id=user.id, action=payload.action))
    db.commit()
    return {"success": True, "data": {"ok": True}}


@app.get("/api/blind-box/history")
def blind_box_history(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    records = db.scalars(
        select(BlindBoxRecord).where(BlindBoxRecord.user_id == user.id).order_by(BlindBoxRecord.created_at.desc()).limit(20)
    ).all()
    return {
        "success": True,
        "data": [
            {"id": record.id, "recommendation": parse_json(record.result_json, {}), "dataStatus": record.data_source, "createdAt": utc_iso(record.created_at)}
            for record in records
        ],
    }


@app.get("/api/orders")
def list_orders(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.scalars(select(Order).where(Order.customer_id == user.id).order_by(Order.created_at.desc())).all()
    changed = False
    for row in rows:
        changed = refresh_demo_order(db, row) or changed
    if changed:
        db.commit()
    return {"success": True, "data": [order_data(db, row, include_events=True) for row in rows]}


@app.get("/api/orders/{order_id}/reorder-preview")
def reorder_preview(order_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    order = db.get(Order, order_id)
    if not order or order.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "订单不存在")
    restaurant = db.get(Restaurant, order.restaurant_id)
    lines = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    preview_items: list[dict[str, Any]] = []
    unavailable_items: list[dict[str, str]] = []
    quantity_adjustments: list[dict[str, Any]] = []
    price_changed = False
    for line in lines:
        item = db.get(MenuItem, line.menu_item_id)
        if not item or item.restaurant_id != order.restaurant_id:
            unavailable_items.append({"name": line.name, "reason": "商品已下线"})
            continue
        if not item.is_available:
            unavailable_items.append({"name": line.name, "reason": "当前暂不可售"})
            continue
        if item.stock < 1:
            unavailable_items.append({"name": line.name, "reason": "当前已售罄"})
            continue
        quantity = min(line.quantity, item.stock, 20)
        if quantity < line.quantity:
            quantity_adjustments.append({"name": item.name, "fromQuantity": line.quantity, "toQuantity": quantity})
        if abs(item.price - line.price) >= 0.01:
            price_changed = True
        preview_items.append({
            "menuItem": menu_data(item),
            "quantity": quantity,
            "previousPrice": line.price,
            "currentPrice": item.price,
        })
    current_subtotal = round(sum(row["currentPrice"] * row["quantity"] for row in preview_items), 2)
    delivery_fee = restaurant.delivery_fee if restaurant else 0
    delivery_fee_changed = bool(restaurant and abs(delivery_fee - order.delivery_fee) >= 0.01)
    can_reorder = bool(restaurant and restaurant.is_open and preview_items)
    if not restaurant:
        notice = "原门店已下线，暂时无法复购"
    elif not restaurant.is_open:
        notice = "原门店当前暂停营业，请稍后再试"
    elif not preview_items:
        notice = "原订单商品当前都不可售，已为你保留订单记录"
    elif unavailable_items or quantity_adjustments:
        notice = "已按当前可售商品和库存调整后加入购物车"
    elif price_changed:
        notice = "商品价格有变化，已按当前价格加入购物车"
    else:
        notice = "原订单商品已按当前价格加入购物车"
    return {
        "success": True,
        "data": {
            "orderId": order.id,
            "restaurant": restaurant_data(restaurant) if restaurant else None,
            "items": preview_items,
            "unavailableItems": unavailable_items,
            "quantityAdjustments": quantity_adjustments,
            "originalSubtotal": order.subtotal,
            "originalDeliveryFee": order.delivery_fee,
            "originalTotal": order.total,
            "currentSubtotal": current_subtotal,
            "deliveryFee": delivery_fee,
            "currentTotal": round(current_subtotal + delivery_fee, 2),
            "priceChanged": price_changed,
            "deliveryFeeChanged": delivery_fee_changed,
            "canReorder": can_reorder,
            "notice": notice,
        },
    }


def build_checkout_quote(lines: list[CartLine], db: Session) -> dict[str, Any]:
    requested_restaurant_ids = {str(line.restaurant.get("id") or "") for line in lines}
    requested_restaurant_ids.discard("")
    restaurant = db.get(Restaurant, next(iter(requested_restaurant_ids))) if len(requested_restaurant_ids) == 1 else None
    item_ids = [str(line.menuItem.get("id") or "") for line in lines]
    current_items = {
        item.id: item
        for item in db.scalars(select(MenuItem).where(MenuItem.id.in_([item_id for item_id in item_ids if item_id]))).all()
    }
    preview_items: list[dict[str, Any]] = []
    unavailable_items: list[dict[str, str]] = []
    quantity_adjustments: list[dict[str, Any]] = []
    previous_subtotal = 0.0
    price_changed = False

    for line in lines:
        item_id = str(line.menuItem.get("id") or "")
        item = current_items.get(item_id)
        fallback_name = str(line.menuItem.get("name") or "未知商品")
        try:
            previous_price = float(line.menuItem.get("price", 0))
        except (TypeError, ValueError):
            previous_price = 0.0
        previous_subtotal += previous_price * line.quantity
        if not item:
            unavailable_items.append({"name": fallback_name, "reason": "商品已下线"})
            continue
        if not restaurant or item.restaurant_id != restaurant.id:
            unavailable_items.append({"name": item.name, "reason": "商品不属于当前门店"})
            continue
        if not item.is_available:
            unavailable_items.append({"name": item.name, "reason": "当前暂不可售"})
            continue
        if item.stock < 1:
            unavailable_items.append({"name": item.name, "reason": "当前已售罄"})
            continue
        quantity = min(line.quantity, item.stock, 20)
        if quantity < line.quantity:
            quantity_adjustments.append({"name": item.name, "fromQuantity": line.quantity, "toQuantity": quantity})
        if abs(item.price - previous_price) >= 0.01:
            price_changed = True
        preview_items.append({
            "menuItem": menu_data(item),
            "requestedQuantity": line.quantity,
            "quantity": quantity,
            "previousPrice": previous_price,
            "currentPrice": item.price,
        })

    previous_subtotal = round(previous_subtotal, 2)
    current_subtotal = round(sum(row["currentPrice"] * row["quantity"] for row in preview_items), 2)
    try:
        previous_delivery_fee = float(lines[0].restaurant.get("deliveryFee", 0))
    except (TypeError, ValueError):
        previous_delivery_fee = 0.0
    delivery_fee = restaurant.delivery_fee if restaurant else 0.0
    delivery_fee_changed = bool(restaurant and abs(delivery_fee - previous_delivery_fee) >= 0.01)
    min_order_gap = round(max(0.0, (restaurant.min_order_amount if restaurant else 0.0) - current_subtotal), 2)
    has_single_restaurant = len(requested_restaurant_ids) == 1
    can_checkout = bool(
        has_single_restaurant
        and restaurant
        and restaurant.is_open
        and preview_items
        and not unavailable_items
        and not quantity_adjustments
        and min_order_gap <= 0
    )
    if not has_single_restaurant:
        notice = "购物车门店信息有冲突，请重新选择商品"
    elif not restaurant:
        notice = "当前门店已下线，请让小呆重新推荐"
    elif not restaurant.is_open:
        notice = "当前门店暂停营业，请让小呆换一份"
    elif not preview_items:
        notice = "购物车商品当前都不可售，请重新选择"
    elif unavailable_items or quantity_adjustments:
        notice = "部分商品状态有变化，请先更新购物车"
    elif min_order_gap > 0:
        notice = f"实时商品金额还差 ¥{min_order_gap:g} 起送"
    elif price_changed or delivery_fee_changed:
        notice = "价格信息有变化，请确认后再提交"
    else:
        notice = "价格与库存已实时核对"
    return {
        "restaurant": restaurant_data(restaurant) if restaurant else None,
        "items": preview_items,
        "unavailableItems": unavailable_items,
        "quantityAdjustments": quantity_adjustments,
        "previousSubtotal": previous_subtotal,
        "currentSubtotal": current_subtotal,
        "previousDeliveryFee": previous_delivery_fee,
        "deliveryFee": delivery_fee,
        "previousTotal": round(previous_subtotal + previous_delivery_fee, 2),
        "currentTotal": round(current_subtotal + delivery_fee, 2),
        "minOrderGap": min_order_gap,
        "priceChanged": price_changed,
        "deliveryFeeChanged": delivery_fee_changed,
        "canCheckout": can_checkout,
        "notice": notice,
        "quotedAt": utc_now().isoformat(),
    }


@app.post("/api/orders/quote")
def checkout_quote(payload: CartQuoteRequest, _: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    return {"success": True, "data": build_checkout_quote(payload.items, db)}


@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
def create_order(payload: CreateOrderRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        item_ids = [line.menuItem.get("id") for line in payload.items]
        menu_items = {item.id: item for item in db.scalars(select(MenuItem).where(MenuItem.id.in_(item_ids))).all()}
        if len(menu_items) != len(set(item_ids)):
            raise HTTPException(status.HTTP_409_CONFLICT, "购物车商品已下线，请重新核对")
        restaurant_ids = {menu_items[item_id].restaurant_id for item_id in item_ids}
        if len(restaurant_ids) != 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "一次订单只能选择一家餐厅")
        restaurant = db.get(Restaurant, restaurant_ids.pop())
        if not restaurant or not restaurant.is_open:
            raise HTTPException(status.HTTP_409_CONFLICT, "门店营业状态已变化，请重新核对")
        if any(line.restaurant.get("id") != restaurant.id for line in payload.items):
            raise HTTPException(status.HTTP_409_CONFLICT, "购物车门店信息已变化，请重新核对")
        for line in payload.items:
            item = menu_items[line.menuItem["id"]]
            try:
                expected_price = float(line.menuItem.get("price"))
            except (TypeError, ValueError):
                raise HTTPException(status.HTTP_409_CONFLICT, "商品价格信息已过期，请重新核对")
            if abs(expected_price - item.price) >= 0.01:
                raise HTTPException(status.HTTP_409_CONFLICT, f"{item.name} 价格已变化，请重新核对")
            if not item.is_available or item.stock < line.quantity:
                raise HTTPException(status.HTTP_409_CONFLICT, f"{item.name} 库存已变化，请重新核对")
        try:
            expected_delivery_fee = float(payload.items[0].restaurant.get("deliveryFee"))
        except (TypeError, ValueError):
            raise HTTPException(status.HTTP_409_CONFLICT, "配送费信息已过期，请重新核对")
        if abs(expected_delivery_fee - restaurant.delivery_fee) >= 0.01:
            raise HTTPException(status.HTTP_409_CONFLICT, "配送费已变化，请重新核对")
        subtotal = round(sum(menu_items[line.menuItem["id"]].price * line.quantity for line in payload.items), 2)
        if subtotal < restaurant.min_order_amount:
            raise HTTPException(status.HTTP_409_CONFLICT, f"当前起送价为 ¥{restaurant.min_order_amount:g}，请重新核对")
        order = Order(id=new_id(), customer_id=user.id, restaurant_id=restaurant.id, status="pending_payment", subtotal=subtotal, delivery_fee=restaurant.delivery_fee, total=round(subtotal + restaurant.delivery_fee, 2), address_snapshot=payload.address, note=payload.note)
        db.add(order)
        for line in payload.items:
            item = menu_items[line.menuItem["id"]]
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
            add_order_event(db, order, user.id, "演示支付成功，正在向履约渠道提交订单")
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


@app.post("/api/orders/{order_id}/reflection", status_code=status.HTTP_201_CREATED)
def save_meal_reflection(order_id: str, payload: MealReflectionRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        order = db.get(Order, order_id)
        if not order or order.customer_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "订单不存在")
        if order.status != "completed":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "订单完成后才能记录回味")
        reflection = db.scalar(select(MealReflection).where(MealReflection.order_id == order.id))
        is_new_reflection = reflection is None
        if reflection:
            reflection.mood = payload.mood
            reflection.tags_json = json_value(list(dict.fromkeys(payload.tags)))
            reflection.note = payload.note.strip()
        else:
            reflection = MealReflection(
                id=new_id(),
                order_id=order.id,
                user_id=user.id,
                mood=payload.mood,
                tags_json=json_value(list(dict.fromkeys(payload.tags))),
                note=payload.note.strip(),
            )
            db.add(reflection)

        restaurant = db.get(Restaurant, order.restaurant_id)
        preferences = parse_json(user.preferences_json, {})
        favorite_cuisines = list(preferences.get("favoriteCuisines", []))
        if payload.mood in {"delighted", "comforted"} and restaurant:
            for category in parse_json(restaurant.categories_json, []):
                if category not in favorite_cuisines:
                    favorite_cuisines.append(category)
        preferences["favoriteCuisines"] = favorite_cuisines[:8]
        preferences["tasteCheckInCount"] = int(preferences.get("tasteCheckInCount", 0)) + (1 if is_new_reflection else 0)
        preferences["lastMealMood"] = payload.mood
        preferences["lastTasteTags"] = list(dict.fromkeys(payload.tags))
        user.preferences_json = json_value(preferences)
        db.commit()

        count = db.scalar(select(func.count(MealReflection.id)).where(MealReflection.user_id == user.id)) or 0
        return {"success": True, "data": {"order": order_data(db, order, include_events=True), "tasteProfile": taste_profile_data(db, user, count)}}


@app.get("/api/user/taste-profile")
def taste_profile(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    count = db.scalar(select(func.count(MealReflection.id)).where(MealReflection.user_id == user.id)) or 0
    return {"success": True, "data": taste_profile_data(db, user, count)}


@app.get("/api/user/taste-passport")
def taste_passport(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    return {"success": True, "data": taste_passport_data(db, user)}


@app.get("/api/user/weekly-taste-recap")
def weekly_taste_recap(
    week_offset: int = Query(default=0, alias="weekOffset", ge=0, le=12),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return {"success": True, "data": weekly_taste_recap_data(db, user, week_offset)}


@app.get("/api/saved-meals")
def list_saved_meals(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.scalars(select(SavedMeal).where(SavedMeal.user_id == user.id, SavedMeal.deleted_at.is_(None)).order_by(SavedMeal.updated_at.desc())).all()
    return {"success": True, "data": [saved_meal_data(db, row) for row in rows]}


@app.post("/api/saved-meals", status_code=status.HTTP_201_CREATED)
def create_saved_meal(payload: SaveMealRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        occasion = payload.occasion if payload.occasion in SAVED_MEAL_OCCASIONS else "anytime"
        restaurant = db.get(Restaurant, payload.restaurantId)
        unique_item_ids = list(dict.fromkeys(payload.menuItemIds))
        items = db.scalars(select(MenuItem).where(MenuItem.id.in_(unique_item_ids), MenuItem.restaurant_id == payload.restaurantId)).all()
        if not restaurant or len(items) != len(unique_item_ids):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "收藏内容包含无效餐厅或菜品")
        existing = db.scalar(select(SavedMeal).where(SavedMeal.user_id == user.id, SavedMeal.restaurant_id == restaurant.id, SavedMeal.menu_item_ids_json == json_value(unique_item_ids), SavedMeal.deleted_at.is_(None)))
        if existing:
            return {"success": True, "data": saved_meal_data(db, existing)}
        saved = SavedMeal(
            id=new_id(), user_id=user.id, restaurant_id=restaurant.id,
            menu_item_ids_json=json_value(unique_item_ids), title=payload.title.strip() or f"{restaurant.name}心动搭配",
            occasion=occasion, reason_snapshot=payload.reason.strip(), total_price_snapshot=payload.totalPrice,
        )
        db.add(saved); db.commit()
        return {"success": True, "data": saved_meal_data(db, saved)}


@app.patch("/api/saved-meals/{saved_id}")
def update_saved_meal(saved_id: str, payload: UpdateSavedMealRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        saved = db.get(SavedMeal, saved_id)
        if not saved or saved.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "没有找到这份收藏")
        if payload.restore:
            active_duplicate = db.scalar(select(SavedMeal).where(
                SavedMeal.id != saved.id,
                SavedMeal.user_id == user.id,
                SavedMeal.restaurant_id == saved.restaurant_id,
                SavedMeal.menu_item_ids_json == saved.menu_item_ids_json,
                SavedMeal.deleted_at.is_(None),
            ))
            if active_duplicate:
                return {"success": True, "data": saved_meal_data(db, active_duplicate)}
            saved.deleted_at = None
        if payload.title is not None:
            saved.title = payload.title.strip() or saved.title
        if payload.occasion is not None:
            if payload.occasion not in SAVED_MEAL_OCCASIONS:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "收藏场景不支持")
            saved.occasion = payload.occasion
        saved.updated_at = utc_now(); db.commit()
        return {"success": True, "data": saved_meal_data(db, saved)}


@app.delete("/api/saved-meals/{saved_id}")
def delete_saved_meal(saved_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        saved = db.get(SavedMeal, saved_id)
        if not saved or saved.user_id != user.id or saved.deleted_at is not None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "没有找到这份收藏")
        saved.deleted_at = utc_now(); saved.updated_at = utc_now(); db.commit()
        return {"success": True, "data": {"id": saved.id, "deleted": True}}


@app.post("/api/dining-rooms", status_code=status.HTTP_201_CREATED)
def create_dining_room(payload: CreateDiningRoomRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        recs = recommendations(db, payload.requirements, limit=3, user_id=user.id)
        if len(recs) < 2:
            recs = recommendations(db, {}, limit=3, user_id=user.id)
        if len(recs) < 2:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "当前可选餐厅不足，暂时无法创建选餐房")
        candidates = [
            {
                "restaurant": rec["restaurant"],
                "menuItems": rec["menuItems"],
                "totalPrice": rec["totalPrice"],
                "deliveryFee": rec["deliveryFee"],
                "estimatedDeliveryTime": rec["estimatedDeliveryTime"],
                "reason": rec["reason"],
            }
            for rec in recs[:3]
        ]
        room = DiningRoom(
            id=new_id(),
            code=unique_room_code(db),
            host_id=user.id,
            title=payload.title.strip() or "今晚吃什么",
            requirements_json=json_value(payload.requirements),
            candidates_json=json_value(candidates),
            expires_at=utc_now() + timedelta(hours=24),
        )
        db.add(room)
        db.add(DiningRoomMember(id=new_id(), room_id=room.id, user_id=user.id))
        db.commit()
        return {"success": True, "data": dining_room_data(db, room, user)}


@app.post("/api/dining-rooms/join")
def join_dining_room(payload: JoinDiningRoomRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        room = db.scalar(select(DiningRoom).where(DiningRoom.code == payload.code.strip().upper()))
        if not room or dining_room_expired(room):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "选餐房不存在或已经过期")
        member = db.scalar(select(DiningRoomMember).where(DiningRoomMember.room_id == room.id, DiningRoomMember.user_id == user.id))
        if not member:
            db.add(DiningRoomMember(id=new_id(), room_id=room.id, user_id=user.id))
            db.commit()
        return {"success": True, "data": dining_room_data(db, room, user)}


@app.get("/api/dining-rooms/{room_id}")
def get_dining_room(room_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    room = db.get(DiningRoom, room_id)
    member = db.scalar(select(DiningRoomMember).where(DiningRoomMember.room_id == room_id, DiningRoomMember.user_id == user.id)) if room else None
    if not room or not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "你还没有加入这个选餐房")
    return {"success": True, "data": dining_room_data(db, room, user)}


@app.post("/api/dining-rooms/{room_id}/vote")
def vote_dining_room(room_id: str, payload: DiningRoomVoteRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    with write_lock:
        room = db.get(DiningRoom, room_id)
        member = db.scalar(select(DiningRoomMember).where(DiningRoomMember.room_id == room_id, DiningRoomMember.user_id == user.id)) if room else None
        candidates = parse_json(room.candidates_json, []) if room else []
        if not room or not member:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "你还没有加入这个选餐房")
        if dining_room_expired(room) or room.status != "open":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "这个选餐房已经结束")
        if payload.candidateIndex >= len(candidates):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "候选餐厅不存在")
        vote = db.scalar(select(DiningRoomVote).where(DiningRoomVote.room_id == room_id, DiningRoomVote.user_id == user.id))
        if vote:
            vote.candidate_index = payload.candidateIndex
            vote.updated_at = utc_now()
        else:
            db.add(DiningRoomVote(id=new_id(), room_id=room_id, user_id=user.id, candidate_index=payload.candidateIndex))
        db.commit()
        return {"success": True, "data": dining_room_data(db, room, user)}


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return Response(content=json.dumps({"success": False, "data": None, "error": str(exc.detail)}, ensure_ascii=False), status_code=exc.status_code, media_type="application/json")
