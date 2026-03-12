from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.permissions import ensure_self_or_assigned
from app.models.schedule import ScheduledWorkout
from app.models.user import User
from app.repositories import schedule_repo


def ensure_schedule_access(db: Session, current_user: User, athlete_id: str) -> None:
    ensure_self_or_assigned(db, current_user, athlete_id)



def get_authorized_scheduled(db: Session, current_user: User, scheduled_id: str) -> ScheduledWorkout:
    row = schedule_repo.get(db, scheduled_id)
    if not row:
        raise AppError(code='scheduled_not_found', message='Scheduled workout not found', status_code=404)
    ensure_schedule_access(db, current_user, row.athlete_id)
    return row
