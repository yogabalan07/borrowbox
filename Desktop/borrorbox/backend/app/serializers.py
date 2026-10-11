import json
from datetime import date, datetime, timezone

from .models import BorrowRequest, Conversation, Item, Message, Notification, Report, User


def _iso(value: datetime | date | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value.isoformat()


def user_preview(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "college": user.college,
        "department": user.department,
        "yearOfStudy": user.year_of_study,
        "avatarUrl": user.avatar_url or "",
        "rating": round(user.rating, 1),
        "reviewCount": user.review_count,
        "isVerified": user.is_verified,
    }


def user_out(user: User) -> dict:
    data = user_preview(user)
    data.update(
        {
            "email": user.email,
            "bio": user.bio or "",
            "phone": user.phone or "",
            "isAdmin": user.is_admin,
            "joinedDate": _iso(user.joined_date),
        }
    )
    return data


def item_images(item: Item) -> list[str]:
    try:
        images = json.loads(item.images_json or "[]")
        return images if isinstance(images, list) else []
    except (ValueError, TypeError):
        return []


def item_out(item: Item) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "condition": item.condition,
        "lendingMode": item.lending_mode,
        "dailyPrice": item.daily_price,
        "deposit": item.deposit,
        "pickupLocation": item.pickup_location,
        "images": item_images(item),
        "ownerId": item.owner_id,
        "owner": user_preview(item.owner) if item.owner else None,
        "isAvailable": item.is_available,
        "minBorrowDays": item.min_borrow_days,
        "maxBorrowDays": item.max_borrow_days,
        "guidelines": item.guidelines or "",
        "createdAt": _iso(item.created_at),
        "updatedAt": _iso(item.updated_at),
    }


def effective_request_status(request: BorrowRequest) -> str:
    if request.status == "active" and request.end_date < date.today():
        return "overdue"
    return request.status


def request_out(request: BorrowRequest) -> dict:
    total_days = max((request.end_date - request.start_date).days, 0)
    daily_price = request.daily_price or (request.item.daily_price if request.item else 0.0)
    return {
        "id": request.id,
        "itemId": request.item_id,
        "item": item_out(request.item) if request.item else None,
        "borrowerId": request.borrower_id,
        "borrower": user_preview(request.borrower) if request.borrower else None,
        "ownerId": request.owner_id,
        "owner": user_preview(request.owner) if request.owner else None,
        "startDate": _iso(request.start_date),
        "endDate": _iso(request.end_date),
        "totalDays": total_days,
        "dailyPrice": daily_price,
        "deposit": request.deposit,
        "estimatedTotal": round(daily_price * total_days, 2),
        "message": request.message,
        "status": effective_request_status(request),
        "pickupLocation": request.pickup_location,
        "handoverConfirmedAt": _iso(request.handover_confirmed_at),
        "returnedConfirmedAt": _iso(request.returned_confirmed_at),
        "createdAt": _iso(request.created_at),
        "updatedAt": _iso(request.updated_at),
    }


def message_out(message: Message) -> dict:
    return {
        "id": message.id,
        "conversationId": message.conversation_id,
        "senderId": message.sender_id,
        "text": message.text,
        "timestamp": _iso(message.timestamp),
        "isRead": message.is_read,
    }


def conversation_out(
    conversation: Conversation, current_user_id: str
) -> dict:
    other_id = (
        conversation.user2_id
        if conversation.user1_id == current_user_id
        else conversation.user1_id
    )
    other_user = None
    for participant in (conversation.user1, conversation.user2):
        if participant and participant.id == other_id:
            other_user = participant
            break

    messages = sorted(conversation.messages or [], key=lambda m: m.timestamp)
    last = messages[-1] if messages else None
    unread_count = sum(
        1 for m in messages if not m.is_read and m.sender_id != current_user_id
    )

    return {
        "id": conversation.id,
        "participantIds": [conversation.user1_id, conversation.user2_id],
        "otherParticipant": user_preview(other_user) if other_user else None,
        "itemId": conversation.item_id,
        "itemTitle": conversation.item_title,
        "lastMessage": (
            {
                "text": last.text,
                "timestamp": _iso(last.timestamp),
                "senderId": last.sender_id,
            }
            if last
            else None
        ),
        "unreadCount": unread_count,
        "updatedAt": _iso(conversation.updated_at),
    }


def notification_out(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "userId": notification.user_id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "link": notification.link,
        "isRead": notification.is_read,
        "createdAt": _iso(notification.created_at),
    }


def report_out(report: Report) -> dict:
    return {
        "id": report.id,
        "itemId": report.item_id,
        "itemTitle": report.item_title,
        "reason": report.reason,
        "reporterName": report.reporter_name,
        "reporterCollege": report.reporter_college,
        "reportedAt": _iso(report.reported_at),
        "status": report.status,
    }
