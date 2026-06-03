"""Add default_tracking to categories."""

import sqlalchemy as sa
from alembic import op

revision = "b1e2f3a4"
down_revision = "a7c9e3d1f2b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("default_tracking", sa.String(10), nullable=False, server_default="unit"),
    )


def downgrade() -> None:
    op.drop_column("categories", "default_tracking")
