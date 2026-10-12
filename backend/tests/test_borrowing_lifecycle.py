from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

from conftest import auth_header, make_admin, make_item, register_user

from app.database import SessionLocal
from app.models import BorrowRequest


def _dates(offset_start=1, offset_end=4):
    return (
        (date.today() + timedelta(days=offset_start)).isoformat(),
        (date.today() + timedelta(days=offset_end)).isoformat(),
    )


def _create_request(client, token, item_id, start, end, message="Need it please."):
    return client.post(
        "/api/v1/requests",
        json={
            "item_id": item_id,
            "start_date": start,
            "end_date": end,
            "message": message,
        },
        headers=auth_header(token),
    )


def _approve(client, token, request_id):
    return client.patch(
        f"/api/v1/requests/{request_id}/status",
        json={"status": "approved"},
        headers=auth_header(token),
    )


def _set_status(client, token, request_id, status_value):
    return client.patch(
        f"/api/v1/requests/{request_id}/status",
        json={"status": status_value},
        headers=auth_header(token),
    )


class TestRequestCreation:
    def _parties(self, client):
        owner, owner_token = register_user(client, "lifecycle-owner@university.edu")
        borrower, borrower_token = register_user(client, "lifecycle-borrower@university.edu")
        item = make_item(client, owner_token, title="Orbit Projector", maxBorrowDays=30)
        return owner, owner_token, borrower, borrower_token, item

    def test_valid_request_created_pending(self, client):
        _, _, borrower, borrower_token, item = self._parties(client)
        start, end = _dates()
        response = _create_request(client, borrower_token, item["id"], start, end)
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["status"] == "pending"
        assert body["borrowerId"] == borrower["id"]

    def test_request_requires_authentication(self, client):
        _, owner_token, _, _, item = self._parties(client)
        start, end = _dates()
        response = client.post(
            "/api/v1/requests",
            json={
                "item_id": item["id"],
                "start_date": start,
                "end_date": end,
                "message": "no auth",
            },
        )
        assert response.status_code == 401

    def test_cannot_request_own_item(self, client):
        _, owner_token, _, _, item = self._parties(client)
        start, end = _dates()
        response = _create_request(client, owner_token, item["id"], start, end)
        assert response.status_code == 403

    def test_request_missing_item_is_404(self, client):
        _, _, _, borrower_token, _ = self._parties(client)
        start, end = _dates()
        response = _create_request(client, borrower_token, "does-not-exist", start, end)
        assert response.status_code == 404

    def test_request_paused_item_is_rejected(self, client):
        _, owner_token, _, borrower_token, item = self._parties(client)
        paused = make_item(client, owner_token, title="Paused Drill", isAvailable=False)
        start, end = _dates()
        response = _create_request(client, borrower_token, paused["id"], start, end)
        assert response.status_code == 409

    def test_invalid_date_range_rejected(self, client):
        _, _, _, borrower_token, item = self._parties(client)
        start, end = _dates()
        response = _create_request(client, borrower_token, item["id"], end, start)
        assert response.status_code == 400

    def test_range_exceeding_max_duration_rejected(self, client):
        _, owner_token, _, borrower_token, _ = self._parties(client)
        item = make_item(client, owner_token, title="Short Loan", minBorrowDays=1, maxBorrowDays=2)
        start, end = _dates(1, 10)
        response = _create_request(client, borrower_token, item["id"], start, end)
        assert response.status_code == 400

    def test_duplicate_open_request_rejected(self, client):
        _, _, _, borrower_token, item = self._parties(client)
        start, end = _dates()
        assert _create_request(client, borrower_token, item["id"], start, end).status_code == 201
        second = _create_request(client, borrower_token, item["id"], start, end)
        assert second.status_code == 409

    def test_overlap_prevents_approval_of_second_booking(self, client):
        owner, owner_token, _, borrower_token, item = self._parties(client)
        _, other_token = register_user(client, "overlap-other@university.edu")
        start, end = _dates()

        first = _create_request(client, borrower_token, item["id"], start, end).json()
        # A second, overlapping request from another borrower may be created
        # while both are pending (pending bookings do not block), but only one
        # may be approved.
        second = _create_request(client, other_token, item["id"], start, end)
        assert second.status_code == 201
        second = second.json()

        assert _approve(client, owner_token, first["id"]).status_code == 200
        conflict = _approve(client, owner_token, second["id"])
        assert conflict.status_code == 409

    def test_non_overlapping_bookings_can_coexist(self, client):
        owner, owner_token, _, borrower_token, item = self._parties(client)
        _, other_token = register_user(client, "coexist-other@university.edu")
        early_start, early_end = _dates(1, 3)
        late_start, late_end = _dates(5, 8)

        first = _create_request(client, borrower_token, item["id"], early_start, early_end).json()
        second = _create_request(client, other_token, item["id"], late_start, late_end).json()

        assert _approve(client, owner_token, first["id"]).status_code == 200
        assert _approve(client, owner_token, second["id"]).status_code == 200

    def test_adjacent_intervals_do_not_overlap(self, client):
        owner, owner_token, _, borrower_token, item = self._parties(client)
        _, other_token = register_user(client, "adjacent-other@university.edu")
        first_start, first_end = _dates(1, 3)
        second_start, second_end = _dates(3, 6)  # starts the day the first ends

        first = _create_request(client, borrower_token, item["id"], first_start, first_end).json()
        second = _create_request(client, other_token, item["id"], second_start, second_end).json()

        assert _approve(client, owner_token, first["id"]).status_code == 200
        assert _approve(client, owner_token, second["id"]).status_code == 200

    def test_overlap_rejected_at_creation_after_approval(self, client):
        owner, owner_token, _, borrower_token, item = self._parties(client)
        _, other_token = register_user(client, "overlap-after@university.edu")
        start, end = _dates()

        first = _create_request(client, borrower_token, item["id"], start, end).json()
        assert _approve(client, owner_token, first["id"]).status_code == 200

        overlap = _create_request(client, other_token, item["id"], start, end)
        assert overlap.status_code == 409


