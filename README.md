# Inventory Management System

A web-based inventory management system built for the SAFCSP drone lab. It tracks physical assets — drones, cameras, batteries, and other equipment — across their full lifecycle: storage, check-out, active use, and return.

---

## What It Does

- **Inventory tracking** — Every item has a unique asset code, serial number, condition, status, and storage location. Quantities update automatically as items are checked out and returned.
- **Check-out / check-in** — Users can borrow items and return them. Returns record condition on return and optionally capture notes.
- **QR codes** — Each item gets a generated QR code tied to its asset code. Scanning a QR code opens the item's detail page directly.
- **Transaction history** — Every check-out and check-in is logged with timestamps, the user involved, quantity, and notes.
- **Categories & locations** — Items are organised by category (e.g. Drones, Cameras & Payloads, Batteries & Power) and physical location (e.g. Drone Cage A, Charging Station, Lab Bench).
- **Dashboard** — At-a-glance summary of total items, available stock, checked-out items, and recent activity.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| QR codes | `qrcode` + `Pillow` (generated server-side) |

---

## Project Structure

```
Inventory_management_system/
├── backend/
│   ├── app/
│   │   ├── models/        ← SQLAlchemy models (Item, User, Category, Location, Transaction)
│   │   ├── schemas/       ← Pydantic request/response schemas
│   │   ├── routers/       ← API route handlers (items, users, categories, locations, transactions)
│   │   └── database.py    ← DB engine and session setup
│   ├── alembic/           ← Database migrations
│   ├── seed.py            ← Sample data loader
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/         ← Dashboard, Inventory, CheckoutDesk, Transactions, QRLookup
    │   ├── components/    ← Sidebar, layout components
    │   └── api/           ← Axios API client wrappers
    └── package.json
```

---

## API

The backend exposes a REST API at `http://localhost:8000`. Interactive docs (Swagger UI) are available at `http://localhost:8000/docs`.

| Resource | Endpoint prefix |
|---|---|
| Items | `/items` |
| Users | `/users` |
| Categories | `/categories` |
| Locations | `/locations` |
| Transactions | `/transactions` |

---

## Getting Started

Choose your platform:

