import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from conftest import auth_header, make_admin, register_user

from app import config, google_oauth
from app.database import SessionLocal

START = "/api/v1/auth/google/start"
CALLBACK = "/api/v1/auth/google/callback"
EXCHANGE = "/api/v1/auth/google/exchange"

GOOGLE_EMAIL = "gstudent@university.edu"


class FakeResponse:
    """Minimal stand-in for an httpx.Response returned by the mocked calls."""

    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError("no json body")
        return self._payload


@pytest.fixture
def google_config(monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(config, "GOOGLE_CLIENT_SECRET", "test-client-secret-value")
    monkeypatch.setattr(
        config,
        "GOOGLE_REDIRECT_URI",
        "http://127.0.0.1:8001/api/v1/auth/google/callback",
    )
    monkeypatch.setattr(config, "FRONTEND_URL", "http://localhost:3000")
    return config


@pytest.fixture
def google_unconfigured(monkeypatch):
    # Force the "not configured" path deterministically, independent of any
    # developer .env that may contain real Google credentials.
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(config, "GOOGLE_CLIENT_SECRET", "")
    monkeypatch.setattr(config, "FRONTEND_URL", "http://localhost:3000")
    return config


def _default_claims(**overrides):
    claims = {
        "aud": config.GOOGLE_CLIENT_ID,
        "iss": "https://accounts.google.com",
        "sub": "google-subject-123",
        "email": GOOGLE_EMAIL,
        "email_verified": True,
        "exp": int(time.time()) + 3600,
        "name": "Google Student",
        "picture": "https://example.com/avatar.png",
    }
    claims.update(overrides)
    return claims


def _mock_google(
    monkeypatch,
    claims=None,
    token_status=200,
    info_status=200,
    post_exc=None,
    info_json_error=False,
    token_payload=None,
):
    def fake_post(url, data=None, timeout=None):
        if post_exc is not None:
            raise post_exc
        payload = (
            token_payload
            if token_payload is not None
            else {"id_token": "google-id-token", "access_token": "access-token"}
        )
        return FakeResponse(token_status, payload)

    def fake_get(url, params=None, timeout=None):
        if info_json_error:
            return FakeResponse(info_status, None)
        resolved = claims if claims is not None else _default_claims()
        return FakeResponse(info_status, resolved)

    monkeypatch.setattr(google_oauth.httpx, "post", fake_post)
    monkeypatch.setattr(google_oauth.httpx, "get", fake_get)


def _begin(client):
    response = client.get(START, follow_redirects=False)
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")
    query = parse_qs(urlparse(location).query)
    return query["state"][0]


def _callback(client, state, code="auth-code"):
    return client.get(
        CALLBACK, params={"code": code, "state": state}, follow_redirects=False
    )


def _handoff(client, state, code="auth-code"):
    response = _callback(client, state, code=code)
    assert response.status_code == 302, response.text
    location = response.headers["location"]
    assert location.startswith("http://localhost:3000/auth/callback#handoff=")
    return location.split("#handoff=", 1)[1]


def _exchange(client, handoff):
    return client.post(EXCHANGE, json={"handoff_token": handoff})


class TestGoogleStart:
    def test_start_redirects_with_state_and_cookie(self, client, google_config):
        response = client.get(START, follow_redirects=False)
        assert response.status_code == 302

        location = response.headers["location"]
        assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")
        query = parse_qs(urlparse(location).query)
        assert query["client_id"] == [config.GOOGLE_CLIENT_ID]
        assert query["redirect_uri"] == [config.GOOGLE_REDIRECT_URI]
        assert query["response_type"] == ["code"]
        assert "openid" in query["scope"][0]
        assert query["state"][0]

        state_cookie = response.cookies.get(config.GOOGLE_STATE_COOKIE)
        assert state_cookie == query["state"][0]

    def test_start_unavailable_when_not_configured(self, client, google_unconfigured):
        response = client.get(START, follow_redirects=False)
        assert response.status_code == 302
        assert (
            response.headers["location"]
            == "http://localhost:3000/login?error=google_unavailable"
        )


class TestGoogleCallback:
    def test_new_user_created_and_session_issued(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch)

        handoff = _handoff(client, _begin(client))
        exchange = _exchange(client, handoff)
        assert exchange.status_code == 200, exchange.text

        body = exchange.json()
        assert body["user"]["email"] == GOOGLE_EMAIL
        assert body["user"]["isAdmin"] is False
        assert body["user"]["isVerified"] is False

        me = client.get("/api/v1/auth/me", headers=auth_header(body["access_token"]))
        assert me.status_code == 200
        assert me.json()["email"] == GOOGLE_EMAIL

    def test_existing_user_linked_preserves_admin_and_verification(
        self, client, google_config, monkeypatch
    ):
        user, _ = register_user(client, GOOGLE_EMAIL, name="Existing Maya")
        with SessionLocal() as db:
            make_admin(db, user["id"])

        _mock_google(monkeypatch)
        handoff = _handoff(client, _begin(client))
        body = _exchange(client, handoff).json()

        assert body["user"]["id"] == user["id"]
        assert body["user"]["isAdmin"] is True
        assert body["user"]["isVerified"] is True
        assert body["user"]["name"] == "Existing Maya"

    def test_google_claims_cannot_grant_privileges(self, client, google_config, monkeypatch):
        _mock_google(
            monkeypatch,
            claims=_default_claims(is_admin=True, isVerified=True, is_verified=True),
        )
        handoff = _handoff(client, _begin(client))
        body = _exchange(client, handoff).json()
        assert body["user"]["isAdmin"] is False
        assert body["user"]["isVerified"] is False

    def test_unverified_email_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, claims=_default_claims(email_verified=False))
        response = _callback(client, _begin(client))
        assert response.status_code == 302
        assert response.headers["location"].endswith("/login?error=google")
        assert client.cookies.get(config.GOOGLE_STATE_COOKIE) is None

    def test_wrong_audience_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, claims=_default_claims(aud="some-other-client"))
        response = _callback(client, _begin(client))
        assert response.headers["location"].endswith("/login?error=google")

    def test_expired_token_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, claims=_default_claims(exp=int(time.time()) - 30))
        response = _callback(client, _begin(client))
        assert response.headers["location"].endswith("/login?error=google")

    def test_bad_state_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch)
        _begin(client)
        response = client.get(
            CALLBACK,
            params={"code": "auth-code", "state": "not-the-real-state"},
            follow_redirects=False,
        )
        assert response.status_code == 302
        assert response.headers["location"].endswith("/login?error=google_state")
        assert client.cookies.get(config.GOOGLE_STATE_COOKIE) is None

    def test_missing_code_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch)
        state = _begin(client)
        response = client.get(CALLBACK, params={"state": state}, follow_redirects=False)
        assert response.status_code == 302
        assert response.headers["location"].endswith("/login?error=google")
        assert client.cookies.get(config.GOOGLE_STATE_COOKIE) is None

    def test_provider_error_param_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch)
        state = _begin(client)
        response = client.get(
            CALLBACK,
            params={"error": "access_denied", "state": state},
            follow_redirects=False,
        )
        assert response.status_code == 302
        assert response.headers["location"].endswith("/login?error=google")

    def test_provider_timeout_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, post_exc=httpx.TimeoutException("timed out"))
        response = _callback(client, _begin(client))
        assert response.status_code == 302
        assert response.headers["location"].endswith("/login?error=google")

    def test_token_endpoint_non_200_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, token_status=400)
        response = _callback(client, _begin(client))
        assert response.headers["location"].endswith("/login?error=google")

    def test_missing_id_token_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, token_payload={"access_token": "only-access"})
        response = _callback(client, _begin(client))
        assert response.headers["location"].endswith("/login?error=google")

    def test_malformed_tokeninfo_rejected(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch, info_json_error=True)
        response = _callback(client, _begin(client))
        assert response.headers["location"].endswith("/login?error=google")

    def test_callback_unavailable_when_not_configured(
        self, client, google_unconfigured, monkeypatch
    ):
        _mock_google(monkeypatch)
        response = client.get(CALLBACK, params={"code": "x"}, follow_redirects=False)
        assert response.status_code == 302
        assert response.headers["location"].endswith("/login?error=google_unavailable")


