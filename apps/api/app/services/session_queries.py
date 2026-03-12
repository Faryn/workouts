from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories import session_repo
from app.services.session_policy import ensure_session_access, get_authorized_session
from app.services.session_serializers import serialize_session
from app.services.session_summary_serializers import serialize_session_summary


def list_sessions(db: Session, current_user: User, athlete_id: str) -> list[dict]:
    ensure_session_access(db, current_user, athlete_id)
    rows = session_repo.list_sessions_by_athlete(db, athlete_id)
    return [serialize_session_summary(db, ws) for ws in rows]



def get_session_detail(db: Session, current_user: User, session_id: str) -> dict:
    ws = get_authorized_session(db, current_user, session_id)
    return serialize_session(db, ws)



def latest_in_progress_session(db: Session, current_user: User, athlete_id: str) -> dict | None:
    ensure_session_access(db, current_user, athlete_id)
    ws = session_repo.latest_in_progress_by_athlete(db, athlete_id)
    if not ws:
        return None
    return serialize_session(db, ws)
