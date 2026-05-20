from app.database import Base, SessionLocal, engine
from app.models.category import Category
from app.models.item import Item
from app.models.location import Location
from app.models.user import User
from app.routers.items import generate_asset_code, generate_qr_code


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
        electronics = get_or_create(
            db,
            Category,
            name="Drones",
            defaults={"description": "Flight-ready drone platforms and airframes."},
        )
        sensors = get_or_create(
            db,
            Category,
            name="Sensors",
            defaults={"description": "Payloads, cameras, and telemetry sensors."},
        )
        cage = get_or_create(
            db,
            Location,
            name="Drone Cage A",
            defaults={"description": "Primary secure storage cage."},
        )
        bench = get_or_create(
            db,
            Location,
            name="Lab Bench 2",
            defaults={"description": "Active testing and calibration bench."},
        )
        admin = get_or_create(
            db,
            User,
            email="drone.lab@safcsp.org.sa",
            defaults={"name": "Drone Lab Admin", "role": "admin"},
        )
        get_or_create(
            db,
            User,
            email="student@safcsp.org.sa",
            defaults={"name": "SAFCSP Student", "role": "student"},
        )

        seed_items = [
            {
                "serial_number": "DJI-M300-001",
                "name": "DJI Matrice 300 RTK",
                "description": "Enterprise drone platform for training missions.",
                "quantity": 2,
                "available_quantity": 2,
                "condition": "excellent",
                "status": "available",
                "category_id": electronics.id,
                "location_id": cage.id,
            },
            {
                "serial_number": "CAM-Z30-001",
                "name": "Zenmuse Z30 Camera",
                "description": "Zoom camera payload for inspection exercises.",
                "quantity": 1,
                "available_quantity": 1,
                "condition": "good",
                "status": "available",
                "category_id": sensors.id,
                "location_id": bench.id,
            },
            {
                "serial_number": "BAT-TB60-001",
                "name": "TB60 Battery Pair",
                "description": "Paired intelligent flight batteries.",
                "quantity": 6,
                "available_quantity": 6,
                "condition": "good",
                "status": "available",
                "category_id": electronics.id,
                "location_id": cage.id,
            },
        ]

        for item_data in seed_items:
            existing = db.query(Item).filter(Item.serial_number == item_data["serial_number"]).first()
            if existing:
                continue
            asset_code = generate_asset_code(db)
            item = Item(
                **item_data,
                asset_code=asset_code,
                qr_code=generate_qr_code(asset_code),
                current_holder_id=None,
            )
            db.add(item)
            db.commit()

        admin.role = "admin"
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed data is ready.")
