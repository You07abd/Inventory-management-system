# How to Run — Inventory Management System

Choose your platform and database option:

- [Windows](#windows)
- [Linux](#linux)

---

## Database Options

The backend connects to PostgreSQL via a `DATABASE_URL` environment variable. You can use either:

| Option | When to use |
|---|---|
| **Local (Docker)** | Demo, development, offline work — no credentials needed |
| **Coolify (remote)** | Shared team database, production data |

Both options work identically once the `DATABASE_URL` in `backend/.env` is set correctly. You can switch between them at any time by editing that one line.

---

## Prerequisites

| Tool | Required for | Version |
|---|---|---|
| Python | Backend | 3.10+ |
| Node.js + npm | Frontend | 18+ |
| Docker Desktop | Local DB only | any recent |
| Git | Both | any |

> If you are using the **Coolify** database you do **not** need Docker.  
> If you are using the **local Docker** database you do **not** need a Coolify account.

---

## Windows

### Step 1 — Start the database

#### Option A — Local database (Docker, recommended for demos)

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) if you haven't already, then from the project root:

```powershell
docker compose up -d
```

This starts a PostgreSQL container on port 5432. Copy the pre-filled local env file:

```powershell
Copy-Item backend\.env.local.example backend\.env
```

Your `backend/.env` will contain:
```env
DATABASE_URL=postgresql+psycopg2://inv_user:inv_pass@localhost:5432/drone_inventory
FRONTEND_ORIGIN=http://localhost:5173
```

#### Option B — Coolify (remote team database)

```powershell
Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and fill in the Coolify credentials (ask a teammate if you don't have them):
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<coolify-host>:<port>/<dbname>
FRONTEND_ORIGIN=http://localhost:5173
```

---

### Step 2 — Backend setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> If you get a script execution error run:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

```powershell
pip install -r requirements.txt
```

**Run migrations** (creates all tables):

```powershell
alembic upgrade head
```

**Seed sample data** (local DB only — skip if using Coolify with real data):

```powershell
python seed.py
```

> `seed.py` is idempotent — safe to run multiple times. It adds categories, locations, users, and three sample drone items.

**Start the backend:**

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

---

### Step 3 — Frontend setup

Open a **new terminal** (keep the backend running):

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

App: **http://localhost:5173**

---

### Quick Reference (Windows)

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

## Linux

### Step 1 — Start the database

#### Option A — Local database (Docker, recommended for demos)

Install Docker if you haven't already:
```bash
sudo apt install docker.io docker-compose-plugin   # Debian/Ubuntu
# or follow https://docs.docker.com/engine/install/
```

Then from the project root:

```bash
docker compose up -d
```

Copy the pre-filled local env file:

```bash
cp backend/.env.local.example backend/.env
```

Your `backend/.env` will contain:
```env
DATABASE_URL=postgresql+psycopg2://inv_user:inv_pass@localhost:5432/drone_inventory
FRONTEND_ORIGIN=http://localhost:5173
```

#### Option B — Coolify (remote team database)

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in the Coolify credentials (ask a teammate if you don't have them):
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<coolify-host>:<port>/<dbname>
FRONTEND_ORIGIN=http://localhost:5173
```

---

### Step 2 — Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Run migrations** (creates all tables):

```bash
alembic upgrade head
```

**Seed sample data** (local DB only — skip if using Coolify with real data):

```bash
python seed.py
```

> `seed.py` is idempotent — safe to run multiple times. It adds categories, locations, users, and three sample drone items.

**Start the backend:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

---

### Step 3 — Frontend setup

Open a **new terminal** (keep the backend running):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: **http://localhost:5173**

---

### Quick Reference (Linux)

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

## Switching Between Databases

To switch from local Docker to Coolify (or vice versa), edit one line in `backend/.env`:

```env
# Local Docker
DATABASE_URL=postgresql+psycopg2://inv_user:inv_pass@localhost:5432/drone_inventory

# Coolify (replace with real values)
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<coolify-host>:<port>/<dbname>
```

Then restart the backend server. No code changes needed.

---

## Useful Commands

| Task | Command (run from `backend/` with venv active) |
|---|---|
| Apply migrations | `alembic upgrade head` |
| New migration | `alembic revision --autogenerate -m "description"` |
| Roll back one migration | `alembic downgrade -1` |
| Re-seed sample data | `python seed.py` |
| Start local DB | `docker compose up -d` (from project root) |
| Stop local DB | `docker compose down` (from project root) |

| Task | Command (run from `frontend/`) |
|---|---|
| Start dev server | `npm run dev` |
| Production build | `npm run build` |
| Preview production build | `npm run preview` |

---

## Troubleshooting

**`DATABASE_URL is not configured`**
→ `backend/.env` is missing. Copy from `.env.local.example` (local) or `.env.example` (Coolify) and fill it in.

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
