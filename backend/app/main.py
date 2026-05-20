from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import users, categories, locations, items

# Import all models so SQLAlchemy knows about them before creating tables
import app.models  # noqa: F401

app = FastAPI(
    title="SAFCSP Drone Lab Inventory API",
    description="Inventory management system for the SAFCSP drone lab",
    version="1.0.0",
)

# Allow the React frontend (running on a different port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all database tables automatically on startup
@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


# Register all route groups
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(locations.router)
app.include_router(items.router)


@app.get("/")
def root():
    return {"message": "SAFCSP Drone Lab Inventory API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
