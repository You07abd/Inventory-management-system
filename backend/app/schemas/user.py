from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: str
    role: Literal["student", "staff", "admin"] = "student"


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    email: str | None = None
    role: Literal["student", "staff", "admin"] | None = None


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
