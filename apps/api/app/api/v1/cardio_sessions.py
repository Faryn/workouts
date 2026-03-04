from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.permissions import ensure_self_or_assigned
from app.models.user import User
from app.schemas.cardio import CardioCreate, CardioOut
from app.services import cardio_service

router = APIRouter()


@router.get('/', response_model=list[CardioOut])
def list_cardio(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    rows = cardio_service.list_cardio(db, athlete_id)
    return [cardio_service.as_dict(r) for r in rows]


@router.post('/', response_model=CardioOut)
def create_cardio(
    payload: CardioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, payload.athlete_id)
    row = cardio_service.create_cardio(
        db,
        athlete_id=payload.athlete_id,
        on_date=payload.date,
        cardio_type=payload.type,
        duration_seconds=payload.duration_seconds,
        distance=payload.distance,
        notes=payload.notes,
    )
    return cardio_service.as_dict(row)
