import os
import secrets
import sys

from app.database import Base, SessionLocal, engine
from app.models.category import Category
from app.models.item import Item
from app.models.location import Location
from app.models.user import User
from app.routers.items import generate_asset_code
from app.security import hash_password


WEAK_SEED_PASSWORDS = {"password123", "password", "admin", "123456"}


def resolve_seed_password(env_var):
    password = os.environ.get(env_var)
    if password is None:
        password = secrets.token_urlsafe(16)
        print(f"Generated {env_var} for seed run: {password}")
    return password


SEED_ADMIN_PASSWORD = resolve_seed_password("SEED_ADMIN_PASSWORD")
SEED_USER_PASSWORD = resolve_seed_password("SEED_USER_PASSWORD")

if os.environ.get("ENV") == "production":
    for env_var, password in (
        ("SEED_ADMIN_PASSWORD", SEED_ADMIN_PASSWORD),
        ("SEED_USER_PASSWORD", SEED_USER_PASSWORD),
    ):
        if password in WEAK_SEED_PASSWORDS or len(password) < 12:
            print(f"Error: {env_var} must not be weak or shorter than 12 characters in production.")
            sys.exit(1)


def get_or_create(db, model, defaults=None, **filters):
    instance = db.query(model).filter_by(**filters).first()
    if instance:
        return instance
    data = {**filters, **(defaults or {})}
    instance = model(**data)
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # --- Categories ---
        cat_drones = get_or_create(db, Category, name="Drones",
            defaults={"description": "Flight-ready drone platforms and airframes."})
        cat_cameras = get_or_create(db, Category, name="Cameras & Payloads",
            defaults={"description": "Camera gimbals, thermal imagers, and sensor payloads."})
        cat_batteries = get_or_create(db, Category, name="Batteries & Power",
            defaults={"description": "Flight batteries, chargers, and power hubs."})
        cat_controllers = get_or_create(db, Category, name="Controllers & Comms",
            defaults={"description": "Remote controllers, RC systems, and telemetry radios."})
        cat_tools = get_or_create(db, Category, name="Tools & Maintenance",
            defaults={"description": "Repair tools, calibration equipment, and spare parts."})
        cat_safety = get_or_create(db, Category, name="Safety Equipment",
            defaults={"description": "PPE, safety nets, and lab safety gear."})

        # --- Locations ---
        loc_cage_a = get_or_create(db, Location, name="Drone Cage A",
            defaults={"description": "Primary secure storage cage for flight-ready drones."})
        loc_cage_b = get_or_create(db, Location, name="Drone Cage B",
            defaults={"description": "Secondary cage for drones under maintenance."})
        loc_bench = get_or_create(db, Location, name="Lab Bench",
            defaults={"description": "Active testing, calibration, and assembly bench."})
        loc_charging = get_or_create(db, Location, name="Charging Station",
            defaults={"description": "Dedicated battery charging and storage area."})
        loc_cabinet = get_or_create(db, Location, name="Storage Cabinet",
            defaults={"description": "Locked cabinet for small accessories and tools."})

        # --- Users ---
        admin_pw = hash_password(SEED_ADMIN_PASSWORD)
        user_pw = hash_password(SEED_USER_PASSWORD)
        admin = get_or_create(db, User, email="admin@dronelab.com",
            defaults={"name": "Lab Admin", "role": "admin", "password_hash": admin_pw})
        get_or_create(db, User, email="ahmed.hassan@dronelab.com",
            defaults={"name": "Ahmed Hassan", "role": "staff", "password_hash": user_pw})
        get_or_create(db, User, email="sara.ali@dronelab.com",
            defaults={"name": "Sara Ali", "role": "student", "password_hash": user_pw})
        get_or_create(db, User, email="omar.k@dronelab.com",
            defaults={"name": "Omar Khalid", "role": "student", "password_hash": user_pw})
        get_or_create(db, User, email="lena.m@dronelab.com",
            defaults={"name": "Lena Mahmoud", "role": "student", "password_hash": user_pw})

        # --- Items ---
        seed_items = [
            # Drones
            {
                "serial_number": "DJI-M300-001",
                "name": "DJI Matrice 300 RTK",
                "description": "Enterprise RTK drone for inspection and mapping missions.",
                "quantity": 2, "available_quantity": 2,
                "condition": "good", "status": "available",
                "category_id": cat_drones.id, "location_id": loc_cage_a.id,
            },
            {
                "serial_number": "DJI-M30T-001",
                "name": "DJI Matrice 30T",
                "description": "Compact enterprise drone with thermal + zoom camera built-in.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_drones.id, "location_id": loc_cage_a.id,
            },
            {
                "serial_number": "DJI-AVATA-001",
                "name": "DJI Avata 2 FPV",
                "description": "FPV racing/cinematic drone for pilot training exercises.",
                "quantity": 3, "available_quantity": 3,
                "condition": "good", "status": "available",
                "category_id": cat_drones.id, "location_id": loc_cage_b.id,
            },
            {
                "serial_number": "AUTEL-EVO2-001",
                "name": "Autel EVO II Pro",
                "description": "6K camera drone used for aerial photography labs.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_drones.id, "location_id": loc_cage_b.id,
            },
            # Cameras & Payloads
            {
                "serial_number": "CAM-XT2-001",
                "name": "Zenmuse XT2 Thermal Camera",
                "description": "Dual thermal + RGB payload for search and rescue demos.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_cameras.id, "location_id": loc_bench.id,
            },
            {
                "serial_number": "CAM-Z30-001",
                "name": "Zenmuse Z30 Zoom Camera",
                "description": "30x optical zoom camera payload for inspection exercises.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_cameras.id, "location_id": loc_bench.id,
            },
            {
                "serial_number": "CAM-P1-001",
                "name": "Zenmuse P1 Full-Frame Camera",
                "description": "45MP full-frame mapping payload for photogrammetry labs.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_cameras.id, "location_id": loc_cabinet.id,
            },
            # Batteries & Power
            {
                "serial_number": "BAT-TB60-001",
                "name": "DJI TB60 Intelligent Battery",
                "description": "Smart flight battery for Matrice 300 RTK (set of 2).",
                "quantity": 6, "available_quantity": 6,
                "condition": "good", "status": "available",
                "category_id": cat_batteries.id, "location_id": loc_charging.id,
            },
            {
                "serial_number": "BAT-BS60-001",
                "name": "DJI BS60 Charging Station",
                "description": "Multi-battery charging hub, charges up to 4 TB60s simultaneously.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_batteries.id, "location_id": loc_charging.id,
            },
            {
                "serial_number": "BAT-AVATA-001",
                "name": "DJI Avata Intelligent Battery",
                "description": "Flight batteries for DJI Avata 2 FPV drones.",
                "quantity": 8, "available_quantity": 8,
                "condition": "good", "status": "available",
                "category_id": cat_batteries.id, "location_id": loc_charging.id,
            },
            # Controllers & Comms
            {
                "serial_number": "RC-SMART-001",
                "name": "DJI Smart Controller Enterprise",
                "description": "Bright-screen controller with built-in Android for M300 RTK.",
                "quantity": 2, "available_quantity": 2,
                "condition": "good", "status": "available",
                "category_id": cat_controllers.id, "location_id": loc_cabinet.id,
            },
            {
                "serial_number": "RC-GOGGLES-001",
                "name": "DJI Goggles 3",
                "description": "FPV goggles for Avata 2 immersive flight training.",
                "quantity": 3, "available_quantity": 3,
                "condition": "good", "status": "available",
                "category_id": cat_controllers.id, "location_id": loc_cabinet.id,
            },
            {
                "serial_number": "RADIO-HERELINK-001",
                "name": "Herelink HD Video Transmission",
                "description": "Long-range telemetry and video transmission system.",
                "quantity": 2, "available_quantity": 2,
                "condition": "good", "status": "available",
                "category_id": cat_controllers.id, "location_id": loc_bench.id,
            },
            # Tools & Maintenance
            {
                "serial_number": "TOOL-PROP-001",
                "name": "Propeller Balancer Kit",
                "description": "Precision balancer for checking and correcting prop balance.",
                "quantity": 2, "available_quantity": 2,
                "condition": "good", "status": "available",
                "category_id": cat_tools.id, "location_id": loc_bench.id,
            },
            {
                "serial_number": "TOOL-SCREWSET-001",
                "name": "Precision Screwdriver Set",
                "description": "Hex and Torx screwdriver set for drone frame assembly.",
                "quantity": 3, "available_quantity": 3,
                "condition": "good", "status": "available",
                "category_id": cat_tools.id, "location_id": loc_cabinet.id,
            },
            {
                "serial_number": "TOOL-MULTIMETER-001",
                "name": "Digital Multimeter",
                "description": "Used for ESC and power system diagnostics.",
                "quantity": 2, "available_quantity": 2,
                "condition": "good", "status": "available",
                "category_id": cat_tools.id, "location_id": loc_bench.id,
            },
            {
                "serial_number": "TOOL-SOLDERKIT-001",
                "name": "Soldering Station",
                "description": "Temperature-controlled soldering iron for motor and ESC repairs.",
                "quantity": 1, "available_quantity": 1,
                "condition": "good", "status": "available",
                "category_id": cat_tools.id, "location_id": loc_bench.id,
            },
            # Safety Equipment
            {
                "serial_number": "SAFE-GLASSES-001",
                "name": "Safety Glasses",
                "description": "ANSI-rated eye protection for all lab personnel.",
                "quantity": 10, "available_quantity": 10,
                "condition": "good", "status": "available",
                "category_id": cat_safety.id, "location_id": loc_cabinet.id,
            },
            {
                "serial_number": "SAFE-GLOVES-001",
                "name": "Cut-Resistant Gloves",
                "description": "Level-5 cut protection gloves for handling props and rotors.",
                "quantity": 10, "available_quantity": 10,
                "condition": "good", "status": "available",
                "category_id": cat_safety.id, "location_id": loc_cabinet.id,
            },
            {
                "serial_number": "SAFE-LIPO-001",
                "name": "LiPo Safety Bags (10-pack)",
                "description": "Fire-resistant bags for safe LiPo battery storage and transport.",
                "quantity": 20, "available_quantity": 20,
                "condition": "good", "status": "available",
                "category_id": cat_safety.id, "location_id": loc_charging.id,
            },
        ]

        for item_data in seed_items:
            existing = db.query(Item).filter(Item.serial_number == item_data["serial_number"]).first()
            if existing:
                continue
            asset_code = generate_asset_code("SAFCSP-DRONE", db, Item)
            item = Item(
                **item_data,
                asset_code=asset_code,
                current_holder_id=None,
            )
            db.add(item)
            db.commit()

        admin.role = "admin"
        db.commit()
        print("Seed complete: 6 categories, 5 locations, 5 users, 20 items.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
