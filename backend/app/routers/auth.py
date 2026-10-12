from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import config, google_oauth
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import GoogleExchangeIn, LoginIn, ProfileUpdateIn, RegisterIn
from ..security import (
    create_access_token,
    create_oauth_handoff_token,
    decode_oauth_handoff_token,
    hash_password,
    verify_password,
)
from ..serializers import user_out

router = APIRouter(prefix="/auth", tags=["auth"])

# Marker stored in password_hash for accounts created via Google. It is not a
# valid PBKDF2 hash, so password login always fails for these accounts (a
# password can be set later through an account-recovery flow). It lets us
# recognize a returning Google identity without a schema migration.
_GOOGLE_PASSWORD_SENTINEL = "!google-oauth-no-password"

# Frontend error codes surfaced in the /login?error=... query parameter.
GOOGLE_ERROR_ACCOUNT_EXISTS = "google_account_exists"


class _GoogleLinkBlocked(Exception):
    """Raised when the verified Google email already belongs to an
    unverified password account that must not be silently linked."""


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


# ---------------------------------------------------------------------------
# Google OAuth 2.0 (authorization-code flow)
# ---------------------------------------------------------------------------
def _frontend_redirect(path: str) -> str:
    """Build an absolute redirect against the single configured frontend origin.

    The path is always supplied by server code, never by request input, which
    prevents open-redirect abuse.
    """
    base = config.FRONTEND_URL.rstrip("/")
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base}{path}"


def _google_failure(reason: str) -> RedirectResponse:
    """Redirect to the SPA error page and always clear the state cookie."""
    response = RedirectResponse(
        _frontend_redirect(f"/login?error={reason}"), status_code=status.HTTP_302_FOUND
    )
    response.delete_cookie(config.GOOGLE_STATE_COOKIE, path=config.GOOGLE_STATE_COOKIE_PATH)
    return response


@router.get("/google/start")
def google_start():
    if not google_oauth.is_configured():
        return _google_failure("google_unavailable")

    state = google_oauth.generate_state()
    response = RedirectResponse(
        google_oauth.build_authorization_url(state), status_code=status.HTTP_302_FOUND
    )
    response.set_cookie(
        key=config.GOOGLE_STATE_COOKIE,
        value=state,
        max_age=config.GOOGLE_OAUTH_STATE_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=config.COOKIE_SECURE,
        path=config.GOOGLE_STATE_COOKIE_PATH,
    )
    return response


def _find_or_create_google_user(db: Session, claims: dict, email: str) -> User:
    """Resolve the Google identity to a User without unsafe account linking.

    An existing account is only reused when ownership can be trusted:
      * the account was itself created by Google (recognizable by its sentinel
        password hash), i.e. the same verified Google identity is returning; or
      * the account has already been verified by an admin, so email ownership
        was confirmed independently.

    An unverified password account is NEVER linked based on email alone. Doing
    so would enable a pre-hijack attack: an attacker registers the victim's
    email (registration does not verify email ownership), and when the victim
    later signs in with Google they would be silently bound to an account the
    attacker still controls. In that case _GoogleLinkBlocked is raised and the
    callback redirects to a clear, actionable error.

    is_admin / is_verified are never granted or changed from Google claims.
    """
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        if existing.password_hash == _GOOGLE_PASSWORD_SENTINEL or existing.is_verified:
            return existing
        raise _GoogleLinkBlocked()

    raw_name = str(claims.get("name") or "").strip()
    name = (raw_name or email.split("@")[0])[:120]
    avatar_url = str(claims.get("picture") or "").strip()

    user = User(
        name=name,
        email=email,
        # Sentinel marks this as a Google-owned account with no usable
        # password until one is deliberately set.
        password_hash=_GOOGLE_PASSWORD_SENTINEL,
        avatar_url=avatar_url,
        # is_verified/is_admin intentionally left at their safe DB defaults.
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent callback created the same account first.
        db.rollback()
        concurrent = db.scalar(select(User).where(User.email == email))
        if concurrent is None:
            raise
        return concurrent

    db.refresh(user)
    return user


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if not google_oauth.is_configured():
        return _google_failure("google_unavailable")

    cookie_state = request.cookies.get(config.GOOGLE_STATE_COOKIE)
    if error or not code:
        return _google_failure("google")
    if not google_oauth.states_match(cookie_state, state):
        return _google_failure("google_state")

    try:
        tokens = google_oauth.exchange_code(code)
        claims = google_oauth.verify_id_token(tokens["id_token"])
    except google_oauth.GoogleOAuthError:
        return _google_failure("google")

    email = str(claims["email"]).strip().lower()
    try:
        user = _find_or_create_google_user(db, claims, email)
    except _GoogleLinkBlocked:
        # Refuse to bind Google to an unverified password account; the SPA
        # shows an actionable message and the user can sign in with a password.
        return _google_failure(GOOGLE_ERROR_ACCOUNT_EXISTS)

    # Hand the browser a short-lived, single-purpose handoff token. The SPA
    # immediately exchanges it for the normal session token, so no long-lived
    # credential is left in the URL fragment or browser history.
    #
    # Replay protection limitation: the handoff is a stateless JWT with a
    # 120-second TTL and is NOT one-time. There is no reliable shared
    # replay-store in the current single-database architecture (an in-memory
    # set would not survive multiple workers/restarts), so a captured handoff
    # token could, in principle, be replayed within its TTL. Rely on the short
    # TTL, TLS, and the fragment never being logged. Do not describe this token
    # as one-time until a durable store (e.g. Redis/DB-backed jti table) exists.
    handoff = create_oauth_handoff_token(user.id)
    response = RedirectResponse(
        _frontend_redirect(f"/auth/callback#handoff={handoff}"),
        status_code=status.HTTP_302_FOUND,
    )
    response.delete_cookie(config.GOOGLE_STATE_COOKIE, path=config.GOOGLE_STATE_COOKIE_PATH)
    return response


@router.post("/google/exchange")
def google_exchange(payload: GoogleExchangeIn, db: Session = Depends(get_db)):
    user_id = decode_oauth_handoff_token(payload.handoff_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google sign-in handoff.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please sign in again.",
        )
    return {"user": user_out(user), "access_token": create_access_token(user.id)}
