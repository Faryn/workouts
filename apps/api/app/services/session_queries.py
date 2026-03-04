from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import ensure_self_or_assigned
from app.models.user import User
from app.repositories import session_repo
from app.services.session_serializers import serialize_session


def list_sessions(db: Session, current_user: User, athlete_id: str) -> list[dict]:
    ensure_self_or_assigned(db, current_user, athlete_id)
    rows = session_repo.list_sessions_by_athlete(db, athlete_id)
    out: list[dict] = []
    for ws in rows:
        logged_ex_count = len(session_repo.list_logged_exercises(db, ws.id))
        out.append(
            {
                "id": ws.id,
                "athlete_id": ws.athlete_id,
                "scheduled_workout_id": ws.scheduled_workout_id,
                "status": ws.status,
                "started_at": ws.started_at.isoformat() if ws.started_at else None,
                "ended_at": ws.ended_at.isoformat() if ws.ended_at else None,
                "duration_seconds": ws.duration_seconds,
                "exercise_count": logged_ex_count,
            }
        )
    return out


def get_session_detail(db: Session, current_user: User, session_id: str) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Session not found")
    ensure_self_or_assigned(db, current_user, ws.athlete_id)
    return serialize_session(db, ws)


def latest_in_progress_session(db: Session, current_user: User, athlete_id: str) -> dict | None:
    ensure_self_or_assigned(db, current_user, athlete_id)
    ws = session_repo.latest_in_progress_by_athlete(db, athlete_id)
    if not ws:
        return None
    return serialize_session(db, ws)
