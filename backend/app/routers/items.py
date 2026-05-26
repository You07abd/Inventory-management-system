import base64
from datetime import datetime
from io import BytesIO
from uuid import uuid4

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.category import Category
from app.models.item import Item
from app.models.location import Location
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.item import CheckinRequest, CheckoutRequest
from app.schemas.item import Item as ItemSchema
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.transaction import CartCheckoutItem, CartCheckoutRequest, CartCheckoutResponse
from app.schemas.transaction import Transaction as TransactionSchema


router = APIRouter(prefix="/items", tags=["items"])


def generate_asset_code(db: Session) -> str:
    next_number = db.query(Item).count() + 1
    while True:
        code = f"SAFCSP-DRONE-{next_number:04d}"
        if not db.query(Item).filter(Item.asset_code == code).first():
            return code
        next_number += 1


def generate_qr_code(asset_code: str) -> str:
    image = qrcode.make(asset_code)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


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
    db: Session = Depends(get_db),
):
    query = db.query(Item)
    if status_filter:
        query = query.filter(Item.status == status_filter)
    if category_id is not None:
        query = query.filter(Item.category_id == category_id)
    if location_id is not None:
        query = query.filter(Item.location_id == location_id)
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
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    _validate_references(db, data.get("current_holder_id"), data.get("category_id"), data.get("location_id"))
    quantity = data["quantity"]
    available_quantity = data["available_quantity"] if data["available_quantity"] is not None else quantity
    if available_quantity > quantity:
        raise HTTPException(status_code=400, detail="available_quantity cannot exceed quantity.")

    asset_code = generate_asset_code(db)
    data["available_quantity"] = available_quantity
    item = Item(**data, asset_code=asset_code, qr_code=generate_qr_code(asset_code))
    _set_status_from_availability(item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/by-asset-code/{code}", response_model=ItemSchema)
def get_item_by_asset_code(code: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.asset_code == code).first()
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
        item = db.get(Item, entry.item_id)
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {entry.item_id} not found.")
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
def cart_checkout(payload: CartCheckoutRequest, db: Session = Depends(get_db)):
    """Check out multiple items to one user atomically in a single cart transaction."""
    if not db.get(User, payload.user_id):
        raise HTTPException(status_code=404, detail="User not found.")

    # Pre-validate ALL items before touching the DB so failures are all-or-nothing.
    rows = _resolve_cart_items(db, payload.items)

    session_id = str(uuid4())
    created: list[Transaction] = []
    for item, qty in rows:
        item.available_quantity -= qty
        item.current_holder_id = payload.user_id
        _set_status_from_availability(item)

        tx = Transaction(
            item_id=item.id,
            user_id=payload.user_id,
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
    for tx in created:
        db.refresh(tx)

    return CartCheckoutResponse(session_id=session_id, transactions=created)


@router.get("/{item_id}", response_model=ItemSchema)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).options(joinedload(Item.location)).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Item not found.')
    return item


@router.put("/{item_id}", response_model=ItemSchema)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
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
    for field, value in data.items():
        setattr(item, field, value)
    _set_status_from_availability(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = _get_item_or_404(item_id, db)
    db.delete(item)
    db.commit()
    return None


@router.post("/{item_id}/checkout", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
def checkout_item(item_id: int, payload: CheckoutRequest, db: Session = Depends(get_db)):
    item = _get_item_or_404(item_id, db)
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if payload.quantity > item.available_quantity:
        raise HTTPException(status_code=400, detail="Requested quantity exceeds available quantity.")

    item.available_quantity -= payload.quantity
    item.current_holder_id = payload.user_id
    _set_status_from_availability(item)

    transaction = Transaction(
        item_id=item.id,
        user_id=payload.user_id,
        type="checkout",
        quantity=payload.quantity,
        notes=payload.notes,
        destination=payload.destination,
        due_date=payload.due_date,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/{item_id}/checkin", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
def checkin_item(item_id: int, payload: CheckinRequest, db: Session = Depends(get_db)):
    item = _get_item_or_404(item_id, db)
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
        type="checkin",
        quantity=payload.quantity,
        notes=payload.notes,
        condition_on_return=payload.condition_on_return,
        returned_at=datetime.utcnow(),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction
