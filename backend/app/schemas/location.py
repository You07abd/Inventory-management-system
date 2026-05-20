from pydantic import BaseModel, ConfigDict


class LocationBase(BaseModel):
    name: str
    description: str | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class Location(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
