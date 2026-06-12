# Staging Branch — Enterprise Feature Changelog

Running log of every change made on the `staging` branch toward enterprise-grade
inventory management. Each entry says what changed, where, and why.

---

## 2026-06-12 — Phase 1 & 2: Reorder points, valuation, stock adjustments, CSV import/export

**Goal:** add the standard feature set every commercial inventory system (Sortly,
inFlow, Zoho Inventory) ships with: low-stock alerts, inventory valuation, audited
stock adjustments, and bulk data in/out via CSV.

### Backend (FastAPI) — implemented by Codex

| Change | Where |
|---|---|
| New item fields: `min_quantity` (reorder point), `unit_cost`, `supplier` | `backend/app/models/item.py`, migration `0008` |
| `low_stock` computed flag on item responses (`available_quantity <= min_quantity`) | `backend/app/schemas/item.py` |
| `low_stock=true` filter on the items list endpoint | `backend/app/routers/items.py` |
| `POST /items/{id}/adjust` — audited stock adjustment with required reason; creates an `adjustment` transaction | `backend/app/routers/items.py` |
| `GET /items/stats` — totals, low-stock count, inventory value, checked-out count | `backend/app/routers/items.py` |
| `GET /items/export` — full items CSV download | `backend/app/routers/items.py` |
| `POST /items/import` — bulk CSV import; per-row validation, create-or-update by `asset_code`, auto-creates categories/locations, returns per-row errors | `backend/app/routers/items.py` |
| `GET /transactions/export` — transactions CSV with optional date range | `backend/app/routers/transactions.py` |

### Frontend (React) — implemented by Fable

**API layer**
- `api/client.js` — added `downloadFile()` helper for CSV downloads (blob + anchor).
- `api/items.js` — added `adjust()`, `stats()`, `importCsv()` (multipart).

**New components**
- `components/AdjustStockModal.jsx` — set absolute quantity or apply ± delta, with a
  required reason and live preview of the new total; blocks adjustments below zero or
  below the checked-out count.
- `components/ImportCsvModal.jsx` — CSV upload with downloadable blank template,
  created/updated/error summary badges, scrollable per-row error list, and a
  downloadable error report.

**New utility**
- `utils/stock.js` — `isLowStock()` (uses API flag with a local fallback),
  `formatMoney()`, `inventoryValue()`.

**Page changes**
- `pages/Dashboard.jsx` — "Item Types" metric replaced with **Inventory Value**
  (types/categories moved to its footer); new amber **low-stock alert strip** under
  the metrics listing the first 5 low items as clickable chips, with "View all" linking
  to the pre-filtered inventory; activity feed now words adjustment transactions
  correctly.
- `pages/InventoryList.jsx` — create form gains **Reorder Point / Unit Cost /
  Supplier** fields; new **Low Stock** status filter (also reachable via
  `/inventory?low_stock=1` from the dashboard); **Export CSV / Import CSV** quick
  actions in the filter sidebar (staff only).
- `pages/ItemDetail.jsx` — new **Procurement** sidebar panel (reorder point, unit
  cost, total value, supplier) with inline edit; **± Adjust stock** action for
  bulk-tracked items (unit-tracked quantities stay managed through units); low-stock
  badge next to availability; activity feed handles adjustment entries.
- `pages/Transactions.jsx` — **Export CSV** button in the topbar (staff only);
  adjustment transactions get a neutral slate badge.
- `components/ItemTable.jsx` — amber **LOW** pill next to the availability count when
  an item is at/below its reorder point.

**Design notes:** all changes follow `DESIGN_SYSTEM.md` — amber semantic set
(`#fffbeb` / `#fde68a` / `#92400e`) for low-stock warnings, existing `.modal`,
`.badge`, `.panel`, `.form-*` families, no new colors or fonts.

**Verified:**
- `npm run build` passes (frontend)
- Backend imports cleanly (`from app.main import app`), `compileall` clean
- Alembic: `0008_reorder_cost_valuation` is the single head, migration is reversible
- New dependency: `python-multipart` added to `backend/requirements.txt` (required for
  the CSV upload endpoint) and installed in the backend venv. **Docker images will pick
  it up automatically from requirements.txt on next build.**

---

## 2026-06-12 — Condition value canonicalization (pre-existing bug fix)

**Bug:** the UI only ever sends `good / needs_repair / damaged` for item and unit
conditions, but the API schemas declared `good / fair / poor / damaged / retired` —
so picking "Needs Repair" in any form was rejected with a 422. The deployed database
also enforces the old five-value set via CHECK constraints from migration `0006`.

**Fix (backend by Codex, reviewed by Fable):**
- Canonical condition set is now **`good / needs_repair / damaged`** across all schemas
  (`item.py`, `unit.py`, and `condition_on_return` in `transaction.py`) and the CSV
  import validator.
- New migration **`0009_condition_canonicalization`**: drops the old CHECK constraints,
  maps existing data (`fair → needs_repair`, `poor`/`retired` → `damaged`, including
  `transactions.condition_on_return`), and re-adds the constraints with the canonical
  set. Reversible (downgrade restores the old constraints; data mapping coerces back).

**Review caught & corrected two production-breaking mistakes** in the first attempt:
1. The fix originally edited already-applied migration `0006` — which does nothing for
   the deployed database. Reverted; replaced with the new `0009` migration.
2. The new adjust endpoint wrote `Transaction(type="adjustment")`, violating the live
   `ck_transactions_type` CHECK constraint (allows `checkout/checkin/transfer/adjust`)
   — every stock adjustment would have 500'd in production. Changed to `type="adjust"`
   on the backend and in all frontend type checks.

**Verified:** backend imports clean, `compileall` clean, `alembic heads` shows the
single head `0009_condition_canonicalization`, `git diff` on `0006` is empty,
frontend `npm run build` passes.

---

## Backlog (next phases, in priority order)

1. Server-side pagination/sorting for the items list (scales past a few hundred items)
2. Item images/attachments
3. Purchase orders (supplier field is the first step)
4. Email/notification digests for low-stock and overdue checkouts
5. Saved filter views per user
