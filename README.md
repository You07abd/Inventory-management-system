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
| Database | PostgreSQL (hosted on Coolify) |
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
    │   ├── pages/         ← Dashboard, InventoryList, ItemDetail, AddItem, Transactions, QRLookup
    │   ├── components/    ← Navbar, ItemTable, CheckoutModal, CheckinModal, QRCodeDisplay
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

> For setup and running instructions, see **[HOW_TO_RUN.md](HOW_TO_RUN.md)**.
