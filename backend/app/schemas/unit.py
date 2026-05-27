from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UnitCreate(BaseModel):
    serial_number: str | None = None
    condition: str = "good"
    location_id: int | None = None
    notes: str | None = None


class UnitUpdate(BaseModel):
    serial_number: str | None = None
    condition: str | None = None
    location_id: int | None = None
    notes: str | None = None
    status: str | None = None


class Unit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    unit_number: int
    asset_code: str
    serial_number: str | None
    condition: str
    status: str
    location_id: int | None
    location_name: str | None
    current_holder_id: int | None
    current_holder_name: str | None
    qr_code: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class UnitWithItem(Unit):
    item_name: str = ""
    item_asset_code: str = ""


class UnitCheckoutRequest(BaseModel):
    user_id: int
    notes: str | None = None
    due_date: datetime | None = None


class UnitCheckinRequest(BaseModel):
    user_id: int
    condition_on_return: str | None = None
    notes: str | None = None


class UnitCartCheckoutRequest(BaseModel):
    unit_ids: list[int] = Field(min_length=1)
    user_id: int
    notes: str | None = None
    due_date: datetime | None = None


class UnitCartCheckoutResponse(BaseModel):
    session_id: str
    unit_ids: list[int]
    item_name_map: dict[int, str] = {}
