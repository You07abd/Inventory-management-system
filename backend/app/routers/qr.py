from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
import qrcode
import io

from app.database import get_db
from app.models.item import Item
from app.models.unit import Unit

router = APIRouter(prefix="/qr", tags=["qr"])

def _make_qr_png(data: str) -> bytes:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

@router.get("/items/{item_id}", response_class=Response)
def item_qr(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    png = _make_qr_png(item.asset_code)
    return Response(content=png, media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})

@router.get("/units/{unit_id}", response_class=Response)
def unit_qr(unit_id: int, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    png = _make_qr_png(unit.asset_code)
    return Response(content=png, media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})
