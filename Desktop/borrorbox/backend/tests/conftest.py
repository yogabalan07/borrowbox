import os
import tempfile
from pathlib import Path

import pytest

_TMP_DIR = tempfile.mkdtemp(prefix="borrowbox-tests-")
os.environ["BORROWBOX_DATABASE_URL"] = f"sqlite:///{Path(_TMP_DIR) / 'test.db'}"
os.environ["BORROWBOX_SECRET_KEY"] = "test-secret-key-for-automated-tests-only"

from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.create_all(bind=engine)
    yield
    with SessionLocal() as db:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()


def register_user(client, email, password="secret123", **overrides):
    payload = {
        "name": overrides.pop("name", "Test Student"),
        "email": email,
        "password": password,
        "college": overrides.pop("college", "State University"),
        "department": overrides.pop("department", "Computer Science"),
        "yearOfStudy": overrides.pop("yearOfStudy", "Junior (3rd Year)"),
        "phone": overrides.pop("phone", None),
    }
    payload.update(overrides)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    return data["user"], data["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def make_item(client, token, **overrides):
    payload = {
        "title": overrides.pop("title", "TI-84 Plus CE Calculator"),
        "description": overrides.pop(
            "description", "Graphing calculator with charging cable, great condition."
        ),
        "category": overrides.pop("category", "textbooks"),
        "condition": overrides.pop("condition", "good"),
        "lendingMode": overrides.pop("lendingMode", "free"),
        "dailyPrice": overrides.pop("dailyPrice", 0),
        "deposit": overrides.pop("deposit", 0),
        "pickupLocation": overrides.pop("pickupLocation", "Green Library East Desk"),
        "images": overrides.pop("images", []),
        "isAvailable": overrides.pop("isAvailable", True),
        "minBorrowDays": overrides.pop("minBorrowDays", 1),
        "maxBorrowDays": overrides.pop("maxBorrowDays", 14),
        "guidelines": overrides.pop("guidelines", None),
    }
    payload.update(overrides)
    response = client.post("/api/v1/items", json=payload, headers=auth_header(token))
    assert response.status_code == 201, response.text
    return response.json()


def make_admin(db, user_id):
    user = db.get(models.User, user_id)
    user.is_admin = True
    user.is_verified = True
    db.add(user)
    db.commit()
