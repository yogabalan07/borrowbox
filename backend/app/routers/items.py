import json
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..models import BorrowRequest, Item, User
from ..schemas import ItemCreateIn, ItemOut, ItemUpdateIn
from ..serializers import item_out

router = APIRouter(tags=["items"])

MAX_IMAGES = 6
MAX_IMAGE_CHARS = 7_000_000  # A 5MB image becomes ~6.7MB as a base64 data-URL string.
DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 100
SORT_OPTIONS = ("newest", "price_asc", "price_desc", "rating")


def _validate_images(images: list[str]) -> list[str]:
    cleaned = [img.strip() for img in images if img and img.strip()]
    if len(cleaned) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A listing can include at most {MAX_IMAGES} images.",
        )
    for image in cleaned:
        if len(image) > MAX_IMAGE_CHARS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One of the images is too large. Please use images under 5MB.",
            )
    return cleaned


def _validate_pricing(lending_mode: str, daily_price: float) -> float:
    if lending_mode == "free":
        return 0.0
    if daily_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paid rentals require a daily price greater than zero.",
        )
    return daily_price


def _validate_day_limits(min_days: int, max_days: int) -> None:
    if min_days > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum borrow days cannot exceed maximum borrow days.",
        )


def _get_owned_item(item_id: str, user: User, db: Session) -> Item:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found."
        )
    if item.owner_id != user.id and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own listings.",
        )
    return item


@router.get("/items", response_model=list[ItemOut])
def list_items(
    search: str | None = None,
    category: str | None = None,
    lending_mode: str | None = None,
    condition: str | None = None,
    available_only: bool = False,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    sort_by: str = "newest",
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = select(Item).options(joinedload(Item.owner))
    if search:
        pattern = f"%{unquote(search).strip()}%"
        query = query.where(
            or_(
                Item.title.ilike(pattern),
                Item.description.ilike(pattern),
                Item.pickup_location.ilike(pattern),
            )
        )
    if category:
        query = query.where(Item.category == category)
    if lending_mode:
        query = query.where(Item.lending_mode == lending_mode)
    if condition:
        query = query.where(Item.condition == condition)
    if available_only:
        query = query.where(Item.is_available.is_(True))
    if min_price is not None:
        query = query.where(Item.daily_price >= min_price)
    if max_price is not None:
        query = query.where(Item.daily_price <= max_price)

    if sort_by == "price_asc":
        query = query.order_by(Item.daily_price.asc(), Item.created_at.desc())
    elif sort_by == "price_desc":
        query = query.order_by(Item.daily_price.desc(), Item.created_at.desc())
    elif sort_by == "rating":
        query = query.join(User, User.id == Item.owner_id).order_by(
            User.rating.desc(), Item.created_at.desc()
        )
    else:
        query = query.order_by(Item.created_at.desc())

    query = query.limit(limit).offset(offset)
    items = db.scalars(query).unique().all()
    return [item_out(item) for item in items]


@router.get("/items/mine", response_model=list[ItemOut])
def list_my_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.scalars(
        select(Item)
        .where(Item.owner_id == current_user.id)
        .options(joinedload(Item.owner))
        .order_by(Item.created_at.desc())
    ).unique().all()
    return [item_out(item) for item in items]


@router.get("/users/{user_id}/items", response_model=list[ItemOut])
def list_user_items(user_id: str, db: Session = Depends(get_db)):
    owner = db.get(User, user_id)
    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    items = db.scalars(
        select(Item)
        .where(Item.owner_id == user_id)
        .options(joinedload(Item.owner))
        .order_by(Item.created_at.desc())
    ).unique().all()
    return [item_out(item) for item in items]


@router.get("/items/{item_id}", response_model=ItemOut)
def get_item(item_id: str, db: Session = Depends(get_db)):
    item = db.scalar(
        select(Item).where(Item.id == item_id).options(joinedload(Item.owner))
    )
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found."
        )
    return item_out(item)


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=ItemOut)
def create_item(
    payload: ItemCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    daily_price = _validate_pricing(payload.lendingMode, payload.dailyPrice)
    _validate_day_limits(payload.minBorrowDays, payload.maxBorrowDays)
    images = _validate_images(payload.images)

    item = Item(
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category,
        condition=payload.condition,
        lending_mode=payload.lendingMode,
        daily_price=daily_price,
        deposit=payload.deposit,
        pickup_location=payload.pickupLocation.strip(),
        images_json=json.dumps(images),
        owner_id=current_user.id,
        is_available=payload.isAvailable,
        min_borrow_days=payload.minBorrowDays,
        max_borrow_days=payload.maxBorrowDays,
        guidelines=payload.guidelines.strip() if payload.guidelines else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_out(item)


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: str,
    payload: ItemUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = _get_owned_item(item_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)

    new_mode = data.get("lendingMode", item.lending_mode)
    new_price = data.get("dailyPrice", item.daily_price)
    _validate_pricing(new_mode, new_price)
    new_min = data.get("minBorrowDays", item.min_borrow_days)
    new_max = data.get("maxBorrowDays", item.max_borrow_days)
    _validate_day_limits(new_min, new_max)

    if "title" in data and data["title"] is not None:
        item.title = data["title"].strip()
    if "description" in data and data["description"] is not None:
        item.description = data["description"].strip()
    if "category" in data and data["category"] is not None:
        item.category = data["category"]
    if "condition" in data and data["condition"] is not None:
        item.condition = data["condition"]
    if "lendingMode" in data and data["lendingMode"] is not None:
        item.lending_mode = data["lendingMode"]
    if "dailyPrice" in data and data["dailyPrice"] is not None:
        item.daily_price = 0.0 if item.lending_mode == "free" else data["dailyPrice"]
    if "deposit" in data and data["deposit"] is not None:
        item.deposit = data["deposit"]
    if "pickupLocation" in data and data["pickupLocation"] is not None:
        item.pickup_location = data["pickupLocation"].strip()
    if "images" in data and data["images"] is not None:
        item.images_json = json.dumps(_validate_images(data["images"]))
    if "isAvailable" in data and data["isAvailable"] is not None:
        item.is_available = data["isAvailable"]
    if "minBorrowDays" in data and data["minBorrowDays"] is not None:
        item.min_borrow_days = data["minBorrowDays"]
    if "maxBorrowDays" in data and data["maxBorrowDays"] is not None:
        item.max_borrow_days = data["maxBorrowDays"]
    if "guidelines" in data:
        item.guidelines = data["guidelines"].strip() if data["guidelines"] else None

    if item.lending_mode == "free":
        item.daily_price = 0.0

    db.add(item)
    db.commit()
    db.refresh(item)
    return item_out(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = _get_owned_item(item_id, current_user, db)

    open_loans = db.scalar(
        select(func.count(BorrowRequest.id)).where(
            BorrowRequest.item_id == item_id,
            BorrowRequest.status.in_(["pending", "approved", "active"]),
        )
    )
    if open_loans:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This listing has open borrow requests. Resolve or cancel them "
                "before deleting the listing."
            ),
        )

    db.delete(item)
    db.commit()
