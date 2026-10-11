from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import require_admin
from ..models import BorrowRequest, Item, Report, User
from ..schemas import ResolveReportIn, VerifyUserIn
from ..serializers import report_out, request_out, user_out

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db)):
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_listings = db.scalar(select(func.count(Item.id))) or 0
    active_loans = (
        db.scalar(
            select(func.count(BorrowRequest.id)).where(
                BorrowRequest.status.in_(["active", "overdue"])
            )
        )
        or 0
    )
    completed_loans = (
        db.scalar(
            select(func.count(BorrowRequest.id)).where(BorrowRequest.status == "returned")
        )
        or 0
    )
    pending_moderations = (
        db.scalar(
            select(func.count(Report.id)).where(Report.status == "pending")
        )
        or 0
    )

    completed = db.scalars(
        select(BorrowRequest).where(BorrowRequest.status == "returned")
    ).all()
    total_savings = sum(
        (r.daily_price * max((r.end_date - r.start_date).days, 0)) for r in completed
    )

    return {
        "totalUsers": total_users,
        "totalListings": total_listings,
        "activeLoans": active_loans,
        "completedLoans": completed_loans,
        "pendingModerations": pending_moderations,
        "totalSavingsGenerated": round(total_savings, 2),
    }


@router.get("/users")
def admin_users(db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.email)).all()
    return [user_out(u) for u in users]


@router.patch("/users/{user_id}/verify")
def set_user_verification(
    user_id: str,
    payload: VerifyUserIn,
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    user.is_verified = payload.is_verified
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.get("/reports")
def admin_reports(db: Session = Depends(get_db)):
    reports = db.scalars(select(Report).order_by(Report.reported_at.desc())).all()
    return [report_out(r) for r in reports]


@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: str,
    payload: ResolveReportIn,
    db: Session = Depends(get_db),
):
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found."
        )
    report.status = "resolved" if payload.action == "resolve" else "dismissed"
    db.add(report)
    db.commit()
    return {"success": True}


@router.get("/loans")
def admin_loans(db: Session = Depends(get_db)):
    loans = db.scalars(
        select(BorrowRequest)
        .options(
            joinedload(BorrowRequest.item).joinedload(Item.owner),
            joinedload(BorrowRequest.borrower),
            joinedload(BorrowRequest.owner),
        )
        .order_by(BorrowRequest.created_at.desc())
    ).unique().all()
    return [request_out(loan) for loan in loans]
