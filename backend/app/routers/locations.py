from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location
from app.schemas import LocationCreate, LocationRead

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("/", response_model=list[LocationRead])
def get_locations(db: Session = Depends(get_db)):
    """Return all locations."""
    return db.query(Location).all()


@router.post("/", response_model=LocationRead, status_code=201)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    """Create a new location."""
    existing = db.query(Location).filter(Location.name == location.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location already exists")

    new_loc = Location(**location.model_dump())
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return new_loc
