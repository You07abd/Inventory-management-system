"""Authentication / authorization dependencies.

Every protected route should depend on `get_current_user` (any logged-in user) or
`require_role(...)` (specific roles). Roles are read from the database user record,
never from the client.
"""

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security import COOKIE_NAME, decode_session_token


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        payload = decode_session_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        ) from exc

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    return user


def require_role(*allowed_roles: str):
    """Dependency factory: allow only the given roles.

    Example: `_: User = Depends(require_role("admin"))`
    """

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return checker


# Convenience: staff-or-admin can manage inventory; admin-only for user management.
require_staff = require_role("staff", "admin")
require_admin = require_role("admin")
