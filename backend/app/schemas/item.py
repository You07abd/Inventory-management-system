from datetime import datetime
from pydantic import BaseModel
from .category import CategoryRead
from .location import LocationRead


class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    serial_number: str | None = None
    quantity: int = 1
    condition: str = "good"
    category_id: int | None = None
    location_id: int | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    serial_number: str | None = None
    quantity: int | None = None
    condition: str | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemRead(BaseModel):
    id: int
    name: str
    description: str | None
    serial_number: str | None
    quantity: int
    available_quantity: int
    condition: str
    qr_code: str | None
    category: CategoryRead | None
    location: LocationRead | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
