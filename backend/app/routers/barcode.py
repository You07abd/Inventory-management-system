import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/barcode-lookup", tags=["barcode"])

UPCITEMDB_URL = "https://api.upcitemdb.com/prod/trial/lookup"


@router.get("/")
def lookup_barcode(code: str):
    try:
        response = httpx.get(
            UPCITEMDB_URL,
            params={"upc": code},
            timeout=5.0,
            headers={"Accept": "application/json"},
        )
        data = response.json()
        items = data.get("items") or []
        if not items:
            return {"name": None, "brand": None, "description": None}
        first = items[0]
        return {
            "name": first.get("title") or None,
            "brand": first.get("brand") or None,
            "description": first.get("description") or None,
        }
    except Exception:
        return {"name": None, "brand": None, "description": None}
