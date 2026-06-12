"""Canonicalize item and unit condition values.

Revision ID: 0009_condition_canonicalization
Revises: 0008_reorder_cost_valuation
"""

import sqlalchemy as sa
from alembic import op


revision = "0009_condition_canonicalization"
down_revision = "0008_reorder_cost_valuation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TABLE items DROP CONSTRAINT IF EXISTS ck_items_condition;"))
    op.execute(sa.text("ALTER TABLE units DROP CONSTRAINT IF EXISTS ck_units_condition;"))

    op.execute(sa.text("UPDATE items SET condition = 'needs_repair' WHERE condition = 'fair';"))
    op.execute(sa.text("UPDATE items SET condition = 'damaged' WHERE condition IN ('poor','retired');"))
    op.execute(sa.text("UPDATE units SET condition = 'needs_repair' WHERE condition = 'fair';"))
    op.execute(sa.text("UPDATE units SET condition = 'damaged' WHERE condition IN ('poor','retired');"))
    op.execute(sa.text("UPDATE transactions SET condition_on_return = 'needs_repair' WHERE condition_on_return = 'fair';"))
    op.execute(sa.text("UPDATE transactions SET condition_on_return = 'damaged' WHERE condition_on_return IN ('poor','retired');"))

    op.execute(
        sa.text(
            "ALTER TABLE items ADD CONSTRAINT ck_items_condition "
            "CHECK (condition IN ('good','needs_repair','damaged'));"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE units ADD CONSTRAINT ck_units_condition "
            "CHECK (condition IN ('good','needs_repair','damaged'));"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE items DROP CONSTRAINT IF EXISTS ck_items_condition;"))
    op.execute(sa.text("ALTER TABLE units DROP CONSTRAINT IF EXISTS ck_units_condition;"))

    # The upgrade mapping is not reversible; coerce canonical values to fit the old constraint set.
    op.execute(sa.text("UPDATE items SET condition = 'fair' WHERE condition = 'needs_repair';"))
    op.execute(sa.text("UPDATE units SET condition = 'fair' WHERE condition = 'needs_repair';"))
    op.execute(sa.text("UPDATE transactions SET condition_on_return = 'fair' WHERE condition_on_return = 'needs_repair';"))

    op.execute(
        sa.text(
            "ALTER TABLE items ADD CONSTRAINT ck_items_condition "
            "CHECK (condition IN ('good','fair','poor','damaged','retired'));"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE units ADD CONSTRAINT ck_units_condition "
            "CHECK (condition IN ('good','fair','poor','damaged','retired'));"
        )
    )
