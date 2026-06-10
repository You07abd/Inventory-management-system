# Project Review — Drone Lab Inventory System

> Senior security / full-stack / DevOps / product audit of the deployed application.
> Reviewed directly from source: backend routers, models, migrations, Docker/Traefik
> config, frontend auth, and committed artifacts. Dashboard settings (Cloudflare,
> Hetzner, Coolify) were not visible and are flagged as "verify" items.
>
> **Date:** 2026-06-11 · **Branch:** main · **Deployed at:** aryx.dev / api.aryx.dev

---

## ⛔ Headline: No authentication and no authorization exist

This single fact dominates every other section.

- **`frontend/src/context/AuthContext.jsx`** — "login" is a role picker. It does
  `sessionStorage.setItem("dl_role", selectedRole)`. No password, no server call,
  no token. Clicking "Admin" makes you admin.
- **Backend** — no `Depends(get_current_user)`, no JWT, no session, no password
  field on the `User` model. Every endpoint is callable by anyone with the URL.
- **The API is public** — `docker-compose.yml` publishes the backend at
  `api.aryx.dev`. So today, from anywhere:

```bash
curl https://api.aryx.dev/users/                # dump every user + email
curl -X DELETE https://api.aryx.dev/items/1     # delete any asset + its history
curl -X DELETE https://api.aryx.dev/users/1     # delete any user
curl -X POST   https://api.aryx.dev/items/ -d '...'   # inject data as anyone
```

The role you pick only changes which buttons render. It enforces nothing.
Most OWASP categories below (broken access control, broken auth, IDOR, missing
function-level authz) are **not "at risk" — they are fully exploitable today.**

**Bottom line:** a well-built inventory *engine* with senior-level concurrency
handling, wrapped in a costume of security, exposed to the open internet. Fixable,
and the bones are good — but not deliverable or publishable as-is.

---

## Section 1 — Production Readiness

**Maturity: Lab demo / Internship project.** Not internal MVP, not production, not OSS-ready.

| Level | Qualifies? | Why |
|---|---|---|
| Prototype | ✅ exceeded | Real schema, migrations, deployed. |
| Lab demo | ✅ this is it | Works end-to-end for a trusted clicker. |
| Internship project | ✅ this is it | Strong full-stack skill on display. |
| Internal lab MVP | ❌ | No auth = no accountability for who took a €2k drone. |
| Production internal tool | ❌ | Public unauth API; no proven backups; no audit trail. |
| Open-source ready | ❌ | "All rights reserved" license, no tests, secrets in image, IP committed. |
| Enterprise self-hosted | ❌ | No multi-tenancy, no auth, no RBAC. |
| Commercial SaaS | ❌ | Same + no billing/onboarding/isolation. |

**Strengths (genuine):**
- Clean, idiomatic FastAPI + SQLAlchemy structure (routers/models/schemas).
- **Concurrency handled well** — `with_for_update()` row locks in `checkout_item`,
  `cart_checkout`, `unit_cart_checkout`, unified cart. Deliberate (commit `e570ce1`).
- Strong DB integrity: migration `0006` adds CHECK constraints for enums,
  non-negative quantities, `available <= quantity`, partial indexes.
- Atomic all-or-nothing cart validation.
- Parameterized queries throughout (ORM) — no SQL injection surface.

**Weaknesses / immediate risks:**
1. No auth/authz — **Critical.**
2. No `.dockerignore` + `COPY . .` → `backend/.env` baked into image layer — **High.**
3. DB creds `inv_user:inv_pass` hardcoded in committed `docker-compose.yml` — **High.**
4. Origin IP `167.233.110.162` + Coolify project path committed in
   `.playwright-mcp/console-2026-06-10T11-46-47-214Z.log` → Cloudflare bypass — **High.**
5. No security headers (nginx serves none). No CSP/HSTS/X-Frame-Options — **Medium.**
6. CORS `*` methods/headers with `allow_credentials=True` — **Medium.**
7. Zero automated tests — **Medium** (High for OSS credibility).
8. Migrations auto-run on startup (`main.py`) — breaks with 2 replicas — **Medium.**

**Brutally honest summary:** excellent internship/portfolio project; not a real product
and not safe to expose. You built a high-quality inventory **engine** wrapped in a
**costume of security**. Closing the auth gap jumps it two maturity levels.

