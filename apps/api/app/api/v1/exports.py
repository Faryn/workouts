from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.permissions import ensure_self_or_assigned
from app.models.user import User
from app.services import export_service

router = APIRouter()


@router.get('/sessions.csv')
def export_sessions_csv(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    return Response(
        content=export_service.sessions_csv(db, athlete_id),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="sessions.csv"'},
    )


@router.get('/exercise-history.csv')
def export_exercise_history_csv(
    athlete_id: str,
    exercise_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    return Response(
        content=export_service.exercise_history_csv(db, athlete_id, exercise_id),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="exercise-history.csv"'},
    )


@router.get('/cardio.csv')
def export_cardio_csv(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    return Response(
        content=export_service.cardio_csv(db, athlete_id),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="cardio.csv"'},
    )
