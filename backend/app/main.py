import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import Base, engine
from app.models import AuditLog, Category, Item, Location, Transaction, Unit, User
from app.routers import (
    audit,
    auth,
    barcode,
    categories,
    checkout,
    items,
    locations,
    qr,
    transactions,
    units,
    users,
)


load_dotenv()

ENV = os.getenv("ENV", "development").lower()
IS_PROD = ENV == "production"

# Refuse to boot in production without a real signing key.
if IS_PROD and os.getenv("SECRET_KEY") in (None, "", "dev-only-insecure-change-me"):
    raise RuntimeError("SECRET_KEY must be set to a strong random value in production.")

# Hide interactive docs / schema in production.
app = FastAPI(
    title="SAFCSP Drone Lab Inventory API",
    version="0.2.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
        if IS_PROD:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


app.add_middleware(SecurityHeadersMiddleware)

# Explicit allowlist — never use "*" with credentials.
frontend_origin = os.getenv("FRONTEND_ORIGIN")
allowed_origins = [frontend_origin] if frontend_origin else []
if os.environ.get("ENV", "development") != "production":
    allowed_origins.extend(["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.on_event("startup")
def on_startup():
    # Gate auto-migration so a bad migration can't crash boot in multi-replica setups.
    if os.getenv("RUN_MIGRATIONS_ON_STARTUP", "true").lower() != "true":
        return
    from alembic.config import Config
    from alembic import command as alembic_command
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    alembic_command.upgrade(alembic_cfg, "head")


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(locations.router)
app.include_router(items.router)
app.include_router(units.router)
app.include_router(transactions.router)
app.include_router(checkout.router)
app.include_router(barcode.router)
app.include_router(qr.router)
app.include_router(audit.router)

_models = (AuditLog, Category, Item, Location, Transaction, Unit, User)
