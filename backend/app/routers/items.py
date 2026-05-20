from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import qrcode
import io
import base64

from app.database import get_db
from app.models import Item, Transaction, User
from app.schemas import ItemCreate, ItemUpdate, ItemRead, CheckoutRequest, CheckinRequest, TransactionRead

router = APIRouter(prefix="/items", tags=["Items"])


def generate_qr_code(item_id: int, item_name: str) -> str:
    """Generate a base64-encoded QR code image for an item."""
    data = f"ITEM_ID:{item_id}|NAME:{item_name}"
    img = qrcode.make(data)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


@router.get("/", response_model=list[ItemRead])
def get_items(db: Session = Depends(get_db)):
    """Return all items with their category and location details."""
    return (
        db.query(Item)
        .options(joinedload(Item.category), joinedload(Item.location))
        .all()
    )


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """Return a single item by ID."""
    item = (
        db.query(Item)
        .options(joinedload(Item.category), joinedload(Item.location))
        .filter(Item.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/", response_model=ItemRead, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """Create a new inventory item and generate its QR code."""
    new_item = Item(
        **item.model_dump(),
        available_quantity=item.quantity,  # starts fully available
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Generate and attach QR code now that we have an ID
    new_item.qr_code = generate_qr_code(new_item.id, new_item.name)
    db.commit()
    db.refresh(new_item)

    # Reload relationships before returning
    db.refresh(new_item)
    return (
        db.query(Item)
        .options(joinedload(Item.category), joinedload(Item.location))
        .filter(Item.id == new_item.id)
        .first()
    )


@router.put("/{item_id}", response_model=ItemRead)
def update_item(item_id: int, updates: ItemUpdate, db: Session = Depends(get_db)):
    """Update an existing item's details."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return (
        db.query(Item)
        .options(joinedload(Item.category), joinedload(Item.location))
        .filter(Item.id == item_id)
        .first()
    )


@router.post("/{item_id}/checkout", response_model=TransactionRead, status_code=201)
def checkout_item(item_id: int, request: CheckoutRequest, db: Session = Depends(get_db)):
    """Check out one or more units of an item to a user."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if item.available_quantity < request.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough units available. Available: {item.available_quantity}",
        )

    # Reduce available stock
    item.available_quantity -= request.quantity

    transaction = Transaction(
        item_id=item_id,
        user_id=request.user_id,
        type="checkout",
        quantity=request.quantity,
        notes=request.notes,
        due_date=request.due_date,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/{item_id}/checkin", response_model=TransactionRead, status_code=201)
def checkin_item(item_id: int, request: CheckinRequest, db: Session = Depends(get_db)):
    """Check in (return) one or more units of an item."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if item.available_quantity + request.quantity > item.quantity:
        raise HTTPException(
            status_code=400,
            detail="Cannot return more units than were checked out",
        )

    # Restore available stock
    item.available_quantity += request.quantity

    transaction = Transaction(
        item_id=item_id,
        user_id=request.user_id,
        type="checkin",
        quantity=request.quantity,
        notes=request.notes,
        returned_at=datetime.now(timezone.utc),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction
