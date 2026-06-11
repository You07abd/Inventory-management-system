"""Password hashing and JWT session-token helpers.

Auth model: per-user accounts (email + password). On login the backend issues a
signed JWT that is stored in an httpOnly + Secure + SameSite cookie (never in
localStorage/sessionStorage). The cookie is the session; there is no server-side
session store.
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError


# Argon2id — strong, no 72-byte limit, no passlib/bcrypt version drama.
_hasher = PasswordHasher()

# Required in every environment. main.py refuses to start without it in production.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-insecure-change-me")
JWT_ALGORITHM = "HS256"
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "12"))

COOKIE_NAME = "dl_session"


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def create_session_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=SESSION_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> dict:
    """Returns the decoded payload, or raises jwt.PyJWTError on any problem."""
    return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