---

## Section 2 — Threat Model

| Asset | Threat | Attacker | Attack path | Impact | Likelihood | Control | Priority |
|---|---|---|---|---|---|---|---|
| User PII | Mass exfiltration | Anonymous | `GET /users/` | High | Certain | Auth on all routes | P0 |
| Inventory + history | Destruction | Anonymous | `DELETE /items/{id}` cascades transactions | High | Certain | Auth + admin-only + soft delete | P0 |
| Accountability ledger | Forged/repudiated actions | Insider/anon | `user_id` is client-supplied | High | Certain | Derive actor from session | P0 |
| Origin server | Cloudflare bypass / DoS | Opportunistic | Committed IP `167.233.110.162` | Med-High | Medium | Rotate IP, firewall to CF IPs | P0 |
| DB credentials | Theft | Anyone w/ repo/image | Compose `inv_pass`; image bakes `.env` | High | Medium | Coolify secrets, `.dockerignore`, rotate | P0 |
| Coolify dashboard | Infra takeover | Internet | Exposed on raw IP (seen in log) | Critical | Medium | CF Access / IP allowlist / VPN | P0 |
| Item name/desc | Stored XSS / CSV injection | Any user | `POST /items` name=`<script>` / `=cmd` | Medium | Medium | Output encoding, CSP, validation | P1 |
| Asset records | IDOR | Any user | Sequential int IDs | Medium | Certain today | Object-level authz | P1 |
| Login | Brute force / enumeration | — | N/A today; relevant once auth exists | — | — | Rate limit + lockout | P1 |
| Dependencies | Supply chain | Upstream | `package.json` pins `"latest"` | Medium | Medium | Pin versions, Dependabot | P1 |
| QR codes | Malicious payload | Anyone | Encodes only `asset_code` (safe) | Low | Low | Treat scanned text as opaque key (you do) | P2 |

Sharpest realistic threat: **insider repudiation.** An intern who breaks a drone can
today check it in as "good" or delete the transaction — no audit trail, no identity binding.

---

## Section 3 — Security Review (OWASP-aligned)

### Authentication — Critical
No authentication exists (role picker only). No password storage, token, session,
email verification, reset, lockout, or MFA.
**Fix:** `User.password_hash` (Argon2id via `argon2-cffi`, or bcrypt via `passlib`).
`POST /auth/login` issuing a short-lived JWT + refresh, *or* server-side sessions with
an httpOnly + Secure + SameSite=Strict cookie (simpler/safer here). `Depends(get_current_user)`
on every router. Roles come from the DB user, never the client.

### Authorization — Critical
- No function-level or object-level authz. `ProtectedRoute` only hides UI.
- `delete_user`, `delete_item`, `create_user` have no guard.
- IDOR: sequential int IDs everywhere (`/items/{id}`, `/users/{id}`, `/units/{id}`).
**Fix:** `require_role("admin")` dependency for destructive/admin endpoints. Derive the
acting user from the session — **never accept `user_id` in checkout/checkin bodies**
(today anyone can check out items *as* anyone else and frame them).

### Input / Output — Medium
- SQL injection: **not present** (ORM + bound params, incl. `ilike` search).
- Stored XSS: item `name`/`description` accept arbitrary text. React escapes by default,
  but no server-side validation; CSV export (future) → **CSV injection** (`=cmd|...`).
  Add length + content validation in Pydantic schemas now.
- No request body size limits → memory exhaustion. Add at Traefik/nginx + FastAPI.

### API Security — Critical/High
- Missing auth/authz on every route.
- Mass assignment risk: `User(**payload.model_dump())`, `setattr(item, field, value)`.
  Contained today by explicit schemas — keep schemas tight; never use ORM model as input.
- Excessive data exposure: `GET /users/` returns all emails, unauthenticated.
- No rate limiting, no API versioning. Error messages clean (good).
- **No audit logging** of dangerous actions — a core feature gap for an accountability tool.

### Data Protection — High
- No password hashing (no passwords yet) — use Argon2id when auth lands.
- **Secrets in image layers:** no `.dockerignore` + `COPY . .` bakes `backend/.env`.
  Add `backend/.dockerignore` + `frontend/.dockerignore` excluding `.env*`, `venv/`,
  `__pycache__/`, `node_modules/`, `dist/`.
