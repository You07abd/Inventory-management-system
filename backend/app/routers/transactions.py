import csv
from datetime import date, datetime, time, timezone
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import Transaction as TransactionSchema


router = APIRouter(prefix="/transactions", tags=["transactions"])


def _csv_value(value: object) -> object:
    return "" if value is None else value


def _csv_response(rows: list[list[object]], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(rows)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


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


@router.get("/export")
def export_transactions(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    query = (
        db.query(Transaction)
        .join(Item, Transaction.item_id == Item.id)
        .options(joinedload(Transaction.item), joinedload(Transaction.user))
        .filter(Item.deleted_at.is_(None))
    )
    if start_date is not None:
        query = query.filter(Transaction.created_at >= datetime.combine(start_date, time.min))
    if end_date is not None:
        query = query.filter(Transaction.created_at <= datetime.combine(end_date, time.max))

    transactions = query.order_by(Transaction.created_at.desc()).all()
    rows: list[list[object]] = [
        [
            "id",
            "created_at",
            "action",
            "item_asset_code",
            "item_name",
            "user_name",
            "quantity",
            "destination",
            "notes",
        ]
    ]
    rows.extend(
        [
            transaction.id,
            transaction.created_at.isoformat(),
            transaction.type,
            _csv_value(transaction.item.asset_code if transaction.item else None),
            _csv_value(transaction.item.name if transaction.item else None),
            _csv_value(transaction.user.name if transaction.user else None),
            transaction.quantity,
            _csv_value(transaction.destination),
            _csv_value(transaction.notes),
        ]
        for transaction in transactions
    )
    return _csv_response(rows, "transactions.csv")


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
