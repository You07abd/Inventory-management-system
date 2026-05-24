import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import Category, Item, Location, Transaction, User
from app.routers import categories, items, locations, transactions, users


load_dotenv()

app = FastAPI(title="SAFCSP Drone Lab Inventory API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    from alembic.config import Config
    from alembic import command as alembic_command
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    alembic_command.upgrade(alembic_cfg, "head")

    from seed import seed
    seed()


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(categories.router)
app.include_router(locations.router)
app.include_router(items.router)
app.include_router(transactions.router)

_models = (Category, Item, Location, Transaction, User)
