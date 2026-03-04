from datetime import date

from sqlalchemy.orm import Session

from app.models.cardio import CardioSession
from app.models.schedule import ScheduledWorkout
from app.models.template import WorkoutTemplate


def calendar_feed(db: Session, athlete_id: str, from_date: date, to_date: date) -> list[dict]:
    scheduled_rows = (
        db.query(ScheduledWorkout, WorkoutTemplate.name)
        .join(WorkoutTemplate, WorkoutTemplate.id == ScheduledWorkout.template_id)
        .filter(
            ScheduledWorkout.athlete_id == athlete_id,
            ScheduledWorkout.date >= from_date,
            ScheduledWorkout.date <= to_date,
        )
        .order_by(ScheduledWorkout.date.asc())
        .all()
    )

    cardio_rows = (
        db.query(CardioSession)
        .filter(
            CardioSession.athlete_id == athlete_id,
            CardioSession.date >= from_date,
            CardioSession.date <= to_date,
        )
        .order_by(CardioSession.date.asc())
        .all()
    )

    out: list[dict] = []
    for sw, template_name in scheduled_rows:
        out.append(
            {
                'kind': 'strength',
                'id': sw.id,
                'date': sw.date.isoformat(),
                'status': sw.status,
                'template_id': sw.template_id,
                'template_name': template_name,
            }
        )

    for c in cardio_rows:
        out.append(
            {
                'kind': 'cardio',
                'id': c.id,
                'date': c.date.isoformat(),
                'type': c.type,
                'duration_seconds': c.duration_seconds,
                'distance': c.distance,
                'notes': c.notes,
            }
        )

    out.sort(key=lambda x: (x['date'], x['kind'], x['id']))
    return out
