from datetime import datetime, date
from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    user_id: int
    quantity: int = 1
    notes: str | None = None
    due_date: date | None = None


class CheckinRequest(BaseModel):
    user_id: int
    quantity: int = 1
    notes: str | None = None


class TransactionRead(BaseModel):
    id: int
    item_id: int
    user_id: int
    type: str
    quantity: int
    notes: str | None
    due_date: date | None
    returned_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
