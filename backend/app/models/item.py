from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    asset_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    condition: Mapped[str] = mapped_column(String(80), nullable=False, default="good")
    status: Mapped[str] = mapped_column(String(80), nullable=False, default="available")
    qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    track_units: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    current_holder_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    current_holder = relationship("User", back_populates="held_items", foreign_keys=[current_holder_id])
    category = relationship("Category", back_populates="items")
    location = relationship("Location", back_populates="items")

    @property
    def location_name(self) -> str | None:
        return self.location.name if self.location else None

    transactions = relationship("Transaction", back_populates="item", cascade="all, delete-orphan")
    units = relationship("Unit", back_populates="item", cascade="all, delete-orphan")
