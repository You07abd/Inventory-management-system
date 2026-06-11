import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/barcode-lookup", tags=["barcode"])

UPCITEMDB_URL = "https://api.upcitemdb.com/prod/trial/lookup"


@router.get("/")
def lookup_barcode(code: str = Query(pattern=r"^[A-Za-z0-9\-\.]{1,64}$"), _: User = Depends(get_current_user)):
    try:
        response = httpx.get(
            UPCITEMDB_URL,
            params={"upc": code},
            timeout=5.0,
            follow_redirects=False,
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
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="External lookup timed out") from exc
    except Exception:
        return {"name": None, "brand": None, "description": None}
