import os
import secrets
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader (no external dependency)."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.environ.get(
    "BORROWBOX_DATABASE_URL", f"sqlite:///{DATA_DIR / 'borrowbox.db'}"
)


def _resolve_secret_key() -> str:
    env_key = os.environ.get("BORROWBOX_SECRET_KEY", "").strip()
    if env_key:
        return env_key
    key_file = DATA_DIR / ".secret_key"
    if key_file.exists():
        existing = key_file.read_text(encoding="utf-8").strip()
        if existing:
            return existing
    generated = secrets.token_hex(32)
    key_file.write_text(generated, encoding="utf-8")
    try:
        os.chmod(key_file, 0o600)
    except OSError:
        pass
    return generated


SECRET_KEY = _resolve_secret_key()
ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.environ.get("BORROWBOX_JWT_EXPIRES_MINUTES", "10080"))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "BORROWBOX_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

# ---------------------------------------------------------------------------
# Google OAuth 2.0 (authorization-code flow)
# ---------------------------------------------------------------------------
# The client secret must only ever live in backend environment configuration.
# It is never exposed to the frontend, logged, or included in responses.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()

# Must exactly match an "Authorized redirect URI" registered on the Google
# OAuth client. Defaults to the local development backend (127.0.0.1:8000).
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI",
    "http://127.0.0.1:8000/api/v1/auth/google/callback",
).strip()

# Where the backend sends the browser back after the callback. Only this
# origin is ever used for redirects (prevents open-redirect abuse).
FRONTEND_URL = os.environ.get("BORROWBOX_FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")

# Opaque state cookie used to mitigate CSRF during the OAuth handshake.
GOOGLE_STATE_COOKIE = "borrowbox_google_state"
GOOGLE_STATE_COOKIE_PATH = "/api/v1/auth/google"
GOOGLE_OAUTH_STATE_TTL_SECONDS = 600

# Mark the state cookie Secure whenever either side of the flow is HTTPS.
COOKIE_SECURE = GOOGLE_REDIRECT_URI.startswith("https://") or FRONTEND_URL.startswith("https://")


def google_oauth_configured() -> bool:
    """True only when both Google credentials are present in the backend env."""
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
