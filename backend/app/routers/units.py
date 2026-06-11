from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models.item import Item
from app.models.location import Location
from app.models.transaction import Transaction
from app.models.unit import Unit
from app.models.user import User
from app.routers.items import _authorize_borrower, generate_asset_code
from app.schemas.unit import (
    Unit as UnitSchema,
    UnitCartCheckoutRequest,
    UnitCartCheckoutResponse,
    UnitCheckinRequest,
    UnitCheckoutRequest,
    UnitCreate,
    UnitUpdate,
    UnitWithItem,
)
from app.schemas.transaction import Transaction as TransactionSchema


router = APIRouter(tags=["units"])


def _get_unit_or_404(unit_id: int, db: Session) -> Unit:
    unit = db.query(Unit).options(
        joinedload(Unit.location), joinedload(Unit.current_holder), joinedload(Unit.item)
    ).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")
    return unit


def _recompute_item_counts(item: Item, db: Session) -> None:
    total = db.query(Unit).filter(Unit.item_id == item.id).count()
    available = db.query(Unit).filter(Unit.item_id == item.id, Unit.status == "available").count()
    item.quantity = total
    item.available_quantity = available
    if available == 0:
        item.status = "checked_out"
    elif available == total:
        item.status = "available"
        item.current_holder_id = None
    else:
        item.status = "partially_available"


