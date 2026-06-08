from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str
    description: str | None = None
    serial_number: str | None = None
    barcode: str | None = None
    quantity: int = Field(default=0, ge=0)
    available_quantity: int | None = Field(default=None, ge=0)
    condition: str = "good"
    status: str = "available"
    qr_code: str | None = None
    track_units: bool = True
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    serial_number: str | None = None
    barcode: str | None = None
    quantity: int = Field(default=0, ge=0)
    available_quantity: int | None = Field(default=None, ge=0)
    condition: str = "good"
    status: str = "available"
    track_units: bool = True
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    serial_number: str | None = None
    barcode: str | None = None
    quantity: int | None = Field(default=None, ge=0)
    available_quantity: int | None = Field(default=None, ge=0)
    condition: str | None = None
    status: str | None = None
    track_units: bool = True
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class Item(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_code: str
    barcode: str | None = None
    available_quantity: int
    track_units: bool = True
    created_at: datetime
    updated_at: datetime
    location_name: str | None = None


class CheckoutRequest(BaseModel):
    user_id: int
    quantity: int = Field(default=1, ge=1)
    notes: str | None = None
    destination: str | None = None
    due_date: datetime | None = None


class CheckinRequest(BaseModel):
    user_id: int
    quantity: int = Field(default=1, ge=1)
    notes: str | None = None
    condition_on_return: str | None = None
