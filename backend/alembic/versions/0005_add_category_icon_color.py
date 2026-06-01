"""add category icon and color

Revision ID: 0005_add_category_icon_color
Revises: 0004_add_units
Create Date: 2026-06-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_add_category_icon_color"
down_revision = "0004_add_units"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("icon", sa.String(100), nullable=True))
    op.add_column("categories", sa.Column("color", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "color")
    op.drop_column("categories", "icon")
