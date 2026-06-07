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

## Database Modes

Three modes — pick the one that matches your situation.

| Mode | Docker file | Env file | Port | DB name | Persists? |
|---|---|---|---|---|---|
| [1 — Test / Demo](#mode-1--test--demo) | `docker-compose.test.yml` | `backend/.env.test` | 5434 | `drone_inventory_test` | No |
| [2 — Local Real](#mode-2--local-real) | `docker-compose.yml` | `backend/.env` | 5433 | `drone_inventory` | Yes |
| [3 — Coolify / Production](#mode-3--coolify--production) | managed by Coolify | `backend/.env.production` | remote | your choice | Yes |

---

### Mode 1 — Test / Demo

Throwaway database pre-loaded with dummy data. Nothing here needs to be kept — wipe and restart freely.

**1. Start the container:**
```bash
docker compose -f docker-compose.test.yml up -d
```

**2. Point the backend at it:**
```bash
cp backend/.env.test backend/.env
```

**3. Apply migrations and seed dummy data** (from `backend/` with venv active):
```bash
source venv/bin/activate
python -m alembic upgrade head
python seed.py
```

> Loads 6 categories, 5 locations, 5 users, and 20 items. Safe to run multiple times.

**To wipe and start fresh:**
```bash
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d
```

---

### Mode 2 — Local Real

Your actual inventory data. Persists in the `postgres_data` Docker volume across restarts. This is what you'll export to the server.

**1. Start the container:**
```bash
docker compose up -d
```

**2. The `backend/.env` is already configured for this mode** — no copy needed. Verify it contains:
```env
DATABASE_URL=postgresql+psycopg2://inv_user:inv_pass@localhost:5433/drone_inventory
```

**3. Apply migrations** (from `backend/` with venv active):
```bash
source venv/bin/activate
python -m alembic upgrade head
```

The database starts empty. Do **not** run `seed.py` — start entering your real data through the app.

---

### Mode 3 — Coolify / Production

When you're ready to move your local data to the server.

#### Step A — Export from your laptop

```bash
docker exec $(docker compose ps -q db) pg_dump -U inv_user drone_inventory > backup.sql
```

#### Step B — Copy to the server

```bash
scp backup.sql user@your-server:/path/to/backup.sql
```

#### Step C — Configure the production env file

Copy the template and fill in your Coolify PostgreSQL credentials:
```bash
cp backend/.env.production.example backend/.env.production
```

Open `backend/.env.production` and fill in the values from your Coolify PostgreSQL service:
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
FRONTEND_ORIGIN=https://<your-domain>
```

You can find these credentials in the Coolify dashboard → your PostgreSQL service → **Connection details**.

#### Step D — Restore on the server

SSH into the server and run:
```bash
docker exec -i <postgres-container-name> psql -U <user> <dbname> < backup.sql
```

> Only Mode 2 data needs migrating. Mode 1 (test) is throwaway — do not export it.

---

## Getting Started

Choose your platform:

- [Windows](#windows)
- [Linux](#linux)

> See [Database Modes](#database-modes) above to decide which database to start before running through these steps.

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

Follow [Database Modes](#database-modes) to decide which database to use, then:

**Test / Demo (Mode 1):**
```powershell
docker compose -f docker-compose.test.yml up -d
Copy-Item backend\.env.test backend\.env
```

**Local Real (Mode 2):**
```powershell
docker compose up -d
# backend\.env is already configured — no copy needed
```

**Coolify / Production (Mode 3):**
```powershell
Copy-Item backend\.env.production.example backend\.env.production
Copy-Item backend\.env.production backend\.env
```
Open `backend/.env` and fill in your Coolify PostgreSQL credentials.

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

Follow [Database Modes](#database-modes) to decide which database to use, then:

**Test / Demo (Mode 1):**
```bash
sudo apt install docker.io docker-compose-plugin   # Debian/Ubuntu — skip if already installed
docker compose -f docker-compose.test.yml up -d
cp backend/.env.test backend/.env
```

**Local Real (Mode 2):**
```bash
docker compose up -d
# backend/.env is already configured — no copy needed
```

**Coolify / Production (Mode 3):**
```bash
cp backend/.env.production.example backend/.env.production
cp backend/.env.production backend/.env
```
Open `backend/.env` and fill in your Coolify PostgreSQL credentials.

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

## Useful Commands

| Task | Command (run from `backend/` with venv active) |
|---|---|
| Apply migrations | `python -m alembic upgrade head` |
| New migration | `python -m alembic revision --autogenerate -m "description"` |
| Roll back one migration | `python -m alembic downgrade -1` |
| Seed dummy data (test mode only) | `python seed.py` |
| Export local DB to file | `docker exec $(docker compose ps -q db) pg_dump -U inv_user drone_inventory > backup.sql` (from project root) |

| Task | Command (run from project root) |
|---|---|
| Start local real DB (Mode 2) | `docker compose up -d` |
| Start test/demo DB (Mode 1) | `docker compose -f docker-compose.test.yml up -d` |
| Stop local real DB | `docker compose down` |
| Stop test DB | `docker compose -f docker-compose.test.yml down` |
| Wipe test DB completely | `docker compose -f docker-compose.test.yml down -v` |

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

**Port 8000 is taken by Coolify (or another service)**
→ Coolify runs on port 8000 by default. Stop it before starting the backend:
```bash
docker stop coolify coolify-sentinel coolify-db coolify-redis coolify-realtime
```
Restart it later with `docker start coolify coolify-sentinel coolify-db coolify-redis coolify-realtime`.

**`psycopg2` fails to install**
→ The project uses `psycopg2-binary` (pre-compiled). Ensure you're on Python 3.10+ and that your venv is active.
