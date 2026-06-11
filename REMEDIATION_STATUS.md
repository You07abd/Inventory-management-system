# Remediation Status

> Tracks the fixes applied against `PROJECT_REVIEW.md`, what is verified, what still
> needs you (infra/dashboards), and which large features were deferred and why.
>
> **Date:** 2026-06-11 · No commits were made — review and commit yourself.
> Nothing here is deployed yet; these are working-tree changes.

---

## How this was verified

A throwaway Postgres (via `docker compose`) was spun up, migrations + seed run, and the
auth/authz flows exercised with FastAPI's TestClient. Results (all passing):

- Anonymous `GET /items/` → **401**
- Admin login → **200**; authenticated `GET /items/` → **200**
- Wrong password → **401**; admin `/auth/me` → **200**
- Student `POST /categories` → **403** (staff-only)
- Student checkout to another user → **403**; to self → **201** (actor recorded = "Sara Ali")
- Checkout of a **damaged** unit → **400**
- Delete item **with history** → **204**, archived (hidden from list, still in DB)
- Audit log readable by admin (**200**), forbidden to student (**403**)
- Production mode: refuses weak `SECRET_KEY` (**RuntimeError**), `/docs` → **404**
- Frontend `npm run build` → **clean**

A **pre-existing production bug** was found and fixed in the process (see below).

---

## ✅ Fixed in code (verified)

### Authentication & authorization (the headline issue)
- **Real per-user auth** added. `User` now has `password_hash` (Argon2id).
  New files: `app/security.py`, `app/deps.py`, `app/routers/auth.py`.
- Login issues a **JWT in an httpOnly + SameSite cookie** (Secure in prod). Endpoints:
  `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`.
- **Every router now requires authentication.** Reads require a logged-in user;
  inventory mutations require `staff`/`admin` (`require_staff`); user management and the
  audit log require `admin` (`require_admin`).
- **Borrower authorization:** students may only check out to themselves; staff/admin to
  anyone (`_authorize_borrower`). Enforced on item, unit, cart, and unified-cart checkout.
- **Actor tracking:** transactions now record `performed_by_id` (the authenticated user)
  separately from `user_id` (the borrower). Exposed as `performed_by_name`.
- **Login throttle:** 5 failed attempts per email / 5 min → 429 (in-memory; see caveats).
- No user enumeration: same error for unknown email vs. wrong password.

### Data integrity
- **Soft delete for items.** `items.deleted_at` added; deleting an item that has
  transaction history **archives** it (retired + hidden) instead of destroying the ledger.
  Items with no history are still hard-deleted. Lists/gets filter out archived items
  (override with `?include_deleted=true`).
- **Audit log.** New `audit_logs` table (append-only) + `app/audit.py` helper. Logs
  login, user create/delete, role change, password change, item delete/archive.
  Readable at `GET /audit-logs/` (admin only).

### Checkout correctness
- Checkout now **blocked** when an item/unit is `maintenance`, `retired`, or `damaged` —
  previously only available-quantity was checked, and bulk items skipped the condition gate.
- **Pre-existing bug fixed:** unit checkout combined `FOR UPDATE` with a `joinedload`
  outer join, which **Postgres rejects** (`FOR UPDATE cannot be applied to the nullable
  side of an outer join`). Unit checkout was broken on Postgres. Fixed with
  `with_for_update(of=Unit)` in `units.py` (3 sites) and `checkout.py`.

### Deployment / hardening
- **`.dockerignore`** added for backend and frontend — stops `.env` and caches from being
  baked into image layers.
- **Secrets removed from `docker-compose.yml`** — DB creds, `SECRET_KEY`, cookie config now
  come from environment (Coolify), with `:?` guards that refuse to start if unset.
- **CORS tightened** — explicit methods/headers instead of `*` (kept `allow_credentials`).
- **Security headers** — added in FastAPI middleware (`nosniff`, `X-Frame-Options: DENY`,
  Referrer-Policy, Permissions-Policy, HSTS in prod) and in `nginx.conf` (incl. a CSP).
- **`/docs`, `/redoc`, `/openapi.json` disabled in production** (`ENV=production`).
- **`SECRET_KEY` enforced in production** — app refuses to boot with a weak/missing key.
- **Migrations gated** — `RUN_MIGRATIONS_ON_STARTUP` (default true) so a bad migration
  can't crash boot in multi-replica setups.
- **Frontend deps pinned** off `"latest"` to exact installed versions in `package.json`.
- **nginx** now long-caches hashed assets and never caches `index.html`.

### Bug fixes found along the way
- `seed.py` created a user with `role="instructor"`, which **violates the CHECK
  constraint** from migration `0006` (`role IN ('student','staff','admin')`) — a fresh
  seed would crash. Changed to `staff`, and all seeded users now get a demo password.

### Frontend
- `api/client.js` sends credentials and redirects to login on 401.
- `AuthContext` now validates the session via `/auth/me`, exposes the real `user`, and
  has a `loading` state so the app doesn't flash login while checking the session.
- `Login.jsx` is a **real email/password form** (was a role picker).
- `Sidebar` shows the **actual user name** (fixes the "Unknown" display) + role.
- New `api/auth.js`.

---

## ⚠️ Needs YOU — cannot be done from code

These require your dashboards, credentials, or the live server. **Do them before relying
on the new auth in production.**

### Operational (required for the new auth to work on the live DB)
1. **Install new backend deps** then rebuild the image:
   `argon2-cffi`, `PyJWT`, `pydantic[email]` are now in `requirements.txt`.
