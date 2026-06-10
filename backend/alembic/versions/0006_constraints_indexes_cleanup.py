"""Add constraints, partial indexes, and cleanup columns."""

import sqlalchemy as sa
from alembic import op

revision = "0006_constraints_indexes_cleanup"
down_revision = "c1d2e3f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();"))
    op.execute(sa.text("ALTER TABLE locations ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();"))

    op.execute(sa.text("ALTER TABLE items DROP COLUMN IF EXISTS qr_code;"))
    op.execute(sa.text("ALTER TABLE units DROP COLUMN IF EXISTS qr_code;"))

    op.execute(sa.text("UPDATE items SET condition = 'good' WHERE condition NOT IN ('good','fair','poor','damaged','retired');"))
    op.execute(sa.text("UPDATE units SET condition = 'good' WHERE condition NOT IN ('good','fair','poor','damaged','retired');"))
    op.execute(sa.text("UPDATE items SET status = 'available' WHERE status NOT IN ('available','checked_out','partially_available','maintenance','retired');"))
    op.execute(sa.text("UPDATE units SET status = 'available' WHERE status NOT IN ('available','checked_out','maintenance','retired');"))
    op.execute(sa.text("UPDATE transactions SET type = 'checkin' WHERE type = 'return';"))
    op.execute(sa.text("UPDATE transactions SET type = 'checkout' WHERE type NOT IN ('checkout','checkin','transfer','adjust');"))
    op.execute(sa.text("UPDATE users SET role = 'student' WHERE role NOT IN ('student','staff','admin');"))
    op.execute(sa.text("UPDATE categories SET default_tracking = 'unit' WHERE default_tracking NOT IN ('unit','quantity');"))
    op.execute(sa.text("UPDATE units SET unit_number = 1 WHERE unit_number <= 0;"))
    op.execute(sa.text("UPDATE items SET available_quantity = 0 WHERE available_quantity < 0;"))
    op.execute(sa.text("UPDATE items SET available_quantity = quantity WHERE available_quantity > quantity;"))
    op.execute(sa.text("UPDATE transactions SET quantity = 1 WHERE quantity <= 0;"))
    op.execute(sa.text("UPDATE items SET name = 'Unknown' WHERE TRIM(name) = '';"))
    op.execute(sa.text("UPDATE users SET name = 'Unknown' WHERE TRIM(name) = '';"))
    op.execute(sa.text("UPDATE categories SET name = 'Unknown' WHERE TRIM(name) = '';"))
    op.execute(sa.text("UPDATE locations SET name = 'Unknown' WHERE TRIM(name) = '';"))

    op.execute(sa.text("ALTER TABLE items ADD CONSTRAINT ck_items_condition CHECK (condition IN ('good','fair','poor','damaged','retired'));"))
    op.execute(sa.text("ALTER TABLE items ADD CONSTRAINT ck_items_status CHECK (status IN ('available','checked_out','partially_available','maintenance','retired'));"))
    op.execute(sa.text("ALTER TABLE items ADD CONSTRAINT ck_items_available_qty CHECK (available_quantity >= 0 AND available_quantity <= quantity);"))
    op.execute(sa.text("ALTER TABLE items ADD CONSTRAINT ck_items_name_nonempty CHECK (LENGTH(TRIM(name)) >= 1);"))
    op.execute(sa.text("ALTER TABLE units ADD CONSTRAINT ck_units_condition CHECK (condition IN ('good','fair','poor','damaged','retired'));"))
    op.execute(sa.text("ALTER TABLE units ADD CONSTRAINT ck_units_status CHECK (status IN ('available','checked_out','maintenance','retired'));"))
    op.execute(sa.text("ALTER TABLE units ADD CONSTRAINT ck_units_unit_number CHECK (unit_number > 0);"))
    op.execute(sa.text("ALTER TABLE transactions ADD CONSTRAINT ck_transactions_type CHECK (type IN ('checkout','checkin','transfer','adjust'));"))
    op.execute(sa.text("ALTER TABLE transactions ADD CONSTRAINT ck_transactions_qty CHECK (quantity > 0);"))
    op.execute(sa.text("ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('student','staff','admin'));"))
    op.execute(sa.text("ALTER TABLE users ADD CONSTRAINT ck_users_name_nonempty CHECK (LENGTH(TRIM(name)) >= 1);"))
    op.execute(sa.text("ALTER TABLE categories ADD CONSTRAINT ck_categories_tracking CHECK (default_tracking IN ('unit','quantity'));"))
    op.execute(sa.text("ALTER TABLE categories ADD CONSTRAINT ck_categories_name_nonempty CHECK (LENGTH(TRIM(name)) >= 1);"))
    op.execute(sa.text("ALTER TABLE locations ADD CONSTRAINT ck_locations_name_nonempty CHECK (LENGTH(TRIM(name)) >= 1);"))

    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_transactions_open_by_item ON transactions (item_id) WHERE returned_at IS NULL;"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_transactions_open_by_user ON transactions (user_id) WHERE returned_at IS NULL;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_items_serial_number;"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_items_serial_number_notnull ON items (serial_number) WHERE serial_number IS NOT NULL;"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_units_serial_number_notnull ON units (serial_number) WHERE serial_number IS NOT NULL;"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_items_holder_notnull ON items (current_holder_id) WHERE current_holder_id IS NOT NULL;"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_units_holder_notnull ON units (current_holder_id) WHERE current_holder_id IS NOT NULL;"))


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS idx_units_holder_notnull;"))
    op.execute(sa.text("DROP INDEX IF EXISTS idx_items_holder_notnull;"))
    op.execute(sa.text("DROP INDEX IF EXISTS idx_units_serial_number_notnull;"))
    op.execute(sa.text("DROP INDEX IF EXISTS idx_items_serial_number_notnull;"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_items_serial_number ON items (serial_number);"))
    op.execute(sa.text("DROP INDEX IF EXISTS idx_transactions_open_by_user;"))
    op.execute(sa.text("DROP INDEX IF EXISTS idx_transactions_open_by_item;"))

    op.execute(sa.text("ALTER TABLE locations DROP CONSTRAINT IF EXISTS ck_locations_name_nonempty;"))
    op.execute(sa.text("ALTER TABLE categories DROP CONSTRAINT IF EXISTS ck_categories_name_nonempty;"))
    op.execute(sa.text("ALTER TABLE categories DROP CONSTRAINT IF EXISTS ck_categories_tracking;"))
    op.execute(sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_name_nonempty;"))
    op.execute(sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role;"))
    op.execute(sa.text("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS ck_transactions_qty;"))
    op.execute(sa.text("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS ck_transactions_type;"))
    op.execute(sa.text("ALTER TABLE units DROP CONSTRAINT IF EXISTS ck_units_unit_number;"))
    op.execute(sa.text("ALTER TABLE units DROP CONSTRAINT IF EXISTS ck_units_status;"))
    op.execute(sa.text("ALTER TABLE units DROP CONSTRAINT IF EXISTS ck_units_condition;"))
    op.execute(sa.text("ALTER TABLE items DROP CONSTRAINT IF EXISTS ck_items_name_nonempty;"))
    op.execute(sa.text("ALTER TABLE items DROP CONSTRAINT IF EXISTS ck_items_available_qty;"))
    op.execute(sa.text("ALTER TABLE items DROP CONSTRAINT IF EXISTS ck_items_status;"))
    op.execute(sa.text("ALTER TABLE items DROP CONSTRAINT IF EXISTS ck_items_condition;"))

    op.execute(sa.text("ALTER TABLE units ADD COLUMN IF NOT EXISTS qr_code TEXT;"))
    op.execute(sa.text("ALTER TABLE items ADD COLUMN IF NOT EXISTS qr_code TEXT;"))

    op.execute(sa.text("ALTER TABLE locations DROP COLUMN IF EXISTS updated_at;"))
    op.execute(sa.text("ALTER TABLE categories DROP COLUMN IF EXISTS updated_at;"))
