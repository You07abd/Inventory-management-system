# How to Run — Inventory Management System

Choose your platform:

- [Windows](#windows)
- [Linux](#linux)

---

## Prerequisites (both platforms)

| Tool | Version | Notes |
|---|---|---|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend tooling only |
| Git | any | Source control |
| PostgreSQL | hosted on Coolify | No local install needed — use the remote DB |

---

## Project Structure

```
Inventory_management_system/
├── backend/          ← FastAPI app
│   ├── app/
│   ├── alembic/      ← database migrations
│   ├── seed.py       ← optional sample data
│   ├── requirements.txt
│   └── .env.example
└── frontend/         ← React + Vite app
    ├── src/
    ├── package.json
    └── .env.example
```

---

## Windows

### 1. Backend

**Create and activate a virtual environment**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> If you get a script execution error run this first:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**Install dependencies**

```powershell
pip install -r requirements.txt
```

**Configure environment variables**

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and fill in the Coolify PostgreSQL connection string:

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<coolify-host>:<port>/<dbname>
FRONTEND_ORIGIN=http://localhost:5173
```

> Ask a teammate for the Coolify credentials if you don't have them.

**Run database migrations**

```powershell
alembic upgrade head
```

**(Optional) Seed sample data**

```powershell
python seed.py
```

**Start the backend**

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

---

### 2. Frontend

Open a **new terminal** (keep the backend running).

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

App: **http://localhost:5173**

The default `.env` already points at `http://localhost:8000` — no changes needed for local dev.

---

### 3. Quick Reference (Windows)

Open two PowerShell terminals:

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

---

## Linux

### 1. Backend

**Create and activate a virtual environment**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

**Install dependencies**

```bash
pip install -r requirements.txt
```

**Configure environment variables**

```bash
cp .env.example .env
```

Open `backend/.env` and fill in the Coolify PostgreSQL connection string:

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<coolify-host>:<port>/<dbname>
FRONTEND_ORIGIN=http://localhost:5173
```

> Ask a teammate for the Coolify credentials if you don't have them.

**Run database migrations**

```bash
alembic upgrade head
```

**(Optional) Seed sample data**

```bash
python seed.py
```

**Start the backend**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

---

### 2. Frontend

Open a **new terminal** (keep the backend running).

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: **http://localhost:5173**

The default `.env` already points at `http://localhost:8000` — no changes needed for local dev.

---

### 3. Quick Reference (Linux)

Open two terminals:

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

---

## Useful Commands

| Task | Backend command |
|---|---|
| Apply migrations | `alembic upgrade head` |
| New migration | `alembic revision --autogenerate -m "description"` |
| Roll back one migration | `alembic downgrade -1` |
| Re-seed the database | `python seed.py` |

| Task | Frontend command |
|---|---|
| Start dev server | `npm run dev` |
| Production build | `npm run build` |
| Preview production build | `npm run preview` |

---

## Troubleshooting

**`DATABASE_URL is not configured`**
→ `backend/.env` is missing or doesn't have a `DATABASE_URL` line. Copy from `.env.example` and fill it in.

**`alembic: command not found`** (Linux) or **`alembic` not recognised** (Windows)
→ Your virtual environment isn't active. Run `source venv/bin/activate` (Linux) or `.\venv\Scripts\Activate.ps1` (Windows).

**Frontend shows network errors or blank data**
→ Make sure the backend is running on port 8000 and that `VITE_API_BASE_URL=http://localhost:8000` is set in `frontend/.env`.

**`psycopg2` fails to install**
→ The project uses `psycopg2-binary` (pre-compiled). Ensure you're on Python 3.10+ and that your venv is active.
