from datetime import date
from sqlalchemy.orm import Session

from app.models.cardio import CardioSession


def list_by_athlete(db: Session, athlete_id: str) -> list[CardioSession]:
    return (
        db.query(CardioSession)
        .filter(CardioSession.athlete_id == athlete_id)
        .order_by(CardioSession.date.desc())
        .all()
    )


def create(
    db: Session,
    athlete_id: str,
    on_date: date,
    cardio_type: str,
    duration_seconds: int,
    distance: float | None,
    notes: str | None,
) -> CardioSession:
    row = CardioSession(
        athlete_id=athlete_id,
        date=on_date,
        type=cardio_type,
        duration_seconds=duration_seconds,
        distance=distance,
        notes=notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
