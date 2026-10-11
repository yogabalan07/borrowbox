from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..models import BorrowRequest, Item, User
from ..notifications import create_notification
from ..schemas import RequestCreateIn, RequestStatusIn
from ..serializers import request_out

router = APIRouter(prefix="/requests", tags=["requests"])

OPEN_STATUSES = ("pending", "approved", "active", "overdue")


def _load_request(request_id: str, db: Session) -> BorrowRequest:
    request = db.scalar(
        select(BorrowRequest)
        .where(BorrowRequest.id == request_id)
        .options(
            joinedload(BorrowRequest.item).joinedload(Item.owner),
            joinedload(BorrowRequest.borrower),
            joinedload(BorrowRequest.owner),
        )
    )
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found."
        )
    return request


def _sorted_requests(requests: list[BorrowRequest]) -> list[BorrowRequest]:
    return sorted(requests, key=lambda r: r.created_at, reverse=True)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.scalar(select(Item).where(Item.id == payload.item_id))
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found."
        )
    if item.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot request your own listing.",
        )
    if not item.is_available:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This item is currently on loan and unavailable.",
        )
    if payload.end_date <= payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Return date must be after the start date.",
        )

    total_days = (payload.end_date - payload.start_date).days
    if total_days < item.min_borrow_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum borrow duration is {item.min_borrow_days} day(s).",
        )
    if total_days > item.max_borrow_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum borrow duration is {item.max_borrow_days} day(s).",
        )
    if payload.start_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date cannot be in the past.",
        )

    duplicate = db.scalar(
        select(BorrowRequest).where(
            BorrowRequest.item_id == item.id,
            BorrowRequest.borrower_id == current_user.id,
            BorrowRequest.status.in_(list(OPEN_STATUSES)),
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an open request for this item.",
        )

    request = BorrowRequest(
        item_id=item.id,
        borrower_id=current_user.id,
        owner_id=item.owner_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        message=payload.message.strip(),
        status="pending",
        daily_price=item.daily_price if item.lending_mode == "rent" else 0.0,
        deposit=item.deposit,
        pickup_location=item.pickup_location,
    )
    db.add(request)
    db.flush()

    create_notification(
        db,
        user_id=item.owner_id,
        title="New borrow request",
        message=(
            f"{current_user.name} requested to borrow \"{item.title}\" "
            f"from {payload.start_date.isoformat()} to {payload.end_date.isoformat()}."
        ),
        type="request",
        link=f"/requests/{request.id}",
    )

    db.commit()
    return request_out(_load_request(request.id, db))


def _my_requests_side(userId: str, db: Session) -> list[BorrowRequest]:
    requests = db.scalars(
        select(BorrowRequest)
        .where(BorrowRequest.borrower_id == userId)
        .options(
            joinedload(BorrowRequest.item).joinedload(Item.owner),
            joinedload(BorrowRequest.borrower),
            joinedload(BorrowRequest.owner),
        )
    ).unique().all()
    return _sorted_requests(list(requests))


@router.get("/borrowing")
def list_borrowing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return [request_out(r) for r in _my_requests_side(current_user.id, db)]


@router.get("/lending")
def list_lending(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    requests = db.scalars(
        select(BorrowRequest)
        .where(BorrowRequest.owner_id == current_user.id)
        .options(
            joinedload(BorrowRequest.item).joinedload(Item.owner),
            joinedload(BorrowRequest.borrower),
            joinedload(BorrowRequest.owner),
        )
    ).unique().all()
    return [request_out(r) for r in _sorted_requests(list(requests))]


@router.get("/{request_id}")
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = _load_request(request_id, db)
    if current_user.id not in (request.borrower_id, request.owner_id) and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this loan request.",
        )
    return request_out(request)


def _restore_item_availability(db: Session, item: Item) -> None:
    has_open = db.scalar(
        select(BorrowRequest.id).where(
            BorrowRequest.item_id == item.id,
            BorrowRequest.status.in_(["approved", "active"]),
        )
    )
    if not has_open:
        item.is_available = True


@router.patch("/{request_id}/status")
def update_request_status(
    request_id: str,
    payload: RequestStatusIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = _load_request(request_id, db)
    new_status = payload.status
    now = datetime.now(timezone.utc)
    item = request.item

    is_owner = current_user.id == request.owner_id
    is_borrower = current_user.id == request.borrower_id
    if not is_owner and not is_borrower:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner or borrower can update this request.",
        )

    current = request.status
    allowed = False

    if is_borrower and new_status == "cancelled":
        allowed = current == "pending"
    elif is_owner:
        if current == "pending" and new_status in ("approved", "rejected"):
            allowed = True
        elif current == "approved" and new_status == "active":
            allowed = True
        elif current in ("active", "overdue") and new_status == "returned":
            allowed = True

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot change loan status from '{current}' to '{new_status}' "
                "for your role."
            ),
        )

    request.status = new_status
    item_title = item.title if item else "your item"

    if new_status == "approved":
        if item:
            item.is_available = False
        create_notification(
            db,
            user_id=request.borrower_id,
            title="Request approved",
            message=(
                f"{current_user.name} approved your request for \"{item_title}\". "
                "Arrange the handover in messages."
            ),
            type="approval",
            link=f"/requests/{request.id}",
        )
    elif new_status == "rejected":
        if item:
            _restore_item_availability(db, item)
        create_notification(
            db,
            user_id=request.borrower_id,
            title="Request declined",
            message=f"{current_user.name} declined your request for \"{item_title}\".",
            type="approval",
            link=f"/requests/{request.id}",
        )
    elif new_status == "active":
        request.handover_confirmed_at = now
        create_notification(
            db,
            user_id=request.borrower_id,
            title="Item handed over",
            message=(
                f"{current_user.name} confirmed the handover of \"{item_title}\". "
                f"Please return it by {request.end_date.isoformat()}."
            ),
            type="system",
            link=f"/requests/{request.id}",
        )
    elif new_status == "returned":
        request.returned_confirmed_at = now
        if item:
            item.is_available = True
        create_notification(
            db,
            user_id=request.borrower_id,
            title="Item returned",
            message=(
                f"{current_user.name} confirmed the return of \"{item_title}\". "
                "Thanks for campus sharing!"
            ),
            type="return",
            link=f"/requests/{request.id}",
        )
    elif new_status == "cancelled":
        if item:
            _restore_item_availability(db, item)
        create_notification(
            db,
            user_id=request.owner_id,
            title="Request cancelled",
            message=(
                f"{current_user.name} cancelled the borrow request for \"{item_title}\"."
            ),
            type="request",
            link=f"/requests/{request.id}",
        )

    db.add(request)
    if item:
        db.add(item)
    db.commit()
    return request_out(_load_request(request.id, db))