class TestGoogleExchange:
    def test_invalid_handoff_rejected(self, client, google_config):
        response = _exchange(client, "not-a-valid-token")
        assert response.status_code == 401

    def test_access_token_cannot_be_used_as_handoff(self, client, google_config):
        _, access_token = register_user(client, "handoff-abuse@university.edu")
        response = _exchange(client, access_token)
        assert response.status_code == 401


class TestTokenScopePolicy:
    def test_normal_access_token_accepted_as_bearer(self, client):
        _, access_token = register_user(client, "scope-access@university.edu")
        me = client.get("/api/v1/auth/me", headers=auth_header(access_token))
        assert me.status_code == 200
        assert me.json()["email"] == "scope-access@university.edu"

    def test_handoff_token_rejected_as_bearer(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch)
        handoff = _handoff(client, _begin(client))
        me = client.get("/api/v1/auth/me", headers=auth_header(handoff))
        assert me.status_code == 401

    def test_handoff_token_rejected_on_item_endpoints(self, client, google_config, monkeypatch):
        _mock_google(monkeypatch)
        handoff = _handoff(client, _begin(client))
        response = client.post(
            "/api/v1/items",
            json={
                "title": "Should Not Create",
                "description": "Handoff tokens must not authenticate.",
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
            headers=auth_header(handoff),
        )
        assert response.status_code == 401


class TestAccountLinkingPolicy:
    def test_unverified_password_account_not_silently_linked(
        self, client, google_config, monkeypatch
    ):
        user, _ = register_user(client, GOOGLE_EMAIL, name="Password Owner")
        _mock_google(monkeypatch)

        response = _callback(client, _begin(client))
        assert response.status_code == 302
        assert response.headers["location"].endswith(
            "/login?error=google_account_exists"
        )
        # The blocked account is untouched and can still sign in with a password.
        login = client.post(
            "/api/v1/auth/login",
            json={"email": GOOGLE_EMAIL, "password": "secret123"},
        )
        assert login.status_code == 200
        assert login.json()["user"]["id"] == user["id"]

    def test_verified_account_is_linked(self, client, google_config, monkeypatch):
        user, _ = register_user(client, GOOGLE_EMAIL)
        with SessionLocal() as db:
            make_admin(db, user["id"])

        _mock_google(monkeypatch)
        body = _exchange(client, _handoff(client, _begin(client))).json()
        assert body["user"]["id"] == user["id"]
        assert body["user"]["isAdmin"] is True

    def test_returning_google_user_can_sign_in_again(
        self, client, google_config, monkeypatch
    ):
        _mock_google(monkeypatch)
        first = _exchange(client, _handoff(client, _begin(client))).json()
        assert first["user"]["email"] == GOOGLE_EMAIL

        # Repeating the flow must reuse the Google-owned account, not be blocked
        # by the password-account linking guard, and must not grant privileges.
        second = _exchange(client, _handoff(client, _begin(client))).json()
        assert second["user"]["id"] == first["user"]["id"]
        assert second["user"]["isAdmin"] is False
        assert second["user"]["isVerified"] is False