@router.get("/items/{item_id}/units", response_model=list[UnitSchema])
def list_units(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    return (
        db.query(Unit)
        .options(joinedload(Unit.location), joinedload(Unit.current_holder))
        .filter(Unit.item_id == item_id)
        .order_by(Unit.unit_number)
        .all()
    )


@router.post("/items/{item_id}/units", response_model=UnitSchema, status_code=status.HTTP_201_CREATED)
def create_unit(item_id: int, payload: UnitCreate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    if payload.location_id is not None and not db.get(Location, payload.location_id):
        raise HTTPException(status_code=400, detail="location_id does not reference an existing location.")

    existing_max = db.query(Unit).filter(Unit.item_id == item_id).count()
    unit_number = existing_max + 1
    while db.query(Unit).filter(Unit.item_id == item_id, Unit.unit_number == unit_number).first():
        unit_number += 1
    asset_code = generate_asset_code(f"{item.asset_code}-U", db, Unit)

    unit = Unit(
        item_id=item_id,
        unit_number=unit_number,
        asset_code=asset_code,
        serial_number=payload.serial_number,
        condition=payload.condition,
        status="available",
        location_id=payload.location_id or item.location_id,
        notes=payload.notes,
    )
    db.add(unit)
    db.flush()
    _recompute_item_counts(item, db)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/units/by-asset-code/{code}", response_model=UnitWithItem)
def get_unit_by_asset_code(code: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    unit = (
        db.query(Unit)
        .options(joinedload(Unit.location), joinedload(Unit.current_holder), joinedload(Unit.item))
        .filter(Unit.asset_code == code)
        .first()
    )
    if not unit:
        # Fallback: treat code as an item asset_code, find first available unit
        from app.models.item import Item as ItemModel
        item_row = db.query(ItemModel).filter(ItemModel.asset_code == code).first()
        if item_row:
            unit = (
                db.query(Unit)
                .options(joinedload(Unit.location), joinedload(Unit.current_holder), joinedload(Unit.item))
                .filter(Unit.item_id == item_row.id, Unit.status == 'available')
                .order_by(Unit.unit_number)
                .first()
            )
    if not unit:
        raise HTTPException(status_code=404, detail='Unit not found.')
    result = UnitWithItem.model_validate(unit)
    result.item_name = unit.item.name if unit.item else ""
    result.item_asset_code = unit.item.asset_code if unit.item else ""
    return result


@router.get("/units/{unit_id}", response_model=UnitSchema)
def get_unit(unit_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _get_unit_or_404(unit_id, db)


@router.put("/units/{unit_id}", response_model=UnitSchema)
def update_unit(unit_id: int, payload: UnitUpdate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    unit = _get_unit_or_404(unit_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "location_id" in data and data["location_id"] is not None:
        if not db.get(Location, data["location_id"]):
            raise HTTPException(status_code=400, detail="location_id does not reference an existing location.")
    for field, value in data.items():
        setattr(unit, field, value)
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(unit_id: int, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    unit = _get_unit_or_404(unit_id, db)
    if unit.status == "checked_out":
        raise HTTPException(status_code=400, detail="Cannot delete a checked-out unit. Check it in first.")
    item = unit.item
    db.delete(unit)
    db.flush()
    _recompute_item_counts(item, db)
    db.commit()


@router.post("/units/{unit_id}/checkout", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
def checkout_unit(unit_id: int, payload: UnitCheckoutRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    unit = (
        db.query(Unit)
        .with_for_update(of=Unit)
        .options(joinedload(Unit.location), joinedload(Unit.current_holder), joinedload(Unit.item))
        .filter(Unit.id == unit_id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")
    if unit.status == "checked_out":
        raise HTTPException(status_code=400, detail="Unit is already checked out.")
    if unit.status in ("maintenance", "retired"):
        raise HTTPException(status_code=400, detail=f"Unit is '{unit.status}' and cannot be checked out.")
    if unit.condition == "damaged":
        raise HTTPException(status_code=400, detail="Cannot check out a damaged unit.")
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    _authorize_borrower(actor, payload.user_id)

    unit.status = "checked_out"
    unit.current_holder_id = payload.user_id
    db.flush()
    _recompute_item_counts(unit.item, db)

    tx = Transaction(
        item_id=unit.item_id,
        unit_id=unit.id,
        user_id=payload.user_id,
        performed_by_id=actor.id,
        type="checkout",
        quantity=1,
        notes=payload.notes,
        due_date=payload.due_date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return db.query(Transaction).options(
        joinedload(Transaction.unit),
        joinedload(Transaction.user),
    ).filter(Transaction.id == tx.id).first()


@router.post("/units/{unit_id}/checkin", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
def checkin_unit(unit_id: int, payload: UnitCheckinRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    unit = (
        db.query(Unit)
        .with_for_update(of=Unit)
        .options(joinedload(Unit.location), joinedload(Unit.current_holder), joinedload(Unit.item))
        .filter(Unit.id == unit_id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")
    if unit.status != "checked_out":
        raise HTTPException(status_code=400, detail="Unit is not currently checked out.")
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    unit.status = "available"
    unit.current_holder_id = None
    db.flush()
    if payload.condition_on_return:
        unit.condition = payload.condition_on_return
    _recompute_item_counts(unit.item, db)

    tx = Transaction(
        item_id=unit.item_id,
        unit_id=unit.id,
        user_id=payload.user_id,
        performed_by_id=actor.id,
        type="checkin",
        quantity=1,
        notes=payload.notes,
        condition_on_return=payload.condition_on_return,
        returned_at=datetime.now(timezone.utc),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return db.query(Transaction).options(
        joinedload(Transaction.unit),
        joinedload(Transaction.user),
    ).filter(Transaction.id == tx.id).first()


@router.post("/units/cart-checkout", response_model=UnitCartCheckoutResponse, status_code=status.HTTP_201_CREATED)
def unit_cart_checkout(payload: UnitCartCheckoutRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    _authorize_borrower(actor, payload.user_id)

    units: list[Unit] = []
    seen: set[int] = set()
    for uid in payload.unit_ids:
        if uid in seen:
            raise HTTPException(status_code=400, detail=f"Unit {uid} appears more than once.")
        seen.add(uid)
        unit = (
            db.query(Unit)
            .with_for_update(of=Unit)
            .options(joinedload(Unit.location), joinedload(Unit.current_holder), joinedload(Unit.item))
            .filter(Unit.id == uid)
            .first()
        )
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found.")
        if unit.status == "checked_out":
            raise HTTPException(status_code=400, detail=f"Unit {unit.asset_code} is already checked out.")
        if unit.status in ("maintenance", "retired"):
            raise HTTPException(status_code=400, detail=f"Unit {unit.asset_code} is '{unit.status}' and cannot be checked out.")
        if unit.condition == "damaged":
            raise HTTPException(status_code=400, detail=f"Unit {unit.asset_code} is damaged and cannot be checked out.")
        units.append(unit)

    session_id = str(uuid.uuid4())
    item_name_map: dict[int, str] = {}

    for unit in units:
        unit.status = "checked_out"
        unit.current_holder_id = payload.user_id
        db.flush()
        _recompute_item_counts(unit.item, db)
        item_name_map[unit.id] = unit.item.name

        tx = Transaction(
            item_id=unit.item_id,
            unit_id=unit.id,
            user_id=payload.user_id,
            performed_by_id=actor.id,
            type="checkout",
            quantity=1,
            notes=payload.notes,
            due_date=payload.due_date,
            session_id=session_id,
        )
        db.add(tx)

    db.commit()
    return UnitCartCheckoutResponse(
        session_id=session_id,
        unit_ids=payload.unit_ids,
        item_name_map=item_name_map,
    )
