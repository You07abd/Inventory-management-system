from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.schemas.user import UserCreate, UserUpdate
from app.security import hash_password


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserSchema])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(User).order_by(User.name).offset(skip).limit(limit).all()


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    data = payload.model_dump()
    password = data.pop("password", None)
    user = User(**data)
    if password:
        user.password_hash = hash_password(password)
    db.add(user)
    try:
        db.flush()
        record_audit(db, actor, "create_user", "user", user.id, details=user.email)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A user with this email already exists.") from exc
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserSchema)
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    data = payload.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    role_changed = "role" in data and data["role"] != user.role
    for field, value in data.items():
        setattr(user, field, value)
    if password:
        user.password_hash = hash_password(password)
    try:
        if role_changed:
            record_audit(db, actor, "change_role", "user", user.id, details=f"-> {user.role}")
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A user with this email already exists.") from exc
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    record_audit(db, actor, "delete_user", "user", user.id, details=user.email)
    db.delete(user)
    db.commit()
    return None
