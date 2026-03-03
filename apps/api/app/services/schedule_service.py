from datetime import date

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
