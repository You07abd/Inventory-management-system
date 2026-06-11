from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models.item import Item
from app.models.location import Location
from app.models.unit import Unit
from app.models.user import User
from app.schemas.location import Location as LocationSchema
from app.schemas.location import LocationCreate, LocationUpdate


router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=list[LocationSchema])
def list_locations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Location).order_by(Location.name).offset(skip).limit(limit).all()


@router.post("/", response_model=LocationSchema, status_code=status.HTTP_201_CREATED)
def create_location(payload: LocationCreate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    location = Location(**payload.model_dump())
    db.add(location)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A location with this name already exists.") from exc
    db.refresh(location)
    return location


@router.get("/{location_id}", response_model=LocationSchema)
def get_location(location_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    location = db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")
    return location


@router.put("/{location_id}", response_model=LocationSchema)
def update_location(location_id: int, payload: LocationUpdate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    location = db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A location with this name already exists.") from exc
    db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(location_id: int, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    location = db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")
    if db.query(Item).filter(Item.location_id == location_id).first():
        raise HTTPException(status_code=409, detail="Cannot delete location: items are assigned to it")
    if db.query(Unit).filter(Unit.location_id == location_id).first():
        raise HTTPException(status_code=409, detail="Cannot delete location: units are assigned to it")
    db.delete(location)
    db.commit()
    return None
