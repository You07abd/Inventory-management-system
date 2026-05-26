"""add session_id to transactions

Revision ID: 0003_add_session_id
Revises: 0002_destination_field
Create Date: 2026-05-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_session_id"
down_revision = "0002_destination_field"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("session_id", sa.String(36), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column("transactions", "session_id")
