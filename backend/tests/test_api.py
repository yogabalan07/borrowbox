from datetime import date, timedelta

from conftest import auth_header, make_admin, make_item, register_user

from app.database import SessionLocal
from app.models import User


class TestHealth:
    def test_health(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestAuth:
    def test_register_returns_token_and_user(self, client):
        user, token = register_user(client, "maya@university.edu")
        assert user["email"] == "maya@university.edu"
        assert user["isAdmin"] is False
        assert token

        me = client.get("/api/v1/auth/me", headers=auth_header(token))
        assert me.status_code == 200
        assert me.json()["id"] == user["id"]

    def test_register_duplicate_email_rejected(self, client):
        register_user(client, "dup@university.edu")
        response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Copy",
                "email": "dup@university.edu",
                "password": "secret123",
                "college": "X",
                "department": "Y",
                "yearOfStudy": "Freshman (1st Year)",
            },
        )
        assert response.status_code == 400

    def test_login_success_and_failure(self, client):
        register_user(client, "login@university.edu", password="password1")
        ok = client.post(
            "/api/v1/auth/login",
            json={"email": "login@university.edu", "password": "password1"},
        )
        assert ok.status_code == 200
        assert ok.json()["access_token"]

        bad = client.post(
            "/api/v1/auth/login",
            json={"email": "login@university.edu", "password": "wrongpass"},
        )
        assert bad.status_code == 401

    def test_me_requires_auth(self, client):
        assert client.get("/api/v1/auth/me").status_code == 401

    def test_update_profile(self, client):
        _, token = register_user(client, "profile@university.edu")
        response = client.patch(
            "/api/v1/auth/me",
            json={"bio": "Junior CS student", "phone": "+1 555 0100", "department": "EE"},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        body = response.json()
        assert body["bio"] == "Junior CS student"
        assert body["department"] == "EE"

    def test_cannot_escalate_admin_via_profile_update(self, client):
        _, token = register_user(client, "sneaky@university.edu")
        response = client.patch(
            "/api/v1/auth/me",
            json={"isAdmin": True, "isVerified": True},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["isAdmin"] is False
        assert response.json()["isVerified"] is False


class TestItems:
    def test_item_crud_and_ownership(self, client):
        owner, owner_token = register_user(client, "owner@university.edu")
        _, other_token = register_user(client, "other@university.edu")

        item = make_item(client, owner_token, title="Canon EOS Camera")
        assert item["ownerId"] == owner["id"]
        assert item["isAvailable"] is True

        fetched = client.get(f"/api/v1/items/{item['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["title"] == "Canon EOS Camera"

        forbidden = client.patch(
            f"/api/v1/items/{item['id']}",
            json={"title": "Hacked"},
            headers=auth_header(other_token),
        )
        assert forbidden.status_code == 403

        updated = client.patch(
            f"/api/v1/items/{item['id']}",
            json={"title": "Canon EOS Camera Kit"},
            headers=auth_header(owner_token),
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Canon EOS Camera Kit"

        delete_forbidden = client.delete(
            f"/api/v1/items/{item['id']}", headers=auth_header(other_token)
        )
        assert delete_forbidden.status_code == 403

        deleted = client.delete(
            f"/api/v1/items/{item['id']}", headers=auth_header(owner_token)
        )
        assert deleted.status_code == 204
        assert client.get(f"/api/v1/items/{item['id']}").status_code == 404

    def test_create_item_requires_auth(self, client):
        response = client.post(
            "/api/v1/items",
            json={
                "title": "No Auth Item",
                "description": "Should fail",
                "category": "sports",
                "condition": "good",
                "lendingMode": "free",
                "dailyPrice": 0,
                "deposit": 0,
                "pickupLocation": "Gym",
                "images": [],
                "isAvailable": True,
                "minBorrowDays": 1,
                "maxBorrowDays": 7,
            },
        )
        assert response.status_code == 401

    def test_free_item_forces_zero_price(self, client):
        _, token = register_user(client, "free@university.edu")
        item = make_item(client, token, lendingMode="free", dailyPrice=99)
        assert item["dailyPrice"] == 0

    def test_rent_item_requires_positive_price(self, client):
        _, token = register_user(client, "rent@university.edu")
        response = client.post(
            "/api/v1/items",
            json={
                "title": "Broken Rental Listing",
                "description": "Zero price rent",
                "category": "creative",
                "condition": "good",
                "lendingMode": "rent",
                "dailyPrice": 0,
                "deposit": 0,
                "pickupLocation": "Dorm",
                "images": [],
                "isAvailable": True,
                "minBorrowDays": 1,
                "maxBorrowDays": 7,
            },
            headers=auth_header(token),
        )
        assert response.status_code == 400

    def test_list_items_filters(self, client):
        _, token = register_user(client, "filters@university.edu")
        make_item(client, token, title="Calculus Textbook", category="textbooks")
        make_item(
            client,
            token,
            title="Sony A7 Camera",
            description="Full-frame mirrorless camera body with two batteries.",
            category="creative",
            lendingMode="rent",
            dailyPrice=12,
        )

        all_items = client.get("/api/v1/items").json()
        assert len(all_items) == 2

        textbooks = client.get("/api/v1/items?category=textbooks").json()
        assert len(textbooks) == 1

        rented = client.get("/api/v1/items?lending_mode=rent").json()
        assert len(rented) == 1
        assert rented[0]["dailyPrice"] == 12

        searched = client.get("/api/v1/items?search=calculator").json()
        assert len(searched) == 1

    def test_user_items_listing(self, client):
        owner, token = register_user(client, "mine@university.edu")
        _, other_token = register_user(client, "other2@university.edu")
        make_item(client, token, title="Item A")
        make_item(client, other_token, title="Item B")

        mine = client.get(f"/api/v1/users/{owner['id']}/items").json()
        assert len(mine) == 1
        assert mine[0]["title"] == "Item A"


class TestBorrowRequests:
    def _setup(self, client):
        owner, owner_token = register_user(client, "lender@university.edu")
        borrower, borrower_token = register_user(client, "borrower@university.edu")
        item = make_item(client, owner_token, title="DJI Drone", maxBorrowDays=10)
        return owner, owner_token, borrower, borrower_token, item

    def test_full_lifecycle(self, client):
        owner, owner_token, borrower, borrower_token, item = self._setup(client)

        start = (date.today() + timedelta(days=1)).isoformat()
        end = (date.today() + timedelta(days=3)).isoformat()

        created = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": start,
                "end_date": end,
                "message": "Need it for a film project.",
            },
            headers=auth_header(borrower_token),
        )
        assert created.status_code == 201, created.text
        request = created.json()
        assert request["status"] == "pending"
        assert request["totalDays"] == 2
        assert request["estimatedTotal"] == 0
        assert request["borrowerId"] == borrower["id"]
        assert request["ownerId"] == owner["id"]

        borrowing = client.get(
            "/api/v1/requests/borrowing", headers=auth_header(borrower_token)
        ).json()
        assert len(borrowing) == 1
        lending = client.get(
            "/api/v1/requests/lending", headers=auth_header(owner_token)
        ).json()
        assert len(lending) == 1

        approved = client.patch(
            f"/api/v1/requests/{request['id']}/status",
            json={"status": "approved"},
            headers=auth_header(owner_token),
        )
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is False

        active = client.patch(
            f"/api/v1/requests/{request['id']}/status",
            json={"status": "active"},
            headers=auth_header(owner_token),
        )
        assert active.status_code == 200
        assert active.json()["handoverConfirmedAt"] is not None

        returned = client.patch(
            f"/api/v1/requests/{request['id']}/status",
            json={"status": "returned"},
            headers=auth_header(owner_token),
        )
        assert returned.status_code == 200
        assert returned.json()["returnedConfirmedAt"] is not None
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is True

        too_late = client.patch(
            f"/api/v1/requests/{request['id']}/status",
            json={"status": "approved"},
            headers=auth_header(owner_token),
        )
        assert too_late.status_code == 409

    def test_cannot_request_own_item(self, client):
        _, owner_token = register_user(client, "selfowner@university.edu")
        item = make_item(client, owner_token)
        response = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "self",
            },
            headers=auth_header(owner_token),
        )
        assert response.status_code == 403

    def test_duration_limits_enforced(self, client):
        _, owner_token = register_user(client, "limits-owner@university.edu")
        _, borrower_token = register_user(client, "limits-borrower@university.edu")
        item = make_item(client, owner_token, minBorrowDays=2, maxBorrowDays=5)

        response = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "too short",
            },
            headers=auth_header(borrower_token),
        )
        assert response.status_code == 400

    def test_borrower_can_cancel_pending(self, client):
        _, owner_token = register_user(client, "cancel-owner@university.edu")
        _, borrower_token = register_user(client, "cancel-borrower@university.edu")
        item = make_item(client, owner_token)
        created = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "maybe",
            },
            headers=auth_header(borrower_token),
        ).json()

        cancelled = client.patch(
            f"/api/v1/requests/{created['id']}/status",
            json={"status": "cancelled"},
            headers=auth_header(borrower_token),
        )
        assert cancelled.status_code == 200
        assert cancelled.json()["status"] == "cancelled"

    def test_borrower_cannot_approve(self, client):
        _, owner_token = register_user(client, "approve-owner@university.edu")
        _, borrower_token = register_user(client, "approve-borrower@university.edu")
        item = make_item(client, owner_token)
        created = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "please",
            },
            headers=auth_header(borrower_token),
        ).json()

        response = client.patch(
            f"/api/v1/requests/{created['id']}/status",
            json={"status": "approved"},
            headers=auth_header(borrower_token),
        )
        assert response.status_code == 409

    def test_third_party_cannot_view_request(self, client):
        _, owner_token = register_user(client, "view-owner@university.edu")
        _, borrower_token = register_user(client, "view-borrower@university.edu")
        _, stranger_token = register_user(client, "stranger@university.edu")
        item = make_item(client, owner_token)
        created = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "private",
            },
            headers=auth_header(borrower_token),
        ).json()

        response = client.get(
            f"/api/v1/requests/{created['id']}", headers=auth_header(stranger_token)
        )
        assert response.status_code == 403

    def test_paid_rental_estimated_total(self, client):
        _, owner_token = register_user(client, "paid-owner@university.edu")
        _, borrower_token = register_user(client, "paid-borrower@university.edu")
        item = make_item(
            client,
            owner_token,
            lendingMode="rent",
            dailyPrice=10,
            deposit=50,
            category="creative",
        )
        created = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=4)).isoformat(),
                "message": "weekend shoot",
            },
            headers=auth_header(borrower_token),
        ).json()
        assert created["dailyPrice"] == 10
        assert created["estimatedTotal"] == 30
        assert created["deposit"] == 50


