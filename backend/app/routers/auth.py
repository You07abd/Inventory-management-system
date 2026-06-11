import os
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.security import (
    COOKIE_NAME,
    SESSION_TTL_HOURS,
    create_session_token,
    hash_password,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])

# Secure cookie in production; relaxed for local http dev.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None  # e.g. ".aryx.dev" to span subdomains
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")


# Lightweight per-email login throttle. In-memory (per process) — adequate for a
# single-instance lab deployment; Cloudflare provides network-level IP rate limiting.
# For multi-replica deployments, move this to Redis.
_MAX_ATTEMPTS = 5
_WINDOW_SECONDS = 300
_attempts: dict[str, list[float]] = defaultdict(list)


def _check_throttle(email: str) -> None:
    now = time.time()
    recent = [t for t in _attempts[email] if now - t < _WINDOW_SECONDS]
    _attempts[email] = recent
    if len(recent) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait a few minutes and try again.",
        )


def _record_failure(email: str) -> None:
    _attempts[email].append(time.time())


def _clear_failures(email: str) -> None:
    _attempts.pop(email, None)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_HOURS * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path="/",
    )


@router.post("/login", response_model=UserSchema)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    _check_throttle(email)
    user = db.query(User).filter(User.email == payload.email).first()
    # Constant-ish response: verify_password handles the None-hash case, and we return
    # the same error whether the email exists or the password is wrong (no enumeration).
    if not user or not verify_password(payload.password, user.password_hash):
        _record_failure(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    _clear_failures(email)
    token = create_session_token(user.id, user.role)
    _set_session_cookie(response, token)
    record_audit(db, user, "login", "user", user.id)
    db.commit()
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, domain=COOKIE_DOMAIN, path="/")
    return None


@router.get("/me", response_model=UserSchema)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 10:
        raise HTTPException(status_code=400, detail="New password must be at least 10 characters.")
    current_user.password_hash = hash_password(payload.new_password)
    record_audit(db, current_user, "change_password", "user", current_user.id)
    db.commit()
    return None
