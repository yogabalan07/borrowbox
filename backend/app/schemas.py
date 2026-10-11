from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Category = Literal[
    "textbooks", "electronics", "lab_gear", "creative", "outdoors", "sports", "miscellaneous"
]
Condition = Literal["like_new", "good", "fair"]
LendingMode = Literal["free", "rent"]
RequestStatus = Literal[
    "pending", "approved", "rejected", "active", "overdue", "returned", "cancelled"
]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    college: str = Field(default="", max_length=255)
    department: str = Field(default="", max_length=255)
    yearOfStudy: str = Field(default="", max_length=120, alias="yearOfStudy")
    phone: str | None = Field(default=None, max_length=60)

    model_config = {"populate_by_name": True}


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    college: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    yearOfStudy: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=60)


class ItemCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    category: Category
    condition: Condition
    lendingMode: LendingMode = "free"
    dailyPrice: float = Field(default=0, ge=0, le=10_000)
    deposit: float = Field(default=0, ge=0, le=100_000)
    pickupLocation: str = Field(min_length=1, max_length=255)
    images: list[str] = Field(default_factory=list)
    isAvailable: bool = True
    minBorrowDays: int = Field(default=1, ge=1, le=90)
    maxBorrowDays: int = Field(default=14, ge=1, le=365)
    guidelines: str | None = Field(default=None, max_length=4000)

    model_config = {"populate_by_name": True}


class ItemUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=3)
    category: Category | None = None
    condition: Condition | None = None
    lendingMode: LendingMode | None = None
    dailyPrice: float | None = Field(default=None, ge=0, le=10_000)
    deposit: float | None = Field(default=None, ge=0, le=100_000)
    pickupLocation: str | None = Field(default=None, min_length=1, max_length=255)
    images: list[str] | None = None
    isAvailable: bool | None = None
    minBorrowDays: int | None = Field(default=None, ge=1, le=90)
    maxBorrowDays: int | None = Field(default=None, ge=1, le=365)
    guidelines: str | None = Field(default=None, max_length=4000)

    model_config = {"populate_by_name": True}


class RequestCreateIn(BaseModel):
    item_id: str
    start_date: date
    end_date: date
    message: str = Field(default="", max_length=2000)


class RequestStatusIn(BaseModel):
    status: RequestStatus


class MessageCreateIn(BaseModel):
    conversation_id: str | None = None
    recipient_id: str
    text: str = Field(min_length=1, max_length=4000)
    item_id: str | None = None
    item_title: str | None = None


class VerifyUserIn(BaseModel):
    is_verified: bool


class ResolveReportIn(BaseModel):
    action: Literal["resolve", "dismiss"]
