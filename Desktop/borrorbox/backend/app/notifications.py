from sqlalchemy.orm import Session

from .models import Notification


def create_notification(
    db: Session,
    *,
    user_id: str,
    title: str,
    message: str,
    type: str,
    link: str,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
    )
    db.add(notification)
    return notification