- [Windows](#windows)
- [Linux](#linux)

### Database Options

The backend connects to PostgreSQL via a `DATABASE_URL` environment variable.

#### Local Docker — two modes

| Mode | Compose file | Seed data | Volume | Use when |
|---|---|---|---|---|
| **Test / Demo** | `docker-compose.test.yml` | Yes — run `seed.py` | `postgres_data_test` | Exploring the app with dummy data |
| **Real / Production** | `docker-compose.yml` | No — add your own data | `postgres_data` | Entering real inventory data to keep |

Both modes use the same credentials and port — `backend/.env` does not change between them. You can only run one at a time (they share port 5433). Data in each mode lives in its own separate volume so switching between them never overwrites anything.

The `postgres_data` volume (real mode) persists on your laptop and can be [migrated to a server](#migrating-to-a-server) when you're ready.

#### Remote (self-hosted)

Point `DATABASE_URL` at any external PostgreSQL instance — useful for a shared team database or a lab server.

---

### Prerequisites

| Tool | Required for | Version |
|---|---|---|
| Python | Backend | 3.10+ |
| Node.js + npm | Frontend | 18+ |
| Docker Desktop | Local DB only | any recent |
| Git | Both | any |

> If you are using a remote database you do **not** need Docker.

---

### Windows

#### Step 1 — Start the database

**Option A — Local database (Docker)**

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) if you haven't already.

**Test / Demo database** (dummy data — for exploring the app):

```powershell
docker compose -f docker-compose.test.yml up -d
```

**Real / Production database** (empty — add your own data):

```powershell
docker compose up -d
```

Then copy the pre-filled local env file (same for both modes):

```powershell
Copy-Item backend\.env.local.example backend\.env
```

**Option B — Remote database**

```powershell
Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and fill in your credentials:
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
FRONTEND_ORIGIN=http://localhost:5173
```

---

#### Step 2 — Backend setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> If you get a script execution error run:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Run migrations (creates all tables):

```powershell
alembic upgrade head
```

Seed sample data — **test/demo mode only**, skip this for the real database:

```powershell
python seed.py
```

> `seed.py` loads a full demo dataset: 6 categories, 5 locations, 5 users, and 20 items. Safe to run multiple times.

Start the backend:

```powershell
uvicorn app.main:app --reload --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

---

#### Step 3 — Frontend setup

Open a **new terminal** (keep the backend running):

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

App: **http://localhost:5173**

---

#### Quick Reference (Windows)

**Terminal 1 — Backend**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```powershell
cd frontend
npm run dev
```

**Stop local Docker DB when done:**
```powershell
docker compose down
```

---

### Linux

#### Step 1 — Start the database

**Option A — Local database (Docker)**

```bash
sudo apt install docker.io docker-compose-plugin   # Debian/Ubuntu
# or follow https://docs.docker.com/engine/install/
```

**Test / Demo database** (dummy data — for exploring the app):

```bash
docker compose -f docker-compose.test.yml up -d
```

**Real / Production database** (empty — add your own data):

```bash
docker compose up -d
```

Then copy the pre-filled local env file (same for both modes):

```bash
cp backend/.env.local.example backend/.env
```

**Option B — Remote database**

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your credentials:
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
FRONTEND_ORIGIN=http://localhost:5173
```

---

#### Step 2 — Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python seed.py   # test/demo mode only — skip for the real database
uvicorn app.main:app --reload --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

---

#### Step 3 — Frontend setup

Open a **new terminal** (keep the backend running):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: **http://localhost:5173**

---

#### Quick Reference (Linux)

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

**Stop local Docker DB when done:**
```bash
docker compose down
```

---

## Switching Databases

Edit one line in `backend/.env` and restart the backend — no code changes needed:

```env
# Local Docker
DATABASE_URL=postgresql+psycopg2://inv_user:inv_pass@localhost:5432/drone_inventory

# Remote (replace with real values)
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
```

---

## Migrating to a Server

When you're ready to move your real database from your laptop to a lab server:

**Step 1 — Dump the database (on your laptop):**

```bash
docker exec $(docker compose ps -q db) pg_dump -U inv_user drone_inventory > backup.sql
```

**Step 2 — Copy the dump to the server** (via scp, USB, or any file transfer):

```bash
scp backup.sql user@lab-server:/path/to/backup.sql
```

**Step 3 — Restore on the server** (after Coolify/Docker starts the DB there):

```bash
docker exec -i <postgres-container-name> psql -U inv_user drone_inventory < backup.sql
```

> The test database (`postgres_data_test` volume) is throwaway — only the real database (`postgres_data` volume, started with `docker compose up -d`) needs to be migrated.

---

## Useful Commands

| Task | Command (run from `backend/` with venv active) |
|---|---|
| Apply migrations | `alembic upgrade head` |
| New migration | `alembic revision --autogenerate -m "description"` |
| Roll back one migration | `alembic downgrade -1` |
| Re-seed sample data | `python seed.py` |
| Start real DB | `docker compose up -d` (from project root) |
| Start test/demo DB | `docker compose -f docker-compose.test.yml up -d` (from project root) |
| Stop local DB | `docker compose down` (from project root) |

| Task | Command (run from `frontend/`) |
|---|---|
| Start dev server | `npm run dev` |
| Production build | `npm run build` |
| Preview production build | `npm run preview` |

---

## Troubleshooting

**`DATABASE_URL is not configured`**
→ `backend/.env` is missing. Copy from `.env.local.example` (local) or `.env.example` (remote) and fill it in.

**`alembic` / `uvicorn` not found**
→ Your virtual environment isn't active.
- Windows: `.\venv\Scripts\Activate.ps1`
- Linux: `source venv/bin/activate`

**`could not connect to server` or `Connection refused` on port 5432**
→ The Docker container isn't running. Run `docker compose up -d` from the project root and wait a few seconds.

**Frontend shows network errors or blank data**
→ Make sure the backend is running on port 8000 and `VITE_API_BASE_URL=http://localhost:8000` is set in `frontend/.env`.

**`psycopg2` fails to install**
→ The project uses `psycopg2-binary` (pre-compiled). Ensure you're on Python 3.10+ and that your venv is active.
