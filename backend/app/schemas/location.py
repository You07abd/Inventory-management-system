from pydantic import BaseModel


class LocationCreate(BaseModel):
    name: str
    description: str | None = None


class LocationRead(BaseModel):
    id: int
    name: str
    description: str | None

    model_config = {"from_attributes": True}
