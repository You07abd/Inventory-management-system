from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)

    # Total units owned by the lab
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    # Units currently not checked out
    available_quantity: Mapped[int] = mapped_column(Integer, default=1)

    # condition can be: "good", "fair", or "damaged"
    condition: Mapped[str] = mapped_column(String(50), default="good")

    # QR code string (URL or data payload)
    qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    category: Mapped["Category"] = relationship(back_populates="items")
    location: Mapped["Location"] = relationship(back_populates="items")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="item")
