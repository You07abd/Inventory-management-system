from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.unit import Unit
from app.models.user import User
from app.routers.items import _assert_checkoutable, _authorize_borrower, _set_status_from_availability
from app.schemas.transaction import Transaction as TransactionSchema

router = APIRouter(prefix="/checkout", tags=["checkout"])


class BulkCartItem(BaseModel):
    item_id: int
    quantity: int = Field(ge=1)


class UnifiedCartRequest(BaseModel):
    unit_ids: list[int] = Field(default_factory=list)
    bulk_items: list[BulkCartItem] = Field(default_factory=list)
    user_id: int
    due_date: datetime | None = None
    notes: str | None = None


class UnifiedCartResponse(BaseModel):
    session_id: str
    transactions: list[TransactionSchema]


@router.post("/unified-cart", response_model=UnifiedCartResponse, status_code=status.HTTP_201_CREATED)
def unified_cart_checkout(payload: UnifiedCartRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    if not payload.unit_ids and not payload.bulk_items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    _authorize_borrower(actor, payload.user_id)

    # Track in-flight quantity reductions by item_id to detect cross-list conflicts
    in_flight: dict[int, int] = {}

    # Pre-validate units
    units: list[Unit] = []
    seen_unit_ids: set[int] = set()
    for uid in payload.unit_ids:
        if uid in seen_unit_ids:
            raise HTTPException(status_code=400, detail=f"Unit {uid} appears more than once.")
        seen_unit_ids.add(uid)
        # FOR UPDATE OF units: Postgres rejects FOR UPDATE on the nullable side of the joinedload's outer join.
        unit = db.query(Unit).with_for_update(of=Unit).options(joinedload(Unit.item)).filter(Unit.id == uid).first()
        if not unit:
            raise HTTPException(status_code=400, detail=f"Unit {uid} not found.")
        if not unit.item.track_units:
            raise HTTPException(
                status_code=400,
                detail=f"Unit {unit.asset_code} belongs to a bulk-tracked item. Use bulk_items instead.",
            )
        if unit.status != "available":
            raise HTTPException(status_code=400, detail=f"Unit {unit.asset_code} is not available.")
        if unit.condition == "damaged":
            raise HTTPException(status_code=400, detail=f"Unit {unit.asset_code} is damaged and cannot be checked out.")
        in_flight[unit.item_id] = in_flight.get(unit.item_id, 0) + 1
        if in_flight[unit.item_id] > unit.item.available_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Item {unit.item.asset_code}: not enough units available.",
            )
        units.append(unit)

    # Pre-validate bulk items
    bulk_rows: list[tuple[Item, int]] = []
    seen_item_ids: set[int] = set()
    for entry in payload.bulk_items:
        if entry.item_id in seen_item_ids:
            raise HTTPException(status_code=400, detail=f"Item {entry.item_id} appears more than once.")
        seen_item_ids.add(entry.item_id)
        item = db.query(Item).with_for_update().filter(Item.id == entry.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {entry.item_id} not found.")
        if item.track_units:
            raise HTTPException(status_code=400, detail=f"Item {item.asset_code} requires unit-level tracking.")
        _assert_checkoutable(item)
        already_taken = in_flight.get(entry.item_id, 0)
        if entry.quantity + already_taken > item.available_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Item {item.asset_code}: requested {entry.quantity}, only {item.available_quantity - already_taken} available.",
            )
        in_flight[entry.item_id] = already_taken + entry.quantity
        bulk_rows.append((item, entry.quantity))

    # All validation passed — apply changes in a single transaction
    session_id = str(uuid.uuid4())
    created: list[Transaction] = []

    for unit in units:
        unit.status = "checked_out"
        unit.current_holder_id = payload.user_id
        unit.item.available_quantity -= 1
        unit.item.current_holder_id = payload.user_id
        _set_status_from_availability(unit.item)

        tx = Transaction(
            item_id=unit.item_id,
            unit_id=unit.id,
            user_id=payload.user_id,
            performed_by_id=actor.id,
            type="checkout",
            quantity=1,
            session_id=session_id,
            due_date=payload.due_date,
            notes=payload.notes,
        )
        db.add(tx)
        created.append(tx)

    for item, qty in bulk_rows:
        item.available_quantity -= qty
        item.current_holder_id = payload.user_id
        _set_status_from_availability(item)

        tx = Transaction(
            item_id=item.id,
            unit_id=None,
            user_id=payload.user_id,
            performed_by_id=actor.id,
            type="checkout",
            quantity=qty,
            session_id=session_id,
            due_date=payload.due_date,
            notes=payload.notes,
        )
        db.add(tx)
        created.append(tx)

    db.commit()
    tx_ids = [tx.id for tx in created]
    loaded = (
        db.query(Transaction)
        .options(joinedload(Transaction.user), joinedload(Transaction.unit))
        .filter(Transaction.id.in_(tx_ids))
        .all()
    )
    return UnifiedCartResponse(session_id=session_id, transactions=loaded)
