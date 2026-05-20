# SAFCSP Drone Lab — Backend

FastAPI backend for the drone lab inventory management system.

## Requirements

- Python 3.11+
- PostgreSQL (running locally)

---

## Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv venv
```

Activate it:

- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create the database

Open psql or pgAdmin and run:

```sql
CREATE DATABASE drone_lab_inventory;
```

### 4. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/drone_lab_inventory
```

Replace `yourpassword` with your actual PostgreSQL password.

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

The API will be available at: **http://localhost:8000**

Interactive docs (Swagger UI): **http://localhost:8000/docs**

---

## Seed the database

After the server has run at least once (so the tables are created), load sample data:

```bash
python seed.py
```

This creates:
- 5 sample users (admin, staff, students)
- 7 categories
- 5 locations
- 14 drone lab items

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List all items |
| GET | `/items/{id}` | Get a single item |
| POST | `/items` | Create a new item |
| PUT | `/items/{id}` | Update an item |
| POST | `/items/{id}/checkout` | Check out an item |
| POST | `/items/{id}/checkin` | Return an item |
| GET | `/categories` | List all categories |
| POST | `/categories` | Create a category |
| GET | `/locations` | List all locations |
| POST | `/locations` | Create a location |
| GET | `/users` | List all users |
| POST | `/users` | Create a user |

Full interactive documentation is available at `/docs` when the server is running.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app, CORS, startup
│   ├── database.py      # DB connection, session factory
│   ├── models/          # SQLAlchemy table models
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── location.py
│   │   ├── item.py
│   │   └── transaction.py
│   ├── schemas/         # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── location.py
│   │   ├── item.py
│   │   └── transaction.py
│   └── routers/         # Route handlers
│       ├── users.py
│       ├── categories.py
│       ├── locations.py
│       └── items.py
├── seed.py              # Sample data loader
├── requirements.txt
├── .env.example
└── README.md
```
