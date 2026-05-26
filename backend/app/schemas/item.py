from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str
    description: str | None = None
    serial_number: str | None = None
    quantity: int = Field(default=1, ge=1)
    available_quantity: int | None = Field(default=None, ge=0)
    condition: str = "good"
    status: str = "available"
    qr_code: str | None = None
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    serial_number: str | None = None
    quantity: int = Field(default=1, ge=1)
    available_quantity: int | None = Field(default=None, ge=0)
    condition: str = "good"
    status: str = "available"
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    serial_number: str | None = None
    quantity: int | None = Field(default=None, ge=1)
    available_quantity: int | None = Field(default=None, ge=0)
    condition: str | None = None
    status: str | None = None
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class Item(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_code: str
    available_quantity: int
    created_at: datetime
    updated_at: datetime


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
