from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.errors import AppError
from app.core.permissions import ensure_self_or_assigned
from app.models.schedule import ScheduledWorkout
from app.models.user import User
from app.schemas.schedule import MoveCopyPayload, ScheduledCreate, ScheduledOut
from app.services import calendar_service, schedule_service

router = APIRouter()


@router.get('/', response_model=list[ScheduledOut])
def list_scheduled(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    rows = schedule_service.list_scheduled(db, athlete_id)
    return [schedule_service.as_dict(r) for r in rows]


@router.get('/calendar')
def calendar_feed(
    athlete_id: str,
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, athlete_id)
    return calendar_service.calendar_feed(db, athlete_id, from_date, to_date)


@router.post('/', response_model=ScheduledOut)
def create_scheduled(
    payload: ScheduledCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_self_or_assigned(db, current_user, payload.athlete_id)
    row = schedule_service.create_scheduled(db, payload.athlete_id, payload.template_id, payload.date)
    if not row:
        raise AppError(code='template_not_found', message='Template not found', status_code=404)
    return schedule_service.as_dict(row)


@router.post('/{scheduled_id}/move', response_model=ScheduledOut)
def move_scheduled(
    scheduled_id: str,
    payload: MoveCopyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(ScheduledWorkout, scheduled_id)
    if not row:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    ensure_self_or_assigned(db, current_user, row.athlete_id)
    moved = schedule_service.move_scheduled(db, scheduled_id, payload.to_date)
    if not moved:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    return schedule_service.as_dict(moved)


@router.post('/{scheduled_id}/skip', response_model=ScheduledOut)
def skip_scheduled(
    scheduled_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(ScheduledWorkout, scheduled_id)
    if not row:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    ensure_self_or_assigned(db, current_user, row.athlete_id)
    skipped = schedule_service.mark_skipped(db, scheduled_id)
    if not skipped:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    return schedule_service.as_dict(skipped)


@router.post('/{scheduled_id}/copy', response_model=ScheduledOut)
def copy_scheduled(
    scheduled_id: str,
    payload: MoveCopyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(ScheduledWorkout, scheduled_id)
    if not row:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    ensure_self_or_assigned(db, current_user, row.athlete_id)
    copied = schedule_service.copy_scheduled(db, scheduled_id, payload.to_date)
    if not copied:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    return schedule_service.as_dict(copied)
