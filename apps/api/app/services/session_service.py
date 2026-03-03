from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schedule import ScheduledWorkout
from app.models.session import LoggedExercise, LoggedSet, WorkoutSession
from app.models.template import WorkoutTemplateExercise
from app.models.user import User


def serialize_set(s: LoggedSet) -> dict:
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


def serialize_session(db: Session, ws: WorkoutSession) -> dict:
    logged_exs = (
        db.query(LoggedExercise)
        .filter(LoggedExercise.session_id == ws.id)
        .order_by(LoggedExercise.sort_order.asc())
        .all()
    )
    out_ex = []
    for le in logged_exs:
        sets = (
            db.query(LoggedSet)
            .filter(LoggedSet.logged_exercise_id == le.id)
            .order_by(LoggedSet.set_number.asc())
            .all()
        )
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

    ws = WorkoutSession(
        athlete_id=current_user.id,
        scheduled_workout_id=scheduled.id if scheduled else None,
        status="in_progress",
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)

    for row in template_rows:
        le = LoggedExercise(
            session_id=ws.id,
            exercise_id=row.exercise_id,
            sort_order=row.sort_order,
            template_exercise_id=row.id,
        )
        db.add(le)
        db.commit()
        db.refresh(le)

        for set_no in range(1, row.planned_sets + 1):
            ls = LoggedSet(
                logged_exercise_id=le.id,
                set_number=set_no,
                planned_weight=row.planned_weight,
                planned_reps=row.planned_reps,
                status="done",
            )
            db.add(ls)
        db.commit()

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
    ws = db.get(WorkoutSession, session_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Session not found")
    if ws.athlete_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    le = db.get(LoggedExercise, logged_exercise_id)
    if not le or le.session_id != ws.id:
        raise HTTPException(status_code=404, detail="Logged exercise not found")

    ls = (
        db.query(LoggedSet)
        .filter(LoggedSet.logged_exercise_id == le.id, LoggedSet.set_number == set_number)
        .first()
    )
    if not ls:
        raise HTTPException(status_code=404, detail="Set not found")

    ls.actual_weight = actual_weight
    ls.actual_reps = actual_reps
    ls.status = status
    ls.notes = notes
    db.commit()
    db.refresh(ls)
    return serialize_set(ls)


def finish_session(db: Session, current_user: User, session_id: str) -> dict:
    ws = db.get(WorkoutSession, session_id)
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

    db.commit()
    db.refresh(ws)
    return {"id": ws.id, "status": ws.status, "scheduled_workout_status": scheduled_status}