- **Secrets in git:** `docker-compose.yml` ships `inv_user:inv_pass`. Move to Coolify
  env; rotate the real prod password (assume compromised).
- Postgres not published in compose (good — internal `app_network` only). Verify Hetzner
  firewall blocks 5432 externally.

### Frontend Security — Medium
- Role in `sessionStorage` — wrong instinct for real tokens; use httpOnly cookies later.
- No CSP / security headers from nginx.
- Confirm `vite.config.js` does not enable prod source maps (default off — verify build).
- CORS: `allow_methods=["*"], allow_headers=["*"], allow_credentials=True` in `main.py`.
  Explicit origins are the one thing keeping this safe — enumerate methods/headers.

### Deployment Security — High
- Origin IP committed → Cloudflare bypass. Rotate, or firewall origin to Cloudflare IPs only.
- Coolify dashboard reachable on raw IP:port (the Playwright log is a session against
  `167.233.110.162:8000` showing the Coolify login). Lock behind CF Access / allowlist / Tailscale.
- Traefik `certresolver=letsencrypt` fine; confirm HTTP→HTTPS redirect and no plain-HTTP API.

---

## Section 4 — Cloudflare Checklist (target state — verify against dashboard)

**DNS:** `aryx.dev`, `www`, `api` all **proxied (orange)**. Delete stale records. No
wildcard unless needed. Origin IP leaked, so pair proxy with origin firewalling (Section 5).

