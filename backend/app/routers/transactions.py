from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import Transaction as TransactionSchema


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionSchema])
def list_transactions(
    item_id: int | None = None,
    session_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)
    if item_id is not None:
        query = query.filter(Transaction.item_id == item_id)
    if session_id is not None:
        query = query.filter(Transaction.session_id == session_id)
    return query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{transaction_id}", response_model=TransactionSchema)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return transaction
