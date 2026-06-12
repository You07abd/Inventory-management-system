import csv
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import io
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.audit import record_audit
from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models.category import Category
from app.models.item import Item
from app.models.location import Location
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.item import AdjustStockRequest, CheckinRequest, CheckoutRequest
from app.schemas.item import Item as ItemSchema
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.transaction import CartCheckoutItem, CartCheckoutRequest, CartCheckoutResponse
from app.schemas.transaction import Transaction as TransactionSchema


router = APIRouter(prefix="/items", tags=["items"])

# Statuses/conditions that block a checkout.
_BLOCKED_STATUSES = {"maintenance", "retired"}
_BLOCKED_CONDITION = "damaged"
_VALID_CONDITIONS = {"good", "needs_repair", "damaged"}
_ITEM_EXPORT_COLUMNS = [
    "asset_code",
    "name",
    "description",
    "serial_number",
    "barcode",
    "quantity",
    "available_quantity",
    "condition",
    "status",
    "category",
    "location",
    "min_quantity",
    "unit_cost",
    "supplier",
]


def _blank_to_none(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


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


def _parse_nonnegative_int(value: str | None, field_name: str) -> int | None:
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be an integer.") from exc
    if parsed < 0:
        raise ValueError(f"{field_name} must be greater than or equal to 0.")
    return parsed


def _parse_nonnegative_decimal(value: str | None, field_name: str) -> Decimal | None:
    if value is None:
        return None
    try:
        parsed = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"{field_name} must be a decimal number.") from exc
    if parsed < 0:
        raise ValueError(f"{field_name} must be greater than or equal to 0.")
    return parsed


def _assert_checkoutable(item: Item) -> None:
    if item.status in _BLOCKED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Item {item.asset_code} is '{item.status}' and cannot be checked out.",
        )
    if item.condition == _BLOCKED_CONDITION:
        raise HTTPException(
            status_code=400,
            detail=f"Item {item.asset_code} is marked damaged and cannot be checked out.",
        )


def _authorize_borrower(actor: User, borrower_id: int) -> None:
    """Students may only check out to themselves; staff/admin to anyone."""
    if actor.role == "student" and borrower_id != actor.id:
        raise HTTPException(
            status_code=403,
            detail="Students may only check out items to themselves.",
        )


