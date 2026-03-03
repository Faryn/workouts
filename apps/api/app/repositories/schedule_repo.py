from datetime import date
from sqlalchemy.orm import Session

from app.models.schedule import ScheduledWorkout


def list_by_athlete(db: Session, athlete_id: str) -> list[ScheduledWorkout]:
    return (
        db.query(ScheduledWorkout)
        .filter(ScheduledWorkout.athlete_id == athlete_id)
        .order_by(ScheduledWorkout.date.asc())
        .all()
    )


def get(db: Session, scheduled_id: str) -> ScheduledWorkout | None:
    return db.get(ScheduledWorkout, scheduled_id)


def create(
    db: Session,
    athlete_id: str,
    template_id: str,
    on_date: date,
    notes: str | None = None,
) -> ScheduledWorkout:
    row = ScheduledWorkout(
        athlete_id=athlete_id,
        template_id=template_id,
        date=on_date,
        status="planned",
        source="api",
        notes=notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def save(db: Session, row: ScheduledWorkout) -> ScheduledWorkout:
    db.commit()
    db.refresh(row)
    return row
