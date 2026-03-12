from app.repositories import session_repo


def serialize_session_summary(db, ws) -> dict:
    logged_ex_count = len(session_repo.list_logged_exercises(db, ws.id))
    return {
        "id": ws.id,
        "athlete_id": ws.athlete_id,
        "scheduled_workout_id": ws.scheduled_workout_id,
        "status": ws.status,
        "started_at": ws.started_at.isoformat() if ws.started_at else None,
        "ended_at": ws.ended_at.isoformat() if ws.ended_at else None,
        "duration_seconds": ws.duration_seconds,
        "exercise_count": logged_ex_count,
    }