class TestMessages:
    def test_conversation_flow(self, client):
        owner, owner_token = register_user(client, "chat-owner@university.edu")
        borrower, borrower_token = register_user(client, "chat-borrower@university.edu")
        item = make_item(client, owner_token, title="4-Person Tent")

        sent = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": owner["id"],
                "text": "Hi! Is the tent available this weekend?",
                "item_id": item["id"],
            },
            headers=auth_header(borrower_token),
        )
        assert sent.status_code == 201, sent.text
        body = sent.json()
        conversation_id = body["conversationId"]
        assert body["message"]["text"].startswith("Hi!")

        owner_convs = client.get(
            "/api/v1/conversations", headers=auth_header(owner_token)
        ).json()
        assert len(owner_convs) == 1
        assert owner_convs[0]["otherParticipant"]["id"] == borrower["id"]
        assert owner_convs[0]["itemTitle"] == "4-Person Tent"
        assert owner_convs[0]["unreadCount"] == 1

        borrower_convs = client.get(
            "/api/v1/conversations", headers=auth_header(borrower_token)
        ).json()
        assert borrower_convs[0]["otherParticipant"]["id"] == owner["id"]

        messages = client.get(
            f"/api/v1/conversations/{conversation_id}/messages",
            headers=auth_header(owner_token),
        ).json()
        assert len(messages) == 1

        owner_convs = client.get(
            "/api/v1/conversations", headers=auth_header(owner_token)
        ).json()
        assert owner_convs[0]["unreadCount"] == 0

        reply = client.post(
            "/api/v1/messages",
            json={
                "conversation_id": conversation_id,
                "recipient_id": borrower["id"],
                "text": "Yes, works!",
            },
            headers=auth_header(owner_token),
        )
        assert reply.status_code == 201

        messages = client.get(
            f"/api/v1/conversations/{conversation_id}/messages",
            headers=auth_header(borrower_token),
        ).json()
        assert len(messages) == 2

    def test_second_message_reuses_conversation(self, client):
        a, a_token = register_user(client, "reuse-a@university.edu")
        b, b_token = register_user(client, "reuse-b@university.edu")

        first = client.post(
            "/api/v1/messages",
            json={"recipient_id": b["id"], "text": "hello"},
            headers=auth_header(a_token),
        ).json()
        second = client.post(
            "/api/v1/messages",
            json={"recipient_id": b["id"], "text": "hello again"},
            headers=auth_header(a_token),
        ).json()
        assert first["conversationId"] == second["conversationId"]

    def test_stranger_cannot_read_conversation(self, client):
        a, a_token = register_user(client, "priv-a@university.edu")
        b, b_token = register_user(client, "priv-b@university.edu")
        _, stranger_token = register_user(client, "priv-stranger@university.edu")

        sent = client.post(
            "/api/v1/messages",
            json={"recipient_id": b["id"], "text": "private note"},
            headers=auth_header(a_token),
        ).json()

        response = client.get(
            f"/api/v1/conversations/{sent['conversationId']}/messages",
            headers=auth_header(stranger_token),
        )
        assert response.status_code == 403


