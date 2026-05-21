# Inventory Management System

QR-based drone lab inventory web app — asset tracking, spare-parts management, and battery monitoring for SAFCSP.

---

## Running Locally on Linux

### Prerequisites

Make sure the following are installed:

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL

Install PostgreSQL on Debian/Ubuntu:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

---

### 1. Set up the database

Start PostgreSQL and create a database and user:

```bash
sudo systemctl start postgresql
sudo -u postgres psql
```

Inside the psql shell:

```sql
CREATE USER inventory_user WITH PASSWORD 'yourpassword';
CREATE DATABASE safcsp_drone_inventory OWNER inventory_user;
\q
```

---

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your database credentials:

```
DATABASE_URL=postgresql+psycopg2://inventory_user:yourpassword@localhost:5432/safcsp_drone_inventory
FRONTEND_ORIGIN=http://localhost:5173
```

---

### 3. Install backend dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### 4. Run database migrations

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

Optionally seed the database with sample data:

```bash
python seed.py
```

---

### 5. Start the backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

---

### 6. Install and start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### Summary

| Service  | URL                      |
|----------|--------------------------|
| Frontend | http://localhost:5173    |
| Backend  | http://localhost:8000    |
| API Docs | http://localhost:8000/docs |