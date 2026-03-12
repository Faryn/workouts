from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.assignment import TrainerAssignment
from app.models.user import User


def list_assigned_athlete_ids(db: Session, trainer_id: str) -> set[str]:
    return {
        row.athlete_id
        for row in db.query(TrainerAssignment).filter(TrainerAssignment.trainer_id == trainer_id).all()
    }



def ensure_requested_athlete_scope_allowed(db: Session, user: User, athlete_ids: list[str] | None) -> list[str] | None:
    if user.role == 'athlete':
        return [user.id]

    if not athlete_ids:
        return None

    if user.role == 'trainer':
        assigned = list_assigned_athlete_ids(db, user.id)
        requested = set(athlete_ids)
        if not requested.issubset(assigned):
            raise AppError(
                code='requested_athlete_scope_forbidden',
                message='Requested athlete scope exceeds assignment',
                status_code=403,
            )
        return list(requested)

    if user.role == 'admin':
        return list(set(athlete_ids))

    raise AppError(code='forbidden', message='Forbidden', status_code=403)
