"""Add barcode to items."""

import sqlalchemy as sa
from alembic import op

revision = "c1d2e3f4"
down_revision = "b1e2f3a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column("barcode", sa.String(100), nullable=True),
    )
    op.create_index("ix_items_barcode", "items", ["barcode"])


def downgrade() -> None:
    op.drop_index("ix_items_barcode", table_name="items")
    op.drop_column("items", "barcode")
