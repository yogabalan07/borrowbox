from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..models import Conversation, Item, Message, User
from ..notifications import create_notification
from ..schemas import MessageCreateIn
from ..serializers import conversation_out, message_out

router = APIRouter(tags=["messages"])


def _pair(user_a: str, user_b: str) -> tuple[str, str]:
    return (user_a, user_b) if user_a < user_b else (user_b, user_a)


def _load_conversation(conversation_id: str, db: Session) -> Conversation:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(joinedload(Conversation.user1), joinedload(Conversation.user2))
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )
    return conversation


def _ensure_conversation(
    db: Session,
    *,
    sender_id: str,
    recipient_id: str,
    item_id: str | None,
    item_title: str | None,
) -> Conversation:
    user_a, user_b = _pair(sender_id, recipient_id)

    candidates = db.scalars(
        select(Conversation)
        .where(Conversation.user1_id == user_a, Conversation.user2_id == user_b)
        .options(joinedload(Conversation.user1), joinedload(Conversation.user2))
    ).unique().all()

    for conversation in candidates:
        if item_id and conversation.item_id == item_id:
            return conversation
    if not item_id:
        for conversation in candidates:
            if conversation.item_id is None:
                return conversation

    conversation = Conversation(
        user1_id=user_a,
        user2_id=user_b,
        item_id=item_id,
        item_title=item_title,
    )
    db.add(conversation)
    db.flush()
    return conversation


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = db.scalars(
        select(Conversation)
        .where(
            or_(
                Conversation.user1_id == current_user.id,
                Conversation.user2_id == current_user.id,
            )
        )
        .options(
            joinedload(Conversation.user1),
            joinedload(Conversation.user2),
            joinedload(Conversation.messages),
        )
    ).unique().all()

    serialized = [conversation_out(c, current_user.id) for c in conversations]
    serialized.sort(key=lambda c: c["updatedAt"] or "", reverse=True)
    return serialized


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _load_conversation(conversation_id, db)
    if current_user.id not in (conversation.user1_id, conversation.user2_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation.",
        )

    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp.asc())
    ).all()

    changed = False
    for message in messages:
        if not message.is_read and message.sender_id != current_user.id:
            message.is_read = True
            changed = True
    if changed:
        db.commit()

    return [message_out(m) for m in messages]


@router.post("/messages", status_code=status.HTTP_201_CREATED)
def send_message(
    payload: MessageCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipient = db.get(User, payload.recipient_id)
    if recipient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found."
        )
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot message yourself.",
        )

    item_title = payload.item_title
    item_id = payload.item_id
    if item_id:
        item = db.get(Item, item_id)
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item not found."
            )
        item_title = item.title

    if payload.conversation_id:
        conversation = _load_conversation(payload.conversation_id, db)
        if current_user.id not in (conversation.user1_id, conversation.user2_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation.",
            )
        if item_id and not conversation.item_id:
            conversation.item_id = item_id
            conversation.item_title = item_title
    else:
        conversation = _ensure_conversation(
            db,
            sender_id=current_user.id,
            recipient_id=recipient.id,
            item_id=item_id,
            item_title=item_title,
        )

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        text=payload.text.strip(),
    )
    db.add(message)
    db.flush()
    conversation.updated_at = message.timestamp
    db.add(conversation)

    create_notification(
        db,
        user_id=recipient.id,
        title=f"New message from {current_user.name}",
        message=payload.text.strip()[:200],
        type="message",
        link="/messages",
    )

    db.commit()
    db.refresh(message)
    return {
        "message": message_out(message),
        "conversationId": conversation.id,
    }