class TestApprovalDecisions:
    def _pending(self, client):
        owner, owner_token = register_user(client, "decision-owner@university.edu")
        _, borrower_token = register_user(client, "decision-borrower@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=30)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()
        return owner, owner_token, borrower_token, item, request

    def test_owner_approves_request(self, client):
        _, owner_token, _, item, request = self._pending(client)
        response = _approve(client, owner_token, request["id"])
        assert response.status_code == 200
        assert response.json()["status"] == "approved"
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is False

    def test_owner_rejects_request(self, client):
        _, owner_token, _, item, request = self._pending(client)
        response = _set_status(client, owner_token, request["id"], "rejected")
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is True

    def test_borrower_cannot_approve(self, client):
        _, _, borrower_token, _, request = self._pending(client)
        assert _approve(client, borrower_token, request["id"]).status_code == 409

    def test_stranger_cannot_decide(self, client):
        _, _, _, _, request = self._pending(client)
        _, stranger_token = register_user(client, "decision-stranger@university.edu")
        assert _approve(client, stranger_token, request["id"]).status_code == 403

    def test_cannot_activate_unapproved_request(self, client):
        _, owner_token, _, _, request = self._pending(client)
        response = _set_status(client, owner_token, request["id"], "active")
        assert response.status_code == 409

    def test_cannot_return_before_handover(self, client):
        _, owner_token, _, _, request = self._pending(client)
        response = _set_status(client, owner_token, request["id"], "returned")
        assert response.status_code == 409

    def test_double_approval_prevented(self, client):
        owner, owner_token, borrower_token, item, request = self._pending(client)
        assert _approve(client, owner_token, request["id"]).status_code == 200
        assert _approve(client, owner_token, request["id"]).status_code == 409


class TestReturnWorkflow:
    def _active_loan(self, client):
        owner, owner_token = register_user(client, "return-owner@university.edu")
        _, borrower_token = register_user(client, "return-borrower@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=30)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()
        _approve(client, owner_token, request["id"])
        _set_status(client, owner_token, request["id"], "active")
        return owner, owner_token, borrower_token, item, request

    def test_borrower_reports_return_then_owner_confirms(self, client):
        _, owner_token, borrower_token, item, request = self._active_loan(client)

        reported = _set_status(client, borrower_token, request["id"], "return_pending")
        assert reported.status_code == 200
        assert reported.json()["status"] == "return_pending"

        # Item is still out until the owner confirms.
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is False

        confirmed = _set_status(client, owner_token, request["id"], "returned")
        assert confirmed.status_code == 200
        assert confirmed.json()["status"] == "returned"
        assert confirmed.json()["returnedConfirmedAt"] is not None
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is True

    def test_owner_can_return_directly_after_handover(self, client):
        _, owner_token, _, item, request = self._active_loan(client)
        response = _set_status(client, owner_token, request["id"], "returned")
        assert response.status_code == 200
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is True

    def test_owner_can_revert_reported_return_to_active(self, client):
        _, owner_token, borrower_token, item, request = self._active_loan(client)
        assert _set_status(client, borrower_token, request["id"], "return_pending").status_code == 200
        reverted = _set_status(client, owner_token, request["id"], "active")
        assert reverted.status_code == 200
        assert reverted.json()["status"] == "active"
        assert client.get(f"/api/v1/items/{item['id']}").json()["isAvailable"] is False

    def test_borrower_cannot_report_return_before_handover(self, client):
        owner, owner_token = register_user(client, "early-owner@university.edu")
        _, borrower_token = register_user(client, "early-borrower@university.edu")
        item = make_item(client, owner_token)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()
        response = _set_status(client, borrower_token, request["id"], "return_pending")
        assert response.status_code == 409

    def test_cannot_return_twice(self, client):
        _, owner_token, _, _, request = self._active_loan(client)
        assert _set_status(client, owner_token, request["id"], "returned").status_code == 200
        assert _set_status(client, owner_token, request["id"], "returned").status_code == 409


class TestDashboardsAndHistory:
    def test_borrowing_and_lending_reflect_states(self, client):
        owner, owner_token = register_user(client, "dash-owner@university.edu")
        borrower, borrower_token = register_user(client, "dash-borrower@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=30)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()

        borrowing = client.get(
            "/api/v1/requests/borrowing", headers=auth_header(borrower_token)
        ).json()
        assert len(borrowing) == 1
        assert borrowing[0]["id"] == request["id"]

        lending = client.get(
            "/api/v1/requests/lending", headers=auth_header(owner_token)
        ).json()
        assert len(lending) == 1
        assert lending[0]["borrowerId"] == borrower["id"]

    def test_lending_lists_are_paginated(self, client):
        _, owner_token = register_user(client, "page-owner@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=60)
        for i in range(3):
            _, token = register_user(client, f"page-borrower-{i}@university.edu")
            start, end = _dates(1 + i * 10, 3 + i * 10)
            _create_request(client, token, item["id"], start, end)

        first_page = client.get(
            "/api/v1/requests/lending?limit=2&offset=0", headers=auth_header(owner_token)
        ).json()
        second_page = client.get(
            "/api/v1/requests/lending?limit=2&offset=2", headers=auth_header(owner_token)
        ).json()
        assert len(first_page) == 2
        assert len(second_page) == 1

    def test_history_survives_after_return(self, client):
        owner, owner_token = register_user(client, "hist-owner@university.edu")
        _, borrower_token = register_user(client, "hist-borrower@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=30)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()
        _approve(client, owner_token, request["id"])
        _set_status(client, owner_token, request["id"], "active")
        _set_status(client, owner_token, request["id"], "returned")

        with SessionLocal() as db:
            stored = db.get(BorrowRequest, request["id"])
            assert stored is not None
            assert stored.status == "returned"

        fetched = client.get(
            f"/api/v1/requests/{request['id']}", headers=auth_header(borrower_token)
        )
        assert fetched.status_code == 200
        assert fetched.json()["status"] == "returned"


class TestAdminAndAuthorization:
    def test_admin_can_approve_on_behalf_of_owner(self, client):
        owner, owner_token = register_user(client, "adminact-owner@university.edu")
        _, borrower_token = register_user(client, "adminact-borrower@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=30)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()

        admin_user, admin_token = register_user(client, "adminact-admin@university.edu")
        with SessionLocal() as db:
            make_admin(db, admin_user["id"])

        response = _approve(client, admin_token, request["id"])
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    def test_stranger_cannot_view_request(self, client):
        owner, owner_token = register_user(client, "view2-owner@university.edu")
        _, borrower_token = register_user(client, "view2-borrower@university.edu")
        item = make_item(client, owner_token)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()
        _, stranger_token = register_user(client, "view2-stranger@university.edu")
        response = client.get(
            f"/api/v1/requests/{request['id']}", headers=auth_header(stranger_token)
        )
        assert response.status_code == 403

    def test_unknown_request_status_transition_rejected(self, client):
        owner, owner_token = register_user(client, "bad-owner@university.edu")
        _, borrower_token = register_user(client, "bad-borrower@university.edu")
        item = make_item(client, owner_token)
        start, end = _dates()
        request = _create_request(client, borrower_token, item["id"], start, end).json()
        response = client.patch(
            f"/api/v1/requests/{request['id']}/status",
            json={"status": "not_a_real_status"},
            headers=auth_header(owner_token),
        )
        assert response.status_code == 422


class TestConcurrentApproval:
    def test_concurrent_approvals_only_one_wins(self, client):
        owner, owner_token = register_user(client, "race-owner@university.edu")
        _, borrower_a = register_user(client, "race-borrower-a@university.edu")
        _, borrower_b = register_user(client, "race-borrower-b@university.edu")
        item = make_item(client, owner_token, maxBorrowDays=30)
        start, end = _dates()

        first = _create_request(client, borrower_a, item["id"], start, end).json()
        second = _create_request(client, borrower_b, item["id"], start, end).json()

        def approve(request_id):
            return _approve(client, owner_token, request_id).status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = sorted(pool.map(approve, [first["id"], second["id"]]))

        assert statuses == [200, 409]

        with SessionLocal() as db:
            approved = (
                db.query(BorrowRequest)
                .filter(
                    BorrowRequest.item_id == item["id"],
                    BorrowRequest.status == "approved",
                )
                .count()
            )
        assert approved == 1
