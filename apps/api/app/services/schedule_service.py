from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.schedule import ScheduledWorkout
from app.models.template import WorkoutTemplate
from app.repositories import schedule_repo


def as_dict(row: ScheduledWorkout) -> dict:
    return {
        "id": row.id,
        "athlete_id": row.athlete_id,
        "template_id": row.template_id,
        "date": row.date.isoformat(),
        "status": row.status,
        "source": row.source,
        "notes": row.notes,
    }


def list_scheduled(db: Session, athlete_id: str) -> list[ScheduledWorkout]:
    return schedule_repo.list_by_athlete(db, athlete_id)


def create_scheduled(
    db: Session,
    athlete_id: str,
    template_id: str,
    on_date: date,
) -> ScheduledWorkout | None:
    template = db.get(WorkoutTemplate, template_id)
    if not template:
        return None
    return schedule_repo.create(db, athlete_id, template_id, on_date)


def move_scheduled(db: Session, scheduled_id: str, to_date: date) -> ScheduledWorkout | None:
    row = schedule_repo.get(db, scheduled_id)
    if not row:
        return None
    row.date = to_date
    return schedule_repo.save(db, row)


def copy_scheduled(db: Session, scheduled_id: str, to_date: date) -> ScheduledWorkout | None:
    row = schedule_repo.get(db, scheduled_id)
    if not row:
        return None
    return schedule_repo.create(
        db,
        athlete_id=row.athlete_id,
        template_id=row.template_id,
        on_date=to_date,
        notes=row.notes,
    )


def mark_skipped(db: Session, scheduled_id: str) -> ScheduledWorkout | None:
    row = schedule_repo.get(db, scheduled_id)
    if not row:
        return None
    row.status = 'skipped'
    return schedule_repo.save(db, row)


def create_scheduled_pattern(
    db: Session,
    athlete_id: str,
    template_id: str,
    start_date: date,
    end_date: date,
    pattern_type: str,
    interval_days: int | None,
    weekday: str | None,
) -> list[ScheduledWorkout] | None:
    template = db.get(WorkoutTemplate, template_id)
    if not template:
        return None
    if end_date < start_date:
        return []

    out: list[ScheduledWorkout] = []

    if pattern_type == 'interval_days':
        if not interval_days or interval_days < 1:
            return []
        d = start_date
        while d <= end_date:
            out.append(schedule_repo.create(db, athlete_id, template_id, d))
            d = d + timedelta(days=interval_days)
        return out

    if pattern_type == 'weekday':
        weekday_map = {
            'monday': 0,
            'tuesday': 1,
            'wednesday': 2,
            'thursday': 3,
            'friday': 4,
            'saturday': 5,
            'sunday': 6,
        }
        if not weekday:
            return []
        target = weekday_map.get(weekday.strip().lower())
        if target is None:
            return []

        d = start_date
        while d <= end_date:
            if d.weekday() == target:
                out.append(schedule_repo.create(db, athlete_id, template_id, d))
            d = d + timedelta(days=1)
        return out

    return []
