from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import ensure_self_or_assigned
from app.models.schedule import ScheduledWorkout
from app.models.template import WorkoutTemplateExercise
from app.models.user import User
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


def start_session(db: Session, current_user: User, scheduled_workout_id: str | None, template_id: str | None) -> dict:
    if current_user.role != "athlete":
        raise HTTPException(status_code=403, detail="Only athletes can start sessions in this slice")
    if not scheduled_workout_id and not template_id:
        raise HTTPException(status_code=400, detail="scheduled_workout_id or template_id required")

    scheduled = None
    chosen_template_id = template_id

    if scheduled_workout_id:
        scheduled = db.get(ScheduledWorkout, scheduled_workout_id)
        if not scheduled:
            raise HTTPException(status_code=404, detail="Scheduled workout not found")
        if scheduled.athlete_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        chosen_template_id = scheduled.template_id

    template_rows = (
        db.query(WorkoutTemplateExercise)
        .filter(WorkoutTemplateExercise.template_id == chosen_template_id)
        .order_by(WorkoutTemplateExercise.sort_order.asc())
        .all()
    )
    if not template_rows:
        raise HTTPException(status_code=400, detail="Template has no exercises")

    ws = session_repo.create_session(db, current_user.id, scheduled.id if scheduled else None)

    for row in template_rows:
        le = session_repo.create_logged_exercise(
            db,
            session_id=ws.id,
            exercise_id=row.exercise_id,
            sort_order=row.sort_order,
            template_exercise_id=row.id,
        )
        for set_no in range(1, row.planned_sets + 1):
            session_repo.create_logged_set(
                db,
                logged_exercise_id=le.id,
                set_number=set_no,
                planned_weight=row.planned_weight,
                planned_reps=row.planned_reps,
            )
        session_repo.commit(db)

    return serialize_session(db, ws)


def upsert_set(
    db: Session,
    current_user: User,
    session_id: str,
    logged_exercise_id: str,
    set_number: int,
    actual_weight: float | None,
    actual_reps: int | None,
    status: str,
    notes: str | None,
) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Session not found")
    if ws.athlete_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    le = session_repo.get_logged_exercise(db, logged_exercise_id)
    if not le or le.session_id != ws.id:
        raise HTTPException(status_code=404, detail="Logged exercise not found")

    ls = session_repo.get_set(db, le.id, set_number)
    if not ls:
        raise HTTPException(status_code=404, detail="Set not found")

    ls.actual_weight = actual_weight
    ls.actual_reps = actual_reps
    ls.status = status
    ls.notes = notes
    ws.last_saved_at = datetime.now(timezone.utc)
    session_repo.commit(db)
    db.refresh(ls)
    return serialize_set(ls)


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


def autosave_session(db: Session, current_user: User, session_id: str, notes: str | None = None) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Session not found")
    if ws.athlete_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    ws.last_saved_at = datetime.now(timezone.utc)
    if notes is not None:
        ws.notes = notes
    session_repo.commit(db)
    db.refresh(ws)
    return {
        "id": ws.id,
        "status": ws.status,
        "notes": ws.notes,
        "last_saved_at": ws.last_saved_at.isoformat() if ws.last_saved_at else None,
    }


def finish_session(db: Session, current_user: User, session_id: str) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Session not found")
    if ws.athlete_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    ws.status = "completed"
    ws.ended_at = datetime.now()
    if ws.started_at and ws.ended_at:
        ws.duration_seconds = int((ws.ended_at - ws.started_at).total_seconds())

    scheduled_status = None
    if ws.scheduled_workout_id:
        sw = db.get(ScheduledWorkout, ws.scheduled_workout_id)
        if sw:
            sw.status = "completed"
            scheduled_status = sw.status

    session_repo.commit(db)
    db.refresh(ws)
    return {"id": ws.id, "status": ws.status, "scheduled_workout_status": scheduled_status}
