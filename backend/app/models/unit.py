from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number: Mapped[int] = mapped_column(Integer, nullable=False)
    asset_code: Mapped[str] = mapped_column(String(48), unique=True, nullable=False, index=True)
    serial_number: Mapped[str | None] = mapped_column(String(150), nullable=True)
    condition: Mapped[str] = mapped_column(String(80), nullable=False, default="good")
    status: Mapped[str] = mapped_column(String(80), nullable=False, default="available")
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    current_holder_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("item_id", "unit_number", name="uq_unit_item_number"),)

    item = relationship("Item", back_populates="units")
    location = relationship("Location", back_populates="units")
    current_holder = relationship("User", foreign_keys=[current_holder_id])
    transactions = relationship("Transaction", back_populates="unit", cascade="all, delete-orphan")

    @property
    def location_name(self) -> str | None:
        return self.location.name if self.location else None

    @property
    def current_holder_name(self) -> str | None:
        return self.current_holder.name if self.current_holder else None
