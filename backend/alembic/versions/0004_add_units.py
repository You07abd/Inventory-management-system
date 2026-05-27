"""add units table and migrate existing items

Revision ID: 0004_add_units
Revises: 0003_add_session_id
Create Date: 2026-05-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
import base64
from io import BytesIO


revision = "0004_add_units"
down_revision = "0003_add_session_id"
branch_labels = None
depends_on = None


def _generate_qr(asset_code: str) -> str:
    try:
        import qrcode
        image = qrcode.make(asset_code)
        buf = BytesIO()
        image.save(buf, format="PNG")
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"
    except Exception:
        return ""


def upgrade() -> None:
    op.create_table(
        "units",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("unit_number", sa.Integer, nullable=False),
        sa.Column("asset_code", sa.String(48), unique=True, nullable=False, index=True),
        sa.Column("serial_number", sa.String(150), nullable=True),
        sa.Column("condition", sa.String(80), nullable=False, server_default="good"),
        sa.Column("status", sa.String(80), nullable=False, server_default="available"),
        sa.Column("location_id", sa.Integer, sa.ForeignKey("locations.id"), nullable=True),
        sa.Column("current_holder_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("qr_code", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("item_id", "unit_number", name="uq_unit_item_number"),
    )

    op.add_column("transactions", sa.Column("unit_id", sa.Integer, sa.ForeignKey("units.id"), nullable=True, index=True))

    conn = op.get_bind()
    items = conn.execute(sa.text(
        "SELECT id, asset_code, quantity, serial_number, condition, status, location_id, current_holder_id FROM items"
    )).fetchall()

    for item in items:
        item_id, asset_code, quantity, serial_number, condition, status, location_id, current_holder_id = item

        for unit_number in range(1, quantity + 1):
            unit_asset_code = f"{asset_code}-U{unit_number:02d}"
            is_first = unit_number == 1
            unit_condition = condition if is_first else "good"
            if is_first:
                unit_status = status if status in ("available", "checked_out") else "available"
                unit_serial = serial_number
                unit_holder = current_holder_id if status == "checked_out" else None
                unit_location = location_id
            else:
                unit_status = "available"
                unit_serial = None
                unit_holder = None
                unit_location = location_id

            qr = _generate_qr(unit_asset_code)

            result = conn.execute(sa.text(
                """INSERT INTO units (item_id, unit_number, asset_code, serial_number, condition, status,
                   location_id, current_holder_id, qr_code, created_at, updated_at)
                   VALUES (:item_id, :unit_number, :asset_code, :serial_number, :condition, :status,
                   :location_id, :current_holder_id, :qr_code, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                   RETURNING id"""
            ), {
                "item_id": item_id, "unit_number": unit_number, "asset_code": unit_asset_code,
                "serial_number": unit_serial, "condition": unit_condition, "status": unit_status,
                "location_id": unit_location, "current_holder_id": unit_holder, "qr_code": qr,
            })
            unit_id = result.fetchone()[0]

            if is_first:
                conn.execute(sa.text(
                    "UPDATE transactions SET unit_id = :unit_id WHERE item_id = :item_id"
                ), {"unit_id": unit_id, "item_id": item_id})


def downgrade() -> None:
    op.drop_column("transactions", "unit_id")
    op.drop_table("units")