**SSL/TLS:** Mode **Full (Strict)**. Always Use HTTPS **On**. Auto HTTPS Rewrites **On**.
Min TLS **1.2**. TLS 1.3 **On**. HSTS **On** `max-age=31536000; includeSubDomains; preload`
(only once everything is HTTPS — it's sticky).

**Security:** WAF Managed Rules **On** (CF Managed + OWASP Core). Rate-limit `api.aryx.dev/*`
and especially future `/auth/login` (e.g. 5 req/10s/IP). Bot Fight Mode **On**.
**Cloudflare Access in front of `api.aryx.dev` + Coolify dashboard** — fastest stopgap.
Turnstile on future login/register.

**Caching:** Never cache `/api/*` or authenticated pages — add a bypass rule for
`api.aryx.dev`. Cache hashed Vite static assets aggressively.

**Headers (set in ONE place — nginx or CF Transform Rules):** HSTS,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(self)` (QR scanner needs camera), CSP (start report-only),
`frame-ancestors 'none'`.

**Fastest stopgap order:** (1) CF Access on API + Coolify, (2) firewall origin to CF IPs,
(3) build real auth.

---

## Section 5 — Hetzner VPS (verify + answer key)

- Enable `unattended-upgrades`.
- **Hetzner Cloud Firewall:** allow **80/443 from Cloudflare IP ranges only**; **22 from
  your IP/VPN only**; deny everything else, explicitly **5432** and **8000**.
- SSH: `PermitRootLogin no`, `PasswordAuthentication no`, keys only, non-root sudo user,
  `fail2ban`.
- Docker: never expose the socket over TCP; only Coolify/Traefik should mount it.
- Monitoring: disk/mem/CPU alerts, SSL-expiry alert, backup-success alert.

**Recommended port exposure:**

| Port | Exposure |
|---|---|
| 80/443 | Public, **only from Cloudflare IPs** |
| 22 SSH | Private — your IP / VPN |
| 5432 Postgres | **Private only — never public** |
| 8000 backend | Internal only — via Traefik |
| Coolify dashboard | **VPN / CF Access / allowlist — currently looks public, fix now** |

---

## Section 6 — Coolify Hardening

- Move all secrets (DB URL, password) into Coolify's env store; mark as secrets so they
  don't print in build/deploy logs. Stop shipping them in `docker-compose.yml`.
- Separate prod vs dev env (keep prod values only in Coolify).
- Confirm `db_data` volume persistent and in Coolify backups.
- Enable scheduled Postgres backups → push off-server (S3/Backblaze).
- Add Docker `HEALTHCHECK` hitting `/health` (endpoint exists — wire it up).
- Restart policy `unless-stopped` is set — good.
- **Lock the Coolify dashboard** (Access/VPN). Secure GitHub webhook with a secret.
  Disable preview deployments (they'd spin up unauthenticated copies of the API).
- Set resource limits (mem/CPU).

---

## Section 7 — Database & Data Integrity

**Good:** FKs present; unique constraints on `asset_code`, `email`, `(item_id, unit_number)`;
`0006` adds CHECK constraints + partial indexes; timestamps on most tables.

**Problems:**
1. **Hard deletes destroy history.** `Item.transactions` is `cascade="all, delete-orphan"`;
   `DELETE /items/{id}` wipes the asset *and its ledger*. **Fix: soft delete**
   (`deleted_at`/`is_archived`); block deleting items with history; filter from lists.
2. **No audit log table.** Add `audit_log` (actor_id, action, entity, entity_id,
   before/after JSON, timestamp).
3. **`current_holder_id` on quantity items is lossy** — only the last holder is recorded
   (ledger has the truth). Drop it for bulk items or document as "last holder."
4. Migrations auto-run on startup — move to an explicit deploy step / init container.
5. No evidence of automated encrypted off-site backups — top reliability gap after auth.

**Schema completeness:** covers parent items, units (serialized), quantity stock,
categories, locations, conditions, statuses, holder, checkout/return, sessions.
**Missing for enterprise:** vendors/suppliers, purchase date & cost, warranty expiry,
maintenance records, reservations, attachments/manuals, drone-specific metadata (Section 9).
Add generic `attachments` + `maintenance_log` tables first.

---

## Section 8 — Inventory Logic

Strongest part of the codebase.

- **Double check-out of a unit?** Prevented — `with_for_update()` + reject `checked_out`. ✅
- **Damaged item checkout?** Blocked for units (`condition == "damaged"`). ❌ **Not blocked
  for bulk/quantity items** (`checkout_item`, `cart_checkout` never check condition).
- **Maintenance/retired checkout?** ❌ Not blocked anywhere — only `available_quantity` is
  checked, not status. Reject when `status in (maintenance, retired)`.
- **Delete item with history?** ❌ Allowed, cascades history (Section 7).
- **Fake return / return by wrong person?** ⚠️ `user_id` client-supplied; anyone returns as
  anyone; no holder check. Derive actor from session + validate.
- **URL ID tampering?** Returns the asset; ❌ no authz, so wide open today.
- **Every checkout/return linked to user + timestamp?** ✅ in transactions.
- **Consumables vs assets?** ✅ `track_units` split; unified cart cross-checks in-flight
  quantities. Well done.
- **Race conditions / transaction safety?** ✅ Row locks + atomic commits.
- **Approval / reservations / overdue notify / admin audit?** ❌ None. Overdue is *computed*
  (`due_date < now`) but nothing notifies.

**Add:** block checkout on bad status/condition for bulk; reservations; overdue
notifications; approval step for high-value assets; server-derived actor.

---

## Section 9 — Drone Lab Features

**Must-have for lab deployment:**
- Battery tracking: **cycle count, storage voltage, health %** (LiPo safety = #1 lab pain).
- **Component → drone build assignment** (which FC/motors/props are on which airframe now).
- Maintenance log + crash/damage reports tied to an airframe.
- Pre-flight / post-flight checklists attached to a checkout.
- Flight-readiness status per drone (computed gate).

**Impressive for GitHub:** firmware version + calibration date per FC/IMU/compass;
flight hours per airframe/motor; batch-printable QR label sheets.

**Valuable for commercial:** compatibility matrix; reservation calendar; consumable
reorder thresholds + alerts; per-lab safety compliance reports.

**Advanced future:** flight-log platform integration; charger telemetry; predictive
maintenance on flight hours.

Maps to: `drone_build`, `battery_health`, `maintenance_log`, `checklist` tables.

---

## Section 10 — Frontend / UI / UX

Above student-grade: real sidebar IA (Main/Records), Checkout Desk, live-scan, item-detail
redesign (see `docs/superpowers/` specs). Strength.

Gaps:
- Top user widget shows **"Unknown"** (no real identity) — broadcasts the fake-auth problem.
- No landing/marketing page or docs page (needed for OSS + product).
- Verify delete actions have confirm modals.
- Standardize empty/loading/error states.
- Accessibility + tablet (checkout desk is often a door tablet) — verify keyboard nav,
  touch targets.

Enterprise feel: real authenticated user menu, audit/activity view, consistent toasts,
printable QR label sheet.

---

## Section 11 — Backend / API Architecture

Clean, conventional structure. Refactors:
1. **Auth/authz layer** (the big one).
2. Extract business logic into a `services/` layer — checkout logic is duplicated across
   `items.py`, `units.py`, `checkout.py` (`_set_status_from_availability`,
   `_recompute_item_counts`). Consolidate.
3. Add `/v1` versioning prefix.
4. Structured logging + audit logger.
5. Request size limits + rate limiting (`slowapi`).
6. **Disable `/docs` in prod or put behind auth** (it documents the entire open API today).
7. Move Alembic out of `on_startup`.

---

## Section 12 — Frontend Code

- Folder structure (pages/components/api/context) clean for this size.
- `api/client.js` tidy axios wrapper. Add a 401→login interceptor once auth exists.
- Local + context state — fine; no Redux needed.
- **Pin dependencies** — `package.json` uses `"latest"` for react, vite, axios, router.
  Reproducibility + supply-chain risk. Pin exact versions.
- Verify prod build has no source maps and no sensitive `console.log`.
- Route gating must fail closed — but remember UI gating is cosmetic; the API is the real gate.

---

## Section 13 — Testing Plan

Zero tests today, in a system whose value is checkout-accounting correctness.

**Write first (protect money):**
1. Concurrency / double-checkout — two simultaneous `checkout_unit` → exactly one wins.
2. Cart atomicity — unavailable item 3 rolls back items 1–2.
3. Quantity invariants — `available_quantity` never < 0 or > `quantity`.
4. Authz (once auth lands) — student can't hit admin; user A can't act as B.
5. Status/condition gates — damaged/maintenance/retired can't be checked out.

Tools: `pytest` + TestClient/`httpx` + Postgres test DB; Playwright for E2E (already used).
Run in **GitHub Actions** on every PR. Automate 1–3 first.

---

## Section 14 — GitHub Open-Source Readiness

Blockers:
- **LICENSE conflict:** "All rights reserved, viewing only" vs. OSS goal. Pick a real license
  (MIT for portfolio/adoption; AGPL-3.0 for open-core SaaS protection). Decide intent first.
- Remove committed `.playwright-mcp/` logs (leak origin IP + Coolify path) — **scrub from
  history** (`git filter-repo`), then rotate the IP.
- Add `.dockerignore`, pin deps, add tests, `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, issue/PR templates, Dependabot, secret scanning, CI.
- README is good — add screenshots, architecture diagram, one-command deploy guide.

**Deliverables:**
1. Repo name: `dronelab-inventory` (or `hangar`).
2. Description: "Open-source asset & checkout tracking for drone and hardware labs —
   serialized units, QR codes, and check-in/out accountability."
3. README outline: Hero+screenshot → Features → Architecture → Quickstart (Compose) →
   Production deploy (Coolify/Cloudflare/Hetzner) → Config → API docs → Roadmap →
   Contributing → License.
4. Tagline: "Know where every drone, battery, and bolt is — and who has it."
5. Screenshots: Dashboard, Inventory list, Item detail (QR), Checkout Desk, Live-scan,
   Transactions/audit.
6. Badges: build, license, Python/Node versions, PRs welcome, Docker.
7. License: AGPL-3.0 if any SaaS ambition (open-core); MIT if pure portfolio.
8. Strategy: killer one-command seeded demo + public demo login, then the blog post (Section 16).

---

## Section 15 — Commercial Product

**Who pays:** university drone/robotics labs, makerspaces, UAV startups, hardware R&D —
the lab manager tracking €50k+ of gear in a spreadsheet and losing batteries.

**Pain solved:** accountability ("who has the Mavic?") + LiPo safety + avoiding duplicate
purchases. Generic tools (Snipe-IT) don't understand batteries/airframes/builds/flight-readiness
— **that domain depth is the wedge.**

**Makes them pay:** battery health/cycles, drone builds, flight-readiness gating, checklists,
reservation calendar, multi-lab/SSO.

**Don't build yet:** billing, complex permissions, native mobile, integrations.

**Model:** **open-core** — AGPL self-hosted core + paid cloud SaaS + Pro features
(SSO, multi-lab, reports). Focus drone labs first (depth beats breadth).

**Realistic take:** credible niche tool, not venture-scale. As open-core with a few labs
and strong GitHub presence, an excellent flagship. Grow it as the portfolio centerpiece
that happens to have real users.

---

## Section 16 — Portfolio / Recruiter

Describe the engineering honestly (don't claim secure auth you lack; do claim the
concurrency work, which is senior-flavored).

**Resume bullets:**
- "Built and deployed a full-stack inventory & checkout system (React, FastAPI, PostgreSQL)
  for a drone lab, handling serialized-asset and bulk-consumable tracking with QR-code IDs."
- "Engineered concurrency-safe checkout flows using row-level locking and atomic multi-item
  transactions to prevent double-allocation of shared equipment under simultaneous use."
- "Containerized and self-hosted on Hetzner via Coolify with Traefik/Let's Encrypt TLS and
  Cloudflare, hardening the DB schema with CHECK constraints, partial indexes, and
  migration-based integrity guarantees."

**LinkedIn:** "An open-source asset-management platform for drone and hardware labs. Tracks
every airframe, battery, and component through its checkout lifecycle with QR codes and a
full transaction ledger. React + FastAPI + PostgreSQL, self-hosted on Hetzner/Coolify behind
Cloudflare. Focus on data integrity: concurrency-safe checkouts and DB-enforced invariants."

**Demo script (60s):** "Labs lose track of expensive gear. Dashboard — 40 assets, 8 checked
out. Scan this drone's QR at the checkout desk, assign to a student with a due date — now
unavailable, ledger logged who took it. A second person tries the same unit — rejected,
because checkouts are concurrency-safe. On return we record condition. Every action is
timestamped and attributable."

**Blog post:** "Preventing double-checkout: row-level locking and atomic carts in FastAPI" —
your standout technical story.

**Interview caution:** a sharp reviewer will ask "how does auth work?" Have the honest answer:
"prototype used a role selector; I'm implementing session-based auth with Argon2 + server-side
RBAC" — ideally done before showing it.

---

## Section 17 — Monitoring, Logging, Maintenance

- Health: wire `/health` into Docker `HEALTHCHECK` + Uptime Kuma / free uptime monitor.
- Errors: Sentry (free) on frontend + backend.
- Server/DB: Coolify metrics + disk/mem alerts; SSL-expiry alert; backup-success alert.
- Audit logs: failed logins (post-auth), admin actions, checkouts/returns, role changes, deletions.
- **Never log:** passwords, tokens, cookies, full DB connection strings, excess PII.
- Retention: app/audit 90–180 days; security events 1 year; rotate to bound disk.

---

## Section 18 — Backup & Disaster Recovery

**Small lab:** nightly Coolify `pg_dump` → encrypted → off-server (Backblaze/S3); weekly
Hetzner snapshot; **test a restore monthly.** RPO 24h, RTO a few hours.

**Commercial:** WAL archiving / PITR, cross-region storage, automated restore drills,
RPO ≤15min / RTO ≤1h.

**Runbooks:**
- VPS dies → restore snapshot or rebuild via Coolify from git + DB dump.
- DB corrupted → restore latest verified dump.
- **Secret leaks → rotate everywhere, invalidate sessions, audit access.** *(Active now: DB
  password pattern + origin IP are public — rotate both.)*
- Admin account compromised → force-logout all sessions, reset, review audit log.

---

## Section 19 — Compliance & Trust

**Necessary now (internal lab):** basic data-retention note, admin-access policy, audit logs,
`SECURITY.md` with disclosure contact, export/delete path (you store names + emails = PII).

**Can wait:** full Terms/Privacy, formal incident-response, access-review process — needed
when external users arrive.

**Chain-of-custody** for expensive assets is mostly present in the transaction ledger —
make it append-only/tamper-evident and it becomes a selling point.

---

## Section 20 — Roadmap

| Phase | Goal | Key tasks | DoD | Difficulty | Priority |
|---|---|---|---|---|---|
| 0 Audit | Understand risk | This review | You've read this | trivial | P0 |
| 1 Security | Stop the bleeding | Real auth (session+Argon2) + RBAC on every route; actor from session; CF Access on API+Coolify; firewall origin to CF IPs; rotate DB pw + IP; `.dockerignore`; scrub `.playwright-mcp/`; disable prod `/docs` | Anon `curl` → 401; no secrets in repo/image | medium | **P0** |
| 2 Reliability | No data/accountability loss | Soft delete + block delete-with-history; `audit_log`; encrypted off-site backups + tested restore; migrations out of startup | Deleting preserves history; restore drill passes | medium | P0/P1 |
| 3 Lab MVP | Lab trusts it | Block checkout on bad status/condition for bulk; overdue notifications; printable QR sheets; real user menu; confirm modals; core tests in CI | Full week of real accountability | medium | P1 |
| 4 OSS launch | Others can use it | License; README screenshots + diagram; SECURITY/CONTRIBUTING/templates; Dependabot + secret scanning; one-command demo + demo login; pin deps | Stranger deploys in <15 min | low-med | P1/P2 |
| 5 Drone features | Stand out | Battery health/cycles; drone builds; maintenance log; checklists; flight-readiness gate | A drone lab says "this gets us" | med-high | P2 |
| 6 Self-hosted product | Other labs run it | Branding config; multi-location; reservations; reports; upgrade path | — | high | P3 |
| 7 SaaS | Paid customers | Multi-tenancy + isolation; SSO; billing; onboarding; cloud ops | — | high | P3 |

---

## Section 21 — Ranked Action Plan

**Do this week (P0 — security & integrity):**
1. Implement real authentication — `password_hash` (Argon2id) on `User`, `POST /auth/login`,
   httpOnly+Secure+SameSite cookie session. *(backend: new `auth.py`, `models/user.py`, `main.py`)*
2. Add `Depends(get_current_user)` + `require_role()` to every router — fail closed. *(`routers/*.py`)*
3. Stop accepting `user_id` in checkout/checkin bodies — derive actor from session.
   *(`items.py`, `units.py`, `checkout.py`, schemas)*
4. Cloudflare Access on `api.aryx.dev` + Coolify dashboard — stopgap before #1 ships. *(CF dashboard)*
5. Firewall origin to Cloudflare IPs; rotate origin IP + DB password — they're public.
   *(Hetzner firewall, Coolify env)*
6. Add `backend/.dockerignore` + `frontend/.dockerignore`; remove secrets from `docker-compose.yml`.
7. Scrub `.playwright-mcp/` from git history and delete the files. *(git filter-repo)*
8. Soft-delete items; block deletion of items with transaction history. *(`models/item.py`, `routers/items.py`)*
9. Automated encrypted Postgres backups off-server + one tested restore. *(Coolify)*

**Next (P1 — trust & correctness):**
10. `audit_log` table; log every admin/destructive action.
11. Block checkout when `status in (maintenance, retired)` or `condition == damaged` for bulk too.
    *(`items.py`, `checkout.py`)*
12. Concurrency + cart-atomicity + invariant tests in GitHub Actions. *(`tests/`, `.github/workflows/`)*
13. Disable `/docs` in prod; add `/v1` prefix; rate limiting (`slowapi`) + request size limits. *(`main.py`)*
14. Pin frontend deps off `"latest"`; enable Dependabot + secret scanning. *(`package.json`, repo settings)*
15. Security headers (CSP report-only, HSTS, nosniff, frame-ancestors) via nginx or Cloudflare. *(`nginx.conf`)*

**Then (P2 — product & portfolio):**
16. Real authenticated user menu (kills the "Unknown" display). *(`Sidebar`, `AuthContext`)*
17. Drone features: battery health/cycles, drone builds, maintenance log, flight-readiness gate.
18. Pick a license; polish README (screenshots + diagram); add SECURITY/CONTRIBUTING.
19. One-command seeded demo + public demo login.
20. Write the "preventing double-checkout" blog post.

---

## What I still need (dashboards not visible to code review)

1. Cloudflare → DNS (records + proxy status), SSL/TLS mode, Security (WAF/rate-limit), Access config.
2. Hetzner → Cloud Firewall inbound rules.
3. Coolify → service env-vars screen (names only, blur values); is the dashboard public?
4. Confirm: is `api.aryx.dev` reachable now without any login? (Code says yes —
   `curl https://api.aryx.dev/users/` confirms severity for your records.)

**Bottom line:** a genuinely good inventory engine with senior-level concurrency handling and
DB integrity, wrapped in a fake login that enforces nothing, exposed to the open internet. Fix
the auth layer and infra exposure (Phase 1) and it goes from "impressive demo that would fail a
security screen" to "trustworthy lab tool and a portfolio piece you can defend in any interview."
