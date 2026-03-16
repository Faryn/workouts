from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.schedule import (
    MoveCopyPayload,
    ScheduledBulkMovePayload,
    ScheduledBulkReplaceTemplatePayload,
    ScheduledBulkResult,
    ScheduledBulkRangeBase,
    ScheduledCreate,
    ScheduledOut,
    ScheduledPatternCreate,
)
from app.services import schedule_service

router = APIRouter()


@router.get('/', response_model=list[ScheduledOut])
def list_scheduled(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.list_scheduled(db, current_user, athlete_id)


@router.get('/calendar')
def calendar_feed(
    athlete_id: str,
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.calendar_feed(db, current_user, athlete_id, from_date, to_date)


@router.post('/', response_model=ScheduledOut)
def create_scheduled(
    payload: ScheduledCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.create_scheduled(db, current_user, payload.athlete_id, payload.template_id, payload.date)


@router.post('/bulk/move', response_model=ScheduledBulkResult)
def bulk_move_scheduled(
    payload: ScheduledBulkMovePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.bulk_move_scheduled(
        db,
        current_user,
        athlete_id=payload.athlete_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        shift_days=payload.shift_days,
    )


@router.post('/bulk/replace-template', response_model=ScheduledBulkResult)
def bulk_replace_template_scheduled(
    payload: ScheduledBulkReplaceTemplatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.bulk_replace_template_scheduled(
        db,
        current_user,
        athlete_id=payload.athlete_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        template_id=payload.template_id,
    )


@router.post('/bulk/skip', response_model=ScheduledBulkResult)
def bulk_skip_scheduled(
    payload: ScheduledBulkRangeBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.bulk_skip_scheduled(
        db,
        current_user,
        athlete_id=payload.athlete_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
    )


@router.post('/{scheduled_id}/move', response_model=ScheduledOut)
def move_scheduled(
    scheduled_id: str,
    payload: MoveCopyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.move_scheduled(db, current_user, scheduled_id, payload.to_date)


@router.post('/pattern', response_model=list[ScheduledOut])
def create_scheduled_pattern(
    payload: ScheduledPatternCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.create_scheduled_pattern(
        db,
        current_user,
        athlete_id=payload.athlete_id,
        template_id=payload.template_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        pattern_type=payload.pattern_type,
        interval_days=payload.interval_days,
        weekday=payload.weekday,
    )


@router.post('/{scheduled_id}/skip', response_model=ScheduledOut)
def skip_scheduled(
    scheduled_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.skip_scheduled(db, current_user, scheduled_id)


@router.post('/{scheduled_id}/copy', response_model=ScheduledOut)
def copy_scheduled(
    scheduled_id: str,
    payload: MoveCopyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.copy_scheduled(db, current_user, scheduled_id, payload.to_date)


@router.delete('/{scheduled_id}')
def delete_scheduled(
    scheduled_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_service.delete_scheduled(db, current_user, scheduled_id)
