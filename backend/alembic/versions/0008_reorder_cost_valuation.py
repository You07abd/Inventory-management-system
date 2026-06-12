"""Add reorder and valuation fields to items.

Revision ID: 0008_reorder_cost_valuation
Revises: 0007_auth_audit_softdelete
"""

import sqlalchemy as sa
from alembic import op


revision = "0008_reorder_cost_valuation"
down_revision = "0007_auth_audit_softdelete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("items", sa.Column("min_quantity", sa.Integer(), nullable=True))
    op.add_column("items", sa.Column("unit_cost", sa.Numeric(12, 2), nullable=True))
    op.add_column("items", sa.Column("supplier", sa.String(length=150), nullable=True))
    op.execute(sa.text("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS ck_transactions_type;"))
    op.execute(
        sa.text(
            "ALTER TABLE transactions ADD CONSTRAINT ck_transactions_type "
            "CHECK (type IN ('checkout','checkin','transfer','adjust','adjustment'));"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("UPDATE transactions SET type = 'adjust' WHERE type = 'adjustment';"))
    op.execute(sa.text("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS ck_transactions_type;"))
    op.execute(
        sa.text(
            "ALTER TABLE transactions ADD CONSTRAINT ck_transactions_type "
            "CHECK (type IN ('checkout','checkin','transfer','adjust'));"
        )
    )
    op.drop_column("items", "supplier")
    op.drop_column("items", "unit_cost")
    op.drop_column("items", "min_quantity")
