from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.template import WorkoutTemplate
from app.models.user import User
from app.repositories import schedule_repo
from app.services import calendar_service
from app.services.schedule_policy import ensure_schedule_access, get_authorized_scheduled
from app.services.schedule_serializers import serialize_scheduled

WEEKDAY_MAP = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4,
    'saturday': 5,
    'sunday': 6,
}


def list_scheduled(db: Session, current_user: User, athlete_id: str) -> list[dict]:
    ensure_schedule_access(db, current_user, athlete_id)
    rows = schedule_repo.list_by_athlete(db, athlete_id)
    return [serialize_scheduled(row) for row in rows]



def calendar_feed(db: Session, current_user: User, athlete_id: str, from_date: date, to_date: date):
    ensure_schedule_access(db, current_user, athlete_id)
    return calendar_service.calendar_feed(db, athlete_id, from_date, to_date)



def create_scheduled(
    db: Session,
    current_user: User,
    athlete_id: str,
    template_id: str,
    on_date: date,
) -> dict:
    ensure_schedule_access(db, current_user, athlete_id)
    template = db.get(WorkoutTemplate, template_id)
    if not template:
        raise AppError(code='template_not_found', message='Template not found', status_code=404)
    row = schedule_repo.create(db, athlete_id, template_id, on_date)
    return serialize_scheduled(row)



def move_scheduled(db: Session, current_user: User, scheduled_id: str, to_date: date) -> dict:
    row = get_authorized_scheduled(db, current_user, scheduled_id)
    row.date = to_date
    return serialize_scheduled(schedule_repo.save(db, row))



def copy_scheduled(db: Session, current_user: User, scheduled_id: str, to_date: date) -> dict:
    row = get_authorized_scheduled(db, current_user, scheduled_id)
    copied = schedule_repo.create(
        db,
        athlete_id=row.athlete_id,
        template_id=row.template_id,
        on_date=to_date,
        notes=row.notes,
    )
    return serialize_scheduled(copied)



def skip_scheduled(db: Session, current_user: User, scheduled_id: str) -> dict:
    row = get_authorized_scheduled(db, current_user, scheduled_id)
    row.status = 'skipped'
    return serialize_scheduled(schedule_repo.save(db, row))



def delete_scheduled(db: Session, current_user: User, scheduled_id: str) -> dict:
    row = get_authorized_scheduled(db, current_user, scheduled_id)
    schedule_repo.delete(db, row)
    return {'ok': True}



def create_scheduled_pattern(
    db: Session,
    current_user: User,
    athlete_id: str,
    template_id: str,
    start_date: date,
    end_date: date,
    pattern_type: str,
    interval_days: int | None,
    weekday: str | None,
) -> list[dict]:
    ensure_schedule_access(db, current_user, athlete_id)
    template = db.get(WorkoutTemplate, template_id)
    if not template:
        raise AppError(code='template_not_found', message='Template not found', status_code=404)
    if end_date < start_date:
        return []

    out = []
    if pattern_type == 'interval_days':
        if not interval_days or interval_days < 1:
            return []
        d = start_date
        while d <= end_date:
            out.append(serialize_scheduled(schedule_repo.create(db, athlete_id, template_id, d)))
            d = d + timedelta(days=interval_days)
        return out

    if pattern_type == 'weekday':
        if not weekday:
            return []
        target = WEEKDAY_MAP.get(weekday.strip().lower())
        if target is None:
            return []
        d = start_date
        while d <= end_date:
            if d.weekday() == target:
                out.append(serialize_scheduled(schedule_repo.create(db, athlete_id, template_id, d)))
            d = d + timedelta(days=1)
        return out

    return []
