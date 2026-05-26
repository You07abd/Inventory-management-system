from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    item_id: int
    user_id: int
    type: str
    quantity: int = Field(default=1, ge=1)
    notes: str | None = None
    destination: str | None = None
    condition_on_return: str | None = None
    due_date: datetime | None = None
    returned_at: datetime | None = None


class TransactionCreate(TransactionBase):
    pass


class Transaction(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
