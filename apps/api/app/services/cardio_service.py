from sqlalchemy.orm import Session

from app.models.cardio import CardioSession
from app.repositories import cardio_repo


def as_dict(row: CardioSession) -> dict:
    return {
        "id": row.id,
        "athlete_id": row.athlete_id,
        "date": row.date.isoformat(),
        "type": row.type,
        "duration_seconds": row.duration_seconds,
        "distance": row.distance,
        "notes": row.notes,
    }


def list_cardio(db: Session, athlete_id: str) -> list[CardioSession]:
    return cardio_repo.list_by_athlete(db, athlete_id)


def create_cardio(
    db: Session,
    athlete_id: str,
    on_date,
    cardio_type: str,
    duration_seconds: int,
    distance: float | None,
    notes: str | None,
) -> CardioSession:
    return cardio_repo.create(
        db,
        athlete_id=athlete_id,
        on_date=on_date,
        cardio_type=cardio_type,
        duration_seconds=duration_seconds,
        distance=distance,
        notes=notes,
    )