class TestNotifications:
    def test_request_creates_owner_notification(self, client):
        owner, owner_token = register_user(client, "notif-owner@university.edu")
        _, borrower_token = register_user(client, "notif-borrower@university.edu")
        item = make_item(client, owner_token)

        client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "hi",
            },
            headers=auth_header(borrower_token),
        )

        notifications = client.get(
            "/api/v1/notifications", headers=auth_header(owner_token)
        ).json()
        assert len(notifications) == 1
        assert notifications[0]["type"] == "request"
        assert notifications[0]["link"].startswith("/requests/")

        read = client.patch(
            f"/api/v1/notifications/{notifications[0]['id']}/read",
            headers=auth_header(owner_token),
        )
        assert read.status_code == 200

        all_read = client.post(
            "/api/v1/notifications/read-all", headers=auth_header(owner_token)
        )
        assert all_read.status_code == 200

        fresh = client.get(
            "/api/v1/notifications", headers=auth_header(owner_token)
        ).json()
        assert all(n["isRead"] for n in fresh)

    def test_cannot_read_others_notifications(self, client):
        owner, owner_token = register_user(client, "notif2-owner@university.edu")
        _, borrower_token = register_user(client, "notif2-borrower@university.edu")
        item = make_item(client, owner_token)
        client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "hi",
            },
            headers=auth_header(borrower_token),
        )
        notifications = client.get(
            "/api/v1/notifications", headers=auth_header(owner_token)
        ).json()
        response = client.patch(
            f"/api/v1/notifications/{notifications[0]['id']}/read",
            headers=auth_header(borrower_token),
        )
        assert response.status_code == 404


