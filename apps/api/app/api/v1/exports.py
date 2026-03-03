from fastapi import APIRouter

router = APIRouter()

@router.get("/" if "exports" != "health" else "/health")
def placeholder_exports():
    return {"ok": True, "resource": "exports"}