2. **Set new env vars** in Coolify (and locally in `backend/.env`):
   `SECRET_KEY` (strong random — `python -c "import secrets; print(secrets.token_urlsafe(48))"`),
   `ENV=production`, `COOKIE_SECURE=true`, `COOKIE_DOMAIN=.aryx.dev`, plus
   `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` (compose no longer hardcodes them).
3. **Run migration `0007`** on the production DB (`alembic upgrade head`, or let startup do it).
4. **Existing production users have no password** (`password_hash` is null) → they cannot log
   in. Set passwords for them: either re-seed (demo only), or write a one-off admin script /
   add a temporary `/auth/change-password`-style bootstrap. **Decide and run this**, or
   nobody can log in after deploy.

### Security infra (from `PROJECT_REVIEW.md` §4–6, still open)
5. **Rotate the leaked secrets** — the origin IP `167.233.110.162` and the
   `inv_user:inv_pass` DB password are in git history. Rotate the DB password; consider
   rebuilding/re-IPing the origin.
6. **Scrub `.playwright-mcp/` from git history** (`git filter-repo`) and delete the files —
   they leak the origin IP and Coolify project path.
7. **Cloudflare:** SSL Full (Strict), WAF on, rate-limit `api.aryx.dev/*` and `/auth/login`,
   Cloudflare Access in front of the Coolify dashboard, cache-bypass for the API.
8. **Hetzner firewall:** allow 80/443 from Cloudflare IPs only; 22 from your IP/VPN; block
   5432 and the Coolify port from the public internet.
9. **Coolify:** lock the dashboard behind Access/VPN, store secrets as secrets, enable
   scheduled encrypted off-site Postgres backups, and **test a restore**.

---

## 🟡 Deferred features — documented, not built (and why)

These are large, net-new modules that need product decisions and their own
schema/migrations/UI. Building them half-done would be worse than not building them, so
they are specified here for a future focused effort. Recommended schema sketches:

| Feature | Why deferred | Suggested shape |
|---|---|---|
| **Battery health** (cycle count, storage voltage, health %) | Net-new domain model + UI; #1 drone-lab value but needs data-entry workflow decisions | `battery_health(unit_id FK, cycle_count, last_storage_voltage, health_pct, updated_at)` |
| **Drone builds** (which components are on which airframe) | Needs a parent/child assignment model + assembly UI | `drone_build(airframe_item_id, component_unit_id, assigned_at, removed_at)` |
| **Maintenance log** | First-class records distinct from the `maintenance` status enum | `maintenance_log(item_id/unit_id, opened_by, type, notes, opened_at, closed_at)` |
| **Pre/post-flight checklists** | Template + per-checkout instance + UI | `checklist_template`, `checklist_run(checkout_tx_id, items_json, passed)` |
| **Reservations** (future booking) | Calendar UI + conflict logic; sizeable | `reservation(item_id/unit_id, user_id, start, end, status)` |
| **Vendors / purchase / warranty** | Schema additions + forms | columns/table: `vendor`, `purchase_date`, `cost`, `warranty_until` |
| **Attachments** (manuals, datasheets, images) | Needs file storage + upload security (size/type/AV) — a security surface of its own | `attachment(entity_type, entity_id, url, content_type, size)` + object storage |
| **Email/overdue notifications** | Needs an email provider + background job runner | scheduled job querying overdue transactions → email |
| **Automated test suite in CI** | Started conceptually; needs a `tests/` package + GitHub Actions | `pytest` + TestClient + Postgres service; port the manual checks above |

Priority order if you pick this up: **battery health → drone builds → maintenance log →
checklists → reservations** (matches `PROJECT_REVIEW.md` §9 "must-have for lab").

---

## 🔧 Known follow-ups on what WAS changed

- **Checkout-desk borrower picker (frontend):** the backend now returns **403** if a
  *student* checks out to someone other than themselves. The desk pages
  (`pages/checkout-desk/CheckOutMode.jsx`, `CheckInMode.jsx`) still show a borrower
  selector. For students it should default to self and hide the picker. Staff/admin are
  unaffected. **Not yet changed** — flagged so a student using the desk doesn't hit a 403.
- **Login throttle is in-memory** (per process). Fine for the single-instance lab
  deployment; move to Redis if you run multiple replicas. Cloudflare should provide the
  network-level IP rate limiting regardless.
- **CSP allows `'unsafe-inline'` for styles** because the current Vite build emits inline
  styles. Tightening this later (nonces/hashes) is a hardening follow-up.
- **`pydantic[email]`** is required now (login uses `EmailStr`). It's in `requirements.txt`;
  make sure the image rebuild picks it up.
- **Two FKs from `transactions` to `users`** (`user_id`, `performed_by_id`) — relationships
  were given explicit `foreign_keys=` to disambiguate. If you add more user FKs, keep doing this.

---

## Quick local test recipe (what was run)

```bash
# DB
POSTGRES_USER=inv_user POSTGRES_PASSWORD=inv_pass POSTGRES_DB=drone_inventory \
  SECRET_KEY=dev docker compose up -d db

# Backend (venv)
cd backend && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://inv_user:inv_pass@<db-host>:5432/drone_inventory
export SECRET_KEY=dev-secret ENV=development
python -m alembic upgrade head
python seed.py            # demo users; password for all: password123
uvicorn app.main:app --reload

# Frontend
cd frontend && npm ci && npm run dev
# log in as admin@dronelab.com / password123
```

> ⚠️ `password123` is a **demo** password. Never use it in a real deployment.
