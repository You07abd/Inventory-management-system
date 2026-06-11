"""Add auth (password_hash), audit_logs, soft delete, and transaction actor.

Revision ID: 0007_auth_audit_softdelete
Revises: 0006_constraints_indexes_cleanup
"""

import sqlalchemy as sa
from alembic import op


revision = "0007_auth_audit_softdelete"
down_revision = "0006_constraints_indexes_cleanup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Auth ---
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))

    # --- Soft delete on items ---
    op.add_column("items", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS idx_items_not_deleted "
            "ON items (id) WHERE deleted_at IS NULL;"
        )
    )

    # --- Transaction actor (distinct from borrower user_id) ---
    op.add_column(
        "transactions",
        sa.Column("performed_by_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_performed_by",
        "transactions",
        "users",
        ["performed_by_id"],
        ["id"],
    )
    op.create_index(
        "ix_transactions_performed_by_id", "transactions", ["performed_by_id"]
    )

    # --- Audit log (append-only) ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_email", sa.String(length=255), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"])
    op.create_index(op.f("ix_audit_logs_actor_id"), "audit_logs", ["actor_id"])
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"])
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_created_at"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_actor_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_transactions_performed_by_id", table_name="transactions")
    op.drop_constraint("fk_transactions_performed_by", "transactions", type_="foreignkey")
    op.drop_column("transactions", "performed_by_id")

    op.execute(sa.text("DROP INDEX IF EXISTS idx_items_not_deleted;"))
    op.drop_column("items", "deleted_at")

    op.drop_column("users", "password_hash")
