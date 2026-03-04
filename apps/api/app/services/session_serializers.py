from sqlalchemy.orm import Session

from app.repositories import session_repo


def serialize_set(s) -> dict:
    return {
        "id": s.id,
        "set_number": s.set_number,
        "planned_weight": s.planned_weight,
        "planned_reps": s.planned_reps,
        "actual_weight": s.actual_weight,
        "actual_reps": s.actual_reps,
        "status": s.status,
        "notes": s.notes,
    }


def serialize_session(db: Session, ws) -> dict:
    logged_exs = session_repo.list_logged_exercises(db, ws.id)
    out_ex = []
    for le in logged_exs:
        sets = session_repo.list_logged_sets(db, le.id)
        out_ex.append(
            {
                "id": le.id,
                "exercise_id": le.exercise_id,
                "sort_order": le.sort_order,
                "sets": [serialize_set(s) for s in sets],
            }
        )
    return {
        "id": ws.id,
        "athlete_id": ws.athlete_id,
        "scheduled_workout_id": ws.scheduled_workout_id,
        "status": ws.status,
        "notes": ws.notes,
        "started_at": ws.started_at.isoformat() if ws.started_at else None,
        "ended_at": ws.ended_at.isoformat() if ws.ended_at else None,
        "last_saved_at": ws.last_saved_at.isoformat() if ws.last_saved_at else None,
        "logged_exercises": out_ex,
    }
