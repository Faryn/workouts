from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.permissions import ensure_self_or_assigned
from app.models.user import User
from app.repositories import session_repo


def ensure_session_access(db: Session, current_user: User, athlete_id: str) -> None:
    ensure_self_or_assigned(db, current_user, athlete_id)



def get_authorized_session(db: Session, current_user: User, session_id: str):
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise AppError(code="session_not_found", message="Session not found", status_code=404)
    ensure_session_access(db, current_user, ws.athlete_id)
    return ws
