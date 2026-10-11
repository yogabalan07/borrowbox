from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginIn, ProfileUpdateIn, RegisterIn
from ..security import create_access_token, hash_password, verify_password
from ..serializers import user_out

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        college=payload.college.strip(),
        department=payload.department.strip(),
        year_of_study=payload.yearOfStudy.strip(),
        phone=payload.phone.strip() if payload.phone else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user": user_out(user), "access_token": create_access_token(user.id)}


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return {"user": user_out(user), "access_token": create_access_token(user.id)}


@router.get("/me")
def read_me(current_user: User = Depends(get_current_user)):
    return user_out(current_user)


@router.patch("/me")
def update_me(
    payload: ProfileUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        current_user.name = data["name"].strip()
    if "college" in data and data["college"] is not None:
        current_user.college = data["college"].strip()
    if "department" in data and data["department"] is not None:
        current_user.department = data["department"].strip()
    if "yearOfStudy" in data and data["yearOfStudy"] is not None:
        current_user.year_of_study = data["yearOfStudy"].strip()
    if "bio" in data:
        current_user.bio = data["bio"].strip() if data["bio"] else None
    if "phone" in data:
        current_user.phone = data["phone"].strip() if data["phone"] else None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return user_out(current_user)
