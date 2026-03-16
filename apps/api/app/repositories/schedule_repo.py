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



def list_planned_in_range(db: Session, athlete_id: str, start_date: date, end_date: date) -> list[ScheduledWorkout]:
    return (
        db.query(ScheduledWorkout)
        .filter(ScheduledWorkout.athlete_id == athlete_id)
        .filter(ScheduledWorkout.status == 'planned')
        .filter(ScheduledWorkout.date >= start_date)
        .filter(ScheduledWorkout.date <= end_date)
        .order_by(ScheduledWorkout.date.asc(), ScheduledWorkout.id.asc())
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



def save_many(db: Session, rows: list[ScheduledWorkout]) -> list[ScheduledWorkout]:
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows



def delete(db: Session, row: ScheduledWorkout) -> None:
    db.delete(row)
    db.commit()
