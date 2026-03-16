from datetime import timezone

from app.repositories import session_repo


def _iso_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def serialize_session_summary(db, ws) -> dict:
    logged_ex_count = len(session_repo.list_logged_exercises(db, ws.id))
    return {
        "id": ws.id,
        "athlete_id": ws.athlete_id,
        "scheduled_workout_id": ws.scheduled_workout_id,
        "status": ws.status,
        "started_at": _iso_utc(ws.started_at),
        "ended_at": _iso_utc(ws.ended_at),
        "duration_seconds": ws.duration_seconds,
        "exercise_count": logged_ex_count,
    }
