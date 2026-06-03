"""Add track_units to items."""

from alembic import op
import sqlalchemy as sa


revision = "a7c9e3d1f2b4"
down_revision = "0005_add_category_icon_color"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("items", sa.Column("track_units", sa.Boolean(), nullable=False, server_default="true"))


def downgrade() -> None:
    op.drop_column("items", "track_units")
