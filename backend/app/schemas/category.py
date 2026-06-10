from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    default_tracking: Literal["unit", "quantity"] = "unit"


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    default_tracking: Literal["unit", "quantity"] | None = None


class Category(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
