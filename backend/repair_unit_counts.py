"""
One-time repair script: recomputes quantity and available_quantity for all
unit-tracked items from their actual units.

Run from the backend/ directory:
    python repair_unit_counts.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.item import Item
from app.models.unit import Unit


def repair():
    db = SessionLocal()
    try:
        items = db.query(Item).filter(Item.track_units == True).all()
        fixed = 0
        for item in items:
            total = db.query(Unit).filter(Unit.item_id == item.id).count()
            available = db.query(Unit).filter(Unit.item_id == item.id, Unit.status == "available").count()
            if item.quantity != total or item.available_quantity != available:
                print(f"  Fixing {item.asset_code}: was {item.available_quantity}/{item.quantity}, now {available}/{total}")
                item.quantity = total
                item.available_quantity = available
                if available == 0:
                    item.status = "available" if total == 0 else "checked_out"
                    if total == 0:
                        item.current_holder_id = None
                elif available == total:
                    item.status = "available"
                    item.current_holder_id = None
                else:
                    item.status = "partially_available"
                fixed += 1
        db.commit()
        print(f"\nDone. Fixed {fixed} item(s) out of {len(items)} unit-tracked item(s).")
    finally:
        db.close()


if __name__ == "__main__":
    repair()
