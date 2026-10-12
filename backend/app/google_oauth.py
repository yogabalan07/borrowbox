"""Google OAuth 2.0 authorization-code helpers.

Only the backend knows the client secret. All outbound calls are made over
HTTPS with bounded timeouts, and no credential, authorization code, access
token, ID token, or JWT is ever logged from this module.
"""
import hmac
import secrets
import time
from urllib.parse import urlencode

import httpx

from . import config

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
GOOGLE_SCOPE = "openid email profile"

# Bounded timeouts so a hung Google endpoint can never tie up a worker.
_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
# Allow a little clock skew when checking token expiry.
_EXPIRY_LEEWAY_SECONDS = 30


class GoogleOAuthError(Exception):
    """Raised for any recoverable failure during the Google handshake."""


def is_configured() -> bool:
    return config.google_oauth_configured()


def generate_state() -> str:
    return secrets.token_urlsafe(32)


def states_match(expected: str | None, received: str | None) -> bool:
    """Constant-time comparison of the OAuth state values."""
    if not expected or not received:
        return False
    return hmac.compare_digest(str(expected), str(received))


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPE,
        "state": state,
        "prompt": "select_account",
        "access_type": "online",
        "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Exchange the authorization code for tokens. Returns the token payload."""
    data = {
        "code": code,
        "client_id": config.GOOGLE_CLIENT_ID,
        "client_secret": config.GOOGLE_CLIENT_SECRET,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    try:
        response = httpx.post(GOOGLE_TOKEN_ENDPOINT, data=data, timeout=_HTTP_TIMEOUT)
    except httpx.HTTPError as exc:  # network error / timeout
        raise GoogleOAuthError("token_exchange_failed") from exc

    if response.status_code != 200:
        raise GoogleOAuthError("token_exchange_failed")

    try:
        payload = response.json()
    except ValueError as exc:
        raise GoogleOAuthError("token_exchange_malformed") from exc

    if not isinstance(payload, dict):
        raise GoogleOAuthError("token_exchange_malformed")

    id_token = payload.get("id_token")
    if not isinstance(id_token, str) or not id_token:
        raise GoogleOAuthError("missing_id_token")

    return payload


def verify_id_token(id_token: str) -> dict:
    """Validate the Google ID token and return verified claims.

    Uses Google's tokeninfo endpoint (no maintained library is installed),
    then independently validates audience, issuer, expiration, verified email,
    and subject claim. Malformed or error responses are rejected.
    """
    try:
        response = httpx.get(
            GOOGLE_TOKENINFO_ENDPOINT,
            params={"id_token": id_token},
            timeout=_HTTP_TIMEOUT,
        )
    except httpx.HTTPError as exc:
        raise GoogleOAuthError("token_validation_failed") from exc

    if response.status_code != 200:
        raise GoogleOAuthError("token_validation_failed")

    try:
        claims = response.json()
    except ValueError as exc:
        raise GoogleOAuthError("token_validation_malformed") from exc

    if not isinstance(claims, dict):
        raise GoogleOAuthError("token_validation_malformed")

    if claims.get("aud") != config.GOOGLE_CLIENT_ID:
        raise GoogleOAuthError("invalid_audience")

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleOAuthError("invalid_issuer")

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise GoogleOAuthError("invalid_subject")

    email = claims.get("email")
    if not isinstance(email, str) or not email.strip():
        raise GoogleOAuthError("invalid_email")

    email_verified = claims.get("email_verified")
    if not (email_verified is True or str(email_verified).lower() == "true"):
        raise GoogleOAuthError("email_not_verified")

    try:
        expires_at = int(claims.get("exp"))
    except (TypeError, ValueError) as exc:
        raise GoogleOAuthError("invalid_expiration") from exc

    if expires_at + _EXPIRY_LEEWAY_SECONDS <= int(time.time()):
        raise GoogleOAuthError("expired_token")

    return claims
