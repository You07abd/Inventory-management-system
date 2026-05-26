"""add destination to transaction

Revision ID: 0002_destination_field
Revises: 0001_initial_schema
Create Date: 2026-05-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_destination_field"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("destination", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "destination")
