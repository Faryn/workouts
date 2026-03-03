from fastapi import APIRouter

router = APIRouter()

@router.get("/" if "cardio_sessions" != "health" else "/health")
def placeholder_cardio_sessions():
    return {"ok": True, "resource": "cardio_sessions"}