def generate_asset_code(prefix: str, db: Session, model_class, max_attempts: int = 10) -> str:
    for _ in range(max_attempts):
        suffix = secrets.token_hex(3).upper()
        candidate = f"{prefix}-{suffix}"
        exists = db.query(model_class).filter(model_class.asset_code == candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("Failed to generate unique asset code after retries")


def _get_item_or_404(item_id: int, db: Session) -> Item:
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    return item


def _validate_references(db: Session, user_id: int | None, category_id: int | None, location_id: int | None) -> None:
    if user_id is not None and not db.get(User, user_id):
        raise HTTPException(status_code=400, detail="current_holder_id does not reference an existing user.")
    if category_id is not None and not db.get(Category, category_id):
        raise HTTPException(status_code=400, detail="category_id does not reference an existing category.")
    if location_id is not None and not db.get(Location, location_id):
        raise HTTPException(status_code=400, detail="location_id does not reference an existing location.")


def _set_status_from_availability(item: Item) -> None:
    if item.available_quantity <= 0:
        item.available_quantity = 0
        item.status = "checked_out"
    elif item.available_quantity >= item.quantity:
        item.available_quantity = item.quantity
        item.status = "available"
        item.current_holder_id = None
    else:
        item.status = "partially_available"


@router.get("/", response_model=list[ItemSchema])
def list_items(
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = None,
    category_id: int | None = None,
    location_id: int | None = None,
    search: str | None = None,
    barcode: str | None = None,
    low_stock: bool = False,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Item)
    if not include_deleted:
        query = query.filter(Item.deleted_at.is_(None))
    if status_filter:
        query = query.filter(Item.status == status_filter)
    if category_id is not None:
        query = query.filter(Item.category_id == category_id)
    if location_id is not None:
        query = query.filter(Item.location_id == location_id)
    if barcode is not None:
        query = query.filter(Item.barcode == barcode)
    if low_stock:
        query = query.filter(
            Item.min_quantity.isnot(None),
            Item.available_quantity <= Item.min_quantity,
        )
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Item.name.ilike(term),
                Item.asset_code.ilike(term),
                Item.serial_number.ilike(term),
            )
        )
    return (
        query
        .options(joinedload(Item.location))
        .order_by(Item.asset_code)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=ItemSchema, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: Session = Depends(get_db), actor: User = Depends(require_staff)):
    data = payload.model_dump()
    _validate_references(db, data.get("current_holder_id"), data.get("category_id"), data.get("location_id"))
    quantity = data["quantity"]
    available_quantity = data["available_quantity"] if data["available_quantity"] is not None else quantity
    if available_quantity > quantity:
        raise HTTPException(status_code=400, detail="available_quantity cannot exceed quantity.")

    asset_code = generate_asset_code("SAFCSP-DRONE", db, Item)
    data["available_quantity"] = available_quantity
    if data.get("track_units", True):
        data["quantity"] = 0
        data["available_quantity"] = 0
    item = Item(**data, asset_code=asset_code)
    _set_status_from_availability(item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/by-asset-code/{code}", response_model=ItemSchema)
def get_item_by_asset_code(code: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.query(Item).filter(Item.asset_code == code, Item.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    return item


def _resolve_cart_items(db: Session, entries: list[CartCheckoutItem]) -> list[tuple[Item, int]]:
    """Validate every cart entry and return (item, quantity) pairs. Raises on any issue."""
    seen_ids: set[int] = set()
    rows: list[tuple[Item, int]] = []
    for entry in entries:
        if entry.item_id in seen_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Item {entry.item_id} appears more than once in the cart.",
            )
        seen_ids.add(entry.item_id)
        item = db.query(Item).with_for_update().filter(Item.id == entry.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {entry.item_id} not found.")
        _assert_checkoutable(item)
        if entry.quantity > item.available_quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Item {item.asset_code}: requested {entry.quantity}, "
                    f"only {item.available_quantity} available."
                ),
            )
        rows.append((item, entry.quantity))
    return rows


@router.post("/cart-checkout", response_model=CartCheckoutResponse, status_code=status.HTTP_201_CREATED)
def cart_checkout(
    payload: CartCheckoutRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Check out multiple items to one user atomically in a single cart transaction."""
    if not db.get(User, payload.user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    _authorize_borrower(actor, payload.user_id)

    # Pre-validate ALL items before touching the DB so failures are all-or-nothing.
    rows = _resolve_cart_items(db, payload.items)

    session_id = str(uuid.uuid4())
    created: list[Transaction] = []
    for item, qty in rows:
        item.available_quantity -= qty
        item.current_holder_id = payload.user_id
        _set_status_from_availability(item)

        tx = Transaction(
            item_id=item.id,
            user_id=payload.user_id,
            performed_by_id=actor.id,
            type="checkout",
            quantity=qty,
            notes=payload.notes,
            destination=payload.destination,
            due_date=payload.due_date,
            session_id=session_id,
        )
        db.add(tx)
        created.append(tx)

    db.commit()
    tx_ids = [tx.id for tx in created]
    loaded = db.query(Transaction).options(
        joinedload(Transaction.unit),
        joinedload(Transaction.user),
    ).filter(Transaction.id.in_(tx_ids)).all()
    return CartCheckoutResponse(session_id=session_id, transactions=loaded)


@router.get("/stats")
def get_item_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    totals = (
        db.query(
            func.count(Item.id),
            func.coalesce(func.sum(Item.quantity), 0),
            func.coalesce(func.sum(Item.quantity - Item.available_quantity), 0),
            func.coalesce(func.sum(Item.quantity * Item.unit_cost), 0),
        )
        .filter(Item.deleted_at.is_(None))
        .one()
    )
    low_stock_count = (
        db.query(func.count(Item.id))
        .filter(
            Item.deleted_at.is_(None),
            Item.min_quantity.isnot(None),
            Item.available_quantity <= Item.min_quantity,
        )
        .scalar()
    )
    total_value = Decimal(str(totals[3] or 0)).quantize(Decimal("0.01"))
    return {
        "total_items": int(totals[0] or 0),
        "total_quantity": int(totals[1] or 0),
        "low_stock_count": int(low_stock_count or 0),
        "total_value": str(total_value),
        "checked_out_count": int(totals[2] or 0),
    }


@router.get("/export")
def export_items(db: Session = Depends(get_db), _: User = Depends(require_staff)):
    items = (
        db.query(Item)
        .options(joinedload(Item.category), joinedload(Item.location))
        .filter(Item.deleted_at.is_(None))
        .order_by(Item.asset_code)
        .all()
    )
    rows: list[list[object]] = [_ITEM_EXPORT_COLUMNS]
    rows.extend(
        [
            _csv_value(item.asset_code),
            _csv_value(item.name),
            _csv_value(item.description),
            _csv_value(item.serial_number),
            _csv_value(item.barcode),
            item.quantity,
            item.available_quantity,
            _csv_value(item.condition),
            _csv_value(item.status),
            _csv_value(item.category.name if item.category else None),
            _csv_value(item.location.name if item.location else None),
            _csv_value(item.min_quantity),
            _csv_value(item.unit_cost),
            _csv_value(item.supplier),
        ]
        for item in items
    )
    return _csv_response(rows, "items.csv")


@router.post("/import")
async def import_items(request: Request, db: Session = Depends(get_db), actor: User = Depends(require_staff)):
    try:
        form = await request.form()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid multipart form upload.") from exc
    upload = form.get("file")
    if upload is None or not hasattr(upload, "read"):
        raise HTTPException(status_code=400, detail="CSV file field 'file' is required.")

    contents = await upload.read()
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded.") from exc

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV header row is required.")

    created = 0
    updated = 0
    errors: list[dict[str, object]] = []

    for row_number, raw_row in enumerate(reader, start=2):
        row = {key: _blank_to_none(value) for key, value in raw_row.items() if key is not None}
        name = row.get("name")
        if not name:
            errors.append({"row": row_number, "message": "name is required."})
            continue

        try:
            quantity = _parse_nonnegative_int(row.get("quantity"), "quantity")
            min_quantity = _parse_nonnegative_int(row.get("min_quantity"), "min_quantity")
            unit_cost = _parse_nonnegative_decimal(row.get("unit_cost"), "unit_cost")
        except ValueError as exc:
            errors.append({"row": row_number, "message": str(exc)})
            continue

        condition = row.get("condition")
        if condition is not None and condition not in _VALID_CONDITIONS:
            errors.append({"row": row_number, "message": "condition is invalid."})
            continue

        asset_code = row.get("asset_code")
        item: Item | None = None
        if asset_code:
            item = db.query(Item).filter(Item.asset_code == asset_code).first()
            if item and item.deleted_at is not None:
                errors.append({"row": row_number, "message": "asset_code belongs to a deleted item."})
                continue

        if item and quantity is not None:
            checked_out = item.quantity - item.available_quantity
            if quantity < checked_out:
                errors.append({"row": row_number, "message": "quantity cannot be less than checked-out count."})
                continue

        category_id = None
        if "category" in row:
            category_name = row.get("category")
            if category_name is not None:
                category = db.query(Category).filter(Category.name == category_name).first()
                if not category:
                    category = Category(name=category_name)
                    db.add(category)
                    db.flush()
                category_id = category.id

        location_id = None
        if "location" in row:
            location_name = row.get("location")
            if location_name is not None:
                location = db.query(Location).filter(Location.name == location_name).first()
                if not location:
                    location = Location(name=location_name)
                    db.add(location)
                    db.flush()
                location_id = location.id

        if item:
            item.name = name
            for field in ("description", "serial_number", "barcode", "supplier"):
                if field in row:
                    setattr(item, field, row.get(field))
            if quantity is not None:
                checked_out = item.quantity - item.available_quantity
                item.quantity = quantity
                item.available_quantity = quantity - checked_out
            if "min_quantity" in row:
                item.min_quantity = min_quantity
            if "unit_cost" in row:
                item.unit_cost = unit_cost
            if condition is not None:
                item.condition = condition
            if "category" in row:
                item.category_id = category_id
            if "location" in row:
                item.location_id = location_id
            _set_status_from_availability(item)
            updated += 1
            continue

        item_quantity = quantity if quantity is not None else 0
        item = Item(
            asset_code=asset_code or generate_asset_code("SAFCSP-DRONE", db, Item),
            name=name,
            description=row.get("description"),
            serial_number=row.get("serial_number"),
            barcode=row.get("barcode"),
            quantity=item_quantity,
            available_quantity=item_quantity,
            min_quantity=min_quantity if "min_quantity" in row else None,
            unit_cost=unit_cost if "unit_cost" in row else None,
            supplier=row.get("supplier"),
            condition=condition or "good",
            status="available",
            category_id=category_id,
            location_id=location_id,
        )
        _set_status_from_availability(item)
        db.add(item)
        created += 1

    record_audit(
        db,
        actor,
        "import_items",
        "item",
        details=f"created={created}, updated={updated}, errors={len(errors)}",
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="CSV import contains conflicting unique values.") from exc
    return {"created": created, "updated": updated, "errors": errors}


@router.get("/{item_id}", response_model=ItemSchema)
def get_item(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.query(Item).options(joinedload(Item.location)).filter(Item.id == item_id).first()
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Item not found.')
    return item


@router.put("/{item_id}", response_model=ItemSchema)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    item = _get_item_or_404(item_id, db)
    data = payload.model_dump(exclude_unset=True)
    _validate_references(
        db,
        data.get("current_holder_id"),
        data.get("category_id"),
        data.get("location_id"),
    )
    proposed_quantity = data.get("quantity", item.quantity)
    proposed_available = data.get("available_quantity", item.available_quantity)
    if proposed_available > proposed_quantity:
        raise HTTPException(status_code=400, detail="available_quantity cannot exceed quantity.")
    old_track_units = item.track_units
    for field, value in data.items():
        setattr(item, field, value)
    if data.get("track_units") is True and not old_track_units:
        from app.models.unit import Unit as UnitModel
        total = db.query(UnitModel).filter(UnitModel.item_id == item.id).count()
        available = db.query(UnitModel).filter(UnitModel.item_id == item.id, UnitModel.status == "available").count()
        item.quantity = total
        item.available_quantity = available
    _set_status_from_availability(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db), actor: User = Depends(require_staff)):
    item = _get_item_or_404(item_id, db)
    if item.deleted_at is not None:
        return None
    has_history = db.query(Transaction.id).filter(Transaction.item_id == item.id).first() is not None
    if has_history:
        # Preserve the accountability ledger: archive instead of hard delete.
        item.deleted_at = datetime.now(timezone.utc)
        item.status = "retired"
        record_audit(db, actor, "archive_item", "item", item.id, details=item.asset_code)
        db.commit()
        return None
    record_audit(db, actor, "delete_item", "item", item.id, details=item.asset_code)
    db.delete(item)
    db.commit()
    return None


@router.post("/{item_id}/adjust", response_model=ItemSchema)
def adjust_item_stock(
    item_id: int,
    payload: AdjustStockRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_staff),
):
    item = db.query(Item).with_for_update().filter(Item.id == item_id, Item.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="reason is required.")

    checked_out = item.quantity - item.available_quantity
    old_quantity = item.quantity
    if payload.delta is not None:
        new_quantity = item.quantity + payload.delta
    else:
        new_quantity = payload.new_quantity
    if new_quantity is None:
        raise HTTPException(status_code=400, detail="Exactly one of delta or new_quantity must be provided.")
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Resulting quantity cannot be negative.")
    if new_quantity < checked_out:
        raise HTTPException(status_code=400, detail="Resulting quantity cannot be less than checked-out count.")

    item.quantity = new_quantity
    item.available_quantity = new_quantity - checked_out
    _set_status_from_availability(item)

    change = new_quantity - old_quantity
    transaction = Transaction(
        item_id=item.id,
        user_id=actor.id,
        performed_by_id=actor.id,
        type="adjust",
        quantity=max(abs(change), 1),
        notes=reason,
    )
    db.add(transaction)
    record_audit(
        db,
        actor,
        "adjust_item",
        "item",
        item.id,
        details=f"{item.asset_code}: {old_quantity} -> {new_quantity}; {reason}",
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/checkout", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
def checkout_item(item_id: int, payload: CheckoutRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    item = db.query(Item).with_for_update().filter(Item.id == item_id).first()
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Item not found.")
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    _authorize_borrower(actor, payload.user_id)
    _assert_checkoutable(item)
    if payload.quantity > item.available_quantity:
        raise HTTPException(status_code=400, detail="Requested quantity exceeds available quantity.")

    item.available_quantity -= payload.quantity
    item.current_holder_id = payload.user_id
    _set_status_from_availability(item)

    transaction = Transaction(
        item_id=item.id,
        user_id=payload.user_id,
        performed_by_id=actor.id,
        type="checkout",
        quantity=payload.quantity,
        notes=payload.notes,
        destination=payload.destination,
        due_date=payload.due_date,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return db.query(Transaction).options(
        joinedload(Transaction.unit),
        joinedload(Transaction.user),
    ).filter(Transaction.id == transaction.id).first()


@router.post("/{item_id}/checkin", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
def checkin_item(item_id: int, payload: CheckinRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    item = db.query(Item).with_for_update().filter(Item.id == item_id).first()
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Item not found.")
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    checked_out_quantity = item.quantity - item.available_quantity
    if payload.quantity > checked_out_quantity:
        raise HTTPException(status_code=400, detail="Checkin quantity exceeds checked-out quantity.")

    item.available_quantity += payload.quantity
    if payload.condition_on_return:
        item.condition = payload.condition_on_return
    _set_status_from_availability(item)

    transaction = Transaction(
        item_id=item.id,
        user_id=payload.user_id,
        performed_by_id=actor.id,
        type="checkin",
        quantity=payload.quantity,
        notes=payload.notes,
        condition_on_return=payload.condition_on_return,
        returned_at=datetime.now(timezone.utc),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return db.query(Transaction).options(
        joinedload(Transaction.unit),
        joinedload(Transaction.user),
    ).filter(Transaction.id == transaction.id).first()
