from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import Transaction as TransactionSchema


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionSchema])
def list_transactions(
    item_id: int | None = None,
    user_id: int | None = None,
    session_id: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    status values:
      active   — checked out, not returned, not overdue
      overdue  — checked out, not returned, past due_date
      returned — has returned_at
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    query = db.query(Transaction).options(
        joinedload(Transaction.unit),
        joinedload(Transaction.user),
    )
    if item_id is not None:
        query = query.filter(Transaction.item_id == item_id)
    if user_id is not None:
        query = query.filter(Transaction.user_id == user_id)
    if session_id is not None:
        query = query.filter(Transaction.session_id == session_id)
    if status == "active":
        query = query.filter(
            Transaction.type == "checkout",
            Transaction.returned_at.is_(None),
            (Transaction.due_date.is_(None)) | (Transaction.due_date >= now),
        )
    elif status == "overdue":
        query = query.filter(
            Transaction.type == "checkout",
            Transaction.returned_at.is_(None),
            Transaction.due_date < now,
        )
    elif status == "returned":
        query = query.filter(Transaction.returned_at.isnot(None))
    return query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{transaction_id}", response_model=TransactionSchema)
def get_transaction(transaction_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.unit), joinedload(Transaction.user))
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return transaction
