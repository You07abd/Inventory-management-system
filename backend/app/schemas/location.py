from pydantic import BaseModel, ConfigDict, Field


class LocationBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None


class Location(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