class TestAdmin:
    def _make_admin_user(self, client, email):
        user, token = register_user(client, email)
        with SessionLocal() as db:
            make_admin(db, user["id"])
        me = client.get("/api/v1/auth/me", headers=auth_header(token)).json()
        assert me["isAdmin"] is True
        return me, token

    def test_admin_endpoints_require_admin(self, client):
        _, token = register_user(client, "not-admin@university.edu")
        for path in (
            "/api/v1/admin/stats",
            "/api/v1/admin/users",
            "/api/v1/admin/reports",
            "/api/v1/admin/loans",
        ):
            assert client.get(path, headers=auth_header(token)).status_code == 403
        assert client.get("/api/v1/admin/stats").status_code == 401

    def test_admin_stats_users_and_verify(self, client):
        admin_user, admin_token = self._make_admin_user(client, "admin@university.edu")
        member, member_token = register_user(client, "member@university.edu")
        make_item(client, member_token)

        stats = client.get(
            "/api/v1/admin/stats", headers=auth_header(admin_token)
        ).json()
        assert stats["totalUsers"] == 2
        assert stats["totalListings"] == 1

        users = client.get("/api/v1/admin/users", headers=auth_header(admin_token)).json()
        assert len(users) == 2

        verified = client.patch(
            f"/api/v1/admin/users/{member['id']}/verify",
            json={"is_verified": True},
            headers=auth_header(admin_token),
        )
        assert verified.status_code == 200
        assert verified.json()["isVerified"] is True

    def test_admin_reports_and_loans(self, client):
        admin_user, admin_token = self._make_admin_user(client, "admin2@university.edu")
        owner, owner_token = register_user(client, "r-owner@university.edu")
        _, borrower_token = register_user(client, "r-borrower@university.edu")
        item = make_item(client, owner_token)

        from app.database import SessionLocal
        from app.models import Report

        with SessionLocal() as db:
            report = Report(
                item_id=item["id"],
                item_title=item["title"],
                reason="Misleading condition description",
                reporter_id=None,
                reporter_name="Concerned Student",
                reporter_college="State University",
            )
            db.add(report)
            db.commit()
            report_id = report.id

        reports = client.get(
            "/api/v1/admin/reports", headers=auth_header(admin_token)
        ).json()
        assert len(reports) == 1
        assert reports[0]["status"] == "pending"

        resolved = client.post(
            f"/api/v1/admin/reports/{report_id}/resolve",
            json={"action": "resolve"},
            headers=auth_header(admin_token),
        )
        assert resolved.status_code == 200

        reports = client.get(
            "/api/v1/admin/reports", headers=auth_header(admin_token)
        ).json()
        assert reports[0]["status"] == "resolved"

        client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": (date.today() + timedelta(days=1)).isoformat(),
                "end_date": (date.today() + timedelta(days=2)).isoformat(),
                "message": "loan",
            },
            headers=auth_header(borrower_token),
        )
        loans = client.get("/api/v1/admin/loans", headers=auth_header(admin_token)).json()
        assert len(loans) == 1
