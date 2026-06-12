from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class ItemBase(BaseModel):
    name: str
    description: str | None = None
    serial_number: str | None = None
    barcode: str | None = None
    quantity: int = Field(default=0, ge=0)
    available_quantity: int | None = Field(default=None, ge=0)
    min_quantity: int | None = Field(default=None, ge=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=150)
    condition: Literal["good", "needs_repair", "damaged"] = "good"
    status: Literal["available", "checked_out", "partially_available", "maintenance", "retired"] = "available"
    track_units: bool = True
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    serial_number: str | None = None
    barcode: str | None = None
    quantity: int = Field(default=0, ge=0)
    available_quantity: int | None = Field(default=None, ge=0)
    min_quantity: int | None = Field(default=None, ge=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=150)
    condition: Literal["good", "needs_repair", "damaged"] = "good"
    status: Literal["available", "checked_out", "partially_available", "maintenance", "retired"] = "available"
    track_units: bool = True
    current_holder_id: int | None = None
    category_id: int | None = None
    location_id: int | None = None


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    serial_number: str | None = None
    barcode: str | None = None
    quantity: int | None = Field(default=None, ge=0)
    available_quantity: int | None = Field(default=None, ge=0)
    min_quantity: int | None = Field(default=None, ge=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=150)
    condition: Literal["good", "needs_repair", "damaged"] | None = None
    status: Literal["available", "checked_out", "partially_available", "maintenance", "retired"] | None = None
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
    min_quantity: int | None = None
    unit_cost: Decimal | None = None
    supplier: str | None = None
    track_units: bool = True
    created_at: datetime
    updated_at: datetime
    location_name: str | None = None

    @computed_field
    @property
    def low_stock(self) -> bool:
        return self.available_quantity is not None and self.min_quantity is not None and self.available_quantity <= self.min_quantity


class AdjustStockRequest(BaseModel):
    delta: int | None = None
    new_quantity: int | None = Field(default=None, ge=0)
    reason: str = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_exactly_one_quantity_change(self) -> "AdjustStockRequest":
        if (self.delta is None) == (self.new_quantity is None):
            raise ValueError("Exactly one of delta or new_quantity must be provided.")
        return self


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
    condition_on_return: Literal["good", "needs_repair", "damaged"] | None = None
