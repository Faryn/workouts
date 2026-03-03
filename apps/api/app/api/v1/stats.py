from fastapi import APIRouter

router = APIRouter()

@router.get("/" if "stats" != "health" else "/health")
def placeholder_stats():
    return {"ok": True, "resource": "stats"}
