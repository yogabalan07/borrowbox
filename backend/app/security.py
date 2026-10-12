import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from .config import ALGORITHM, JWT_EXPIRES_MINUTES, SECRET_KEY

_PBKDF2_ITERATIONS = 390_000

# Short-lived token used only to hand a Google login off to the SPA. It is
# deliberately scoped so it can never be used as a normal access token.
OAUTH_HANDOFF_SCOPE = "oauth_handoff"
OAUTH_HANDOFF_TTL_SECONDS = 120

# Explicit scope for ordinary bearer access tokens. The OAuth handoff token
# carries a different scope and is therefore rejected by authenticated routes.
ACCESS_TOKEN_SCOPE = "access"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations_s, salt, expected = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations_s),
        ).hex()
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "scope": ACCESS_TOKEN_SCOPE,
        "exp": now + timedelta(minutes=JWT_EXPIRES_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None

    # Explicit access-token scope policy: only access-scoped tokens are valid
    # bearer credentials. Tokens without a scope claim are treated as legacy
    # access tokens issued before scopes were introduced. Any other scope --
    # in particular OAUTH_HANDOFF_SCOPE -- is rejected outright, so a Google
    # handoff token can never authenticate against normal endpoints.
    scope = payload.get("scope")
    if scope is not None and scope != ACCESS_TOKEN_SCOPE:
        return None

    user_id = payload.get("sub")
    return str(user_id) if user_id else None


def create_oauth_handoff_token(
    user_id: str, ttl_seconds: int = OAUTH_HANDOFF_TTL_SECONDS
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "scope": OAUTH_HANDOFF_SCOPE,
        "exp": now + timedelta(seconds=ttl_seconds),
        "iat": now,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_oauth_handoff_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("scope") != OAUTH_HANDOFF_SCOPE:
        return None
    user_id = payload.get("sub")
    return str(user_id) if user_id else None
