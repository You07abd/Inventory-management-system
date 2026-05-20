"""
Seed script: populates the database with sample data for the drone lab.
Run after starting the server at least once (so tables are created):

    python seed.py
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

# Import models (this also triggers table creation if not done yet)
from app.models import User, Category, Location, Item  # noqa: E402
from app.database import Base  # noqa: E402

Base.metadata.create_all(bind=engine)

# ── Users ──────────────────────────────────────────────────────────────────────
users = [
    User(name="Ahmed Al-Otaibi", email="ahmed@safcsp.org.sa", role="admin"),
    User(name="Sara Al-Ghamdi", email="sara@safcsp.org.sa", role="staff"),
    User(name="Khalid Al-Zahrani", email="khalid@safcsp.org.sa", role="student"),
    User(name="Fatima Al-Harbi", email="fatima@safcsp.org.sa", role="student"),
    User(name="Omar Al-Shehri", email="omar@safcsp.org.sa", role="student"),
]

# ── Categories ─────────────────────────────────────────────────────────────────
categories = [
    Category(name="Drone", description="Unmanned aerial vehicles and frames"),
    Category(name="Battery", description="LiPo batteries and chargers"),
    Category(name="Controller", description="Remote controllers and transmitters"),
    Category(name="Camera", description="FPV cameras and gimbals"),
    Category(name="Tools", description="Repair and maintenance tools"),
    Category(name="Safety", description="Safety equipment and gear"),
    Category(name="Spare Parts", description="Motors, props, ESCs, and other components"),
]

# ── Locations ──────────────────────────────────────────────────────────────────
locations = [
    Location(name="Storage Room A", description="Main drone storage cabinet"),
    Location(name="Storage Room B", description="Battery and charger station"),
    Location(name="Workshop", description="Maintenance and repair area"),
    Location(name="Flight Area Shelf", description="Shelf near the indoor flight area"),
    Location(name="Locker 1", description="Small parts locker"),
]

# Add users, categories, and locations first
for obj in users + categories + locations:
    db.add(obj)
db.commit()

# Fetch IDs after commit
drone_cat = db.query(Category).filter_by(name="Drone").first()
battery_cat = db.query(Category).filter_by(name="Battery").first()
controller_cat = db.query(Category).filter_by(name="Controller").first()
camera_cat = db.query(Category).filter_by(name="Camera").first()
tools_cat = db.query(Category).filter_by(name="Tools").first()
safety_cat = db.query(Category).filter_by(name="Safety").first()
parts_cat = db.query(Category).filter_by(name="Spare Parts").first()

room_a = db.query(Location).filter_by(name="Storage Room A").first()
room_b = db.query(Location).filter_by(name="Storage Room B").first()
workshop = db.query(Location).filter_by(name="Workshop").first()
flight_shelf = db.query(Location).filter_by(name="Flight Area Shelf").first()
locker = db.query(Location).filter_by(name="Locker 1").first()

# ── Items ──────────────────────────────────────────────────────────────────────
items = [
    Item(
        name="DJI Mini 4 Pro",
        description="Lightweight foldable drone with 4K camera",
        serial_number="DJI-M4P-001",
        quantity=3,
        available_quantity=3,
        condition="good",
        category_id=drone_cat.id,
        location_id=room_a.id,
    ),
    Item(
        name="DJI Avata 2",
        description="FPV drone for immersive flying experience",
        serial_number="DJI-AVT-001",
        quantity=2,
        available_quantity=2,
        condition="good",
        category_id=drone_cat.id,
        location_id=room_a.id,
    ),
    Item(
        name="Holybro X500 V2 Frame",
        description="Racing/development drone frame kit",
        serial_number=None,
        quantity=4,
        available_quantity=4,
        condition="good",
        category_id=drone_cat.id,
        location_id=workshop.id,
    ),
    Item(
        name="LiPo Battery 4S 5000mAh",
        description="4-cell LiPo battery for mid-size drones",
        serial_number=None,
        quantity=10,
        available_quantity=10,
        condition="good",
        category_id=battery_cat.id,
        location_id=room_b.id,
    ),
    Item(
        name="LiPo Battery 6S 6000mAh",
        description="6-cell LiPo battery for larger drones",
        serial_number=None,
        quantity=6,
        available_quantity=6,
        condition="good",
        category_id=battery_cat.id,
        location_id=room_b.id,
    ),
    Item(
        name="DJI RC-N2 Remote Controller",
        description="Lightweight remote for DJI Mini series",
        serial_number="DJI-RC-N2-001",
        quantity=4,
        available_quantity=4,
        condition="good",
        category_id=controller_cat.id,
        location_id=room_a.id,
    ),
    Item(
        name="RadioMaster TX16S Controller",
        description="Multi-protocol RC transmitter with hall gimbals",
        serial_number="RM-TX16S-001",
        quantity=3,
        available_quantity=3,
        condition="good",
        category_id=controller_cat.id,
        location_id=flight_shelf.id,
    ),
    Item(
        name="Caddx Ratel 2 FPV Camera",
        description="1200TVL FPV camera for racing builds",
        serial_number=None,
        quantity=6,
        available_quantity=6,
        condition="good",
        category_id=camera_cat.id,
        location_id=locker.id,
    ),
    Item(
        name="Screwdriver Set (Hex)",
        description="Precision hex screwdriver set for drone assembly",
        serial_number=None,
        quantity=5,
        available_quantity=5,
        condition="good",
        category_id=tools_cat.id,
        location_id=workshop.id,
    ),
    Item(
        name="Soldering Iron Station",
        description="Temperature-controlled soldering station",
        serial_number="HAKKO-FX-001",
        quantity=2,
        available_quantity=2,
        condition="good",
        category_id=tools_cat.id,
        location_id=workshop.id,
    ),
    Item(
        name="Safety Glasses",
        description="ANSI-rated protective eyewear",
        serial_number=None,
        quantity=15,
        available_quantity=15,
        condition="good",
        category_id=safety_cat.id,
        location_id=flight_shelf.id,
    ),
    Item(
        name="Fire-Resistant LiPo Bag",
        description="Safety bag for charging and storing LiPo batteries",
        serial_number=None,
        quantity=8,
        available_quantity=8,
        condition="good",
        category_id=safety_cat.id,
        location_id=room_b.id,
    ),
    Item(
        name="5-inch Propeller Set",
        description="5-inch tri-blade propellers (pack of 4)",
        serial_number=None,
        quantity=20,
        available_quantity=20,
        condition="good",
        category_id=parts_cat.id,
        location_id=locker.id,
    ),
    Item(
        name="30x30 Brushless Motor 2306",
        description="2306 2400KV brushless motor for 5-inch builds",
        serial_number=None,
        quantity=16,
        available_quantity=16,
        condition="good",
        category_id=parts_cat.id,
        location_id=locker.id,
    ),
]

for item in items:
    db.add(item)

db.commit()
print(f"Seeded {len(users)} users, {len(categories)} categories, {len(locations)} locations, {len(items)} items.")
print("Done!")
