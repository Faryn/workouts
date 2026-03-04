from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.permissions import ensure_self_or_assigned
from app.models.user import User
from app.schemas.stats import WeightsOverTimeOut
from app.services import stats_service

router = APIRouter()


@router.get('/exercises/{exercise_id}/weights-over-time', response_model=WeightsOverTimeOut)
def exercise_weights_over_time(
    exercise_id: str,
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    return stats_service.weights_over_time(db, athlete_id=athlete_id, exercise_id=exercise_id)
