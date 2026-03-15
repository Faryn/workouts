import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.schedule import ScheduledWorkout
from app.models.template import WorkoutTemplateExercise
from app.models.user import User
from app.repositories import session_repo
from app.services.session_serializers import serialize_session, serialize_set

logger = logging.getLogger(__name__)


def _assert_session_mutable(ws) -> None:
    if ws.status != "in_progress":
        raise AppError(code="session_not_in_progress", message="Session is no longer in progress", status_code=409)


def _assert_session_version(ws, expected_version: int) -> None:
    if ws.version != expected_version:
        raise AppError(
            code="session_conflict",
            message="Session changed since you loaded it",
            status_code=409,
            details={
                "session_id": ws.id,
                "expected_version": expected_version,
                "actual_version": ws.version,
                "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
            },
        )


def start_session(db: Session, current_user: User, scheduled_workout_id: str | None, template_id: str | None) -> dict:
    if current_user.role != "athlete":
        raise AppError(code="forbidden", message="Only athletes can start sessions in this slice", status_code=403)
    if not scheduled_workout_id and not template_id:
        raise AppError(code="validation_error", message="scheduled_workout_id or template_id required", status_code=400)

    scheduled = None
    chosen_template_id = template_id

    if scheduled_workout_id:
        scheduled = db.get(ScheduledWorkout, scheduled_workout_id)
        if not scheduled:
            raise AppError(code="scheduled_not_found", message="Scheduled workout not found", status_code=404)
        if scheduled.athlete_id != current_user.id:
            raise AppError(code="forbidden", message="Forbidden", status_code=403)
        chosen_template_id = scheduled.template_id

    existing = session_repo.latest_in_progress_by_athlete(db, current_user.id)
    if existing:
        if scheduled and existing.scheduled_workout_id == scheduled.id:
            logger.info("session.start.reuse_existing", extra={"athlete_id": current_user.id, "session_id": existing.id})
            return serialize_session(db, existing)
        raise AppError(
            code="session_already_in_progress",
            message="Finish or resume the existing in-progress session before starting a new one",
            status_code=409,
            details={"session_id": existing.id},
        )

    template_rows = (
        db.query(WorkoutTemplateExercise)
        .filter(WorkoutTemplateExercise.template_id == chosen_template_id)
        .order_by(WorkoutTemplateExercise.sort_order.asc())
        .all()
    )
    if not template_rows:
        raise AppError(code="template_empty", message="Template has no exercises", status_code=400)

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

    logger.info("session.start", extra={"athlete_id": current_user.id, "session_id": ws.id, "scheduled_workout_id": ws.scheduled_workout_id})
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
    session_version: int,
) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise AppError(code="session_not_found", message="Session not found", status_code=404)
    if ws.athlete_id != current_user.id:
        raise AppError(code="forbidden", message="Forbidden", status_code=403)
    _assert_session_mutable(ws)
    _assert_session_version(ws, session_version)

    le = session_repo.get_logged_exercise(db, logged_exercise_id)
    if not le or le.session_id != ws.id:
        raise AppError(code="logged_exercise_not_found", message="Logged exercise not found", status_code=404)

    ls = session_repo.get_set(db, le.id, set_number)
    if not ls:
        raise AppError(code="set_not_found", message="Set not found", status_code=404)

    ls.actual_weight = actual_weight
    ls.actual_reps = actual_reps
    ls.status = status
    ls.notes = notes
    session_repo.touch_session(ws)
    session_repo.commit(db)
    db.refresh(ls)
    db.refresh(ws)
    logger.info("session.log_set", extra={"athlete_id": current_user.id, "session_id": ws.id, "set_number": set_number, "status": status})
    payload = serialize_set(ls)
    payload["session_version"] = ws.version
    payload["last_saved_at"] = ws.last_saved_at.isoformat() if ws.last_saved_at else None
    return payload


def autosave_session(db: Session, current_user: User, session_id: str, notes: str | None = None, session_version: int = 1) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise AppError(code="session_not_found", message="Session not found", status_code=404)
    if ws.athlete_id != current_user.id:
        raise AppError(code="forbidden", message="Forbidden", status_code=403)
    _assert_session_mutable(ws)
    _assert_session_version(ws, session_version)

    normalized_notes = notes if notes is not None else ws.notes
    notes_changed = normalized_notes != ws.notes
    should_touch = notes_changed or ws.last_saved_at is None

    if notes_changed:
        ws.notes = normalized_notes
    if should_touch:
        session_repo.touch_session(ws)
        session_repo.commit(db)
        db.refresh(ws)
        logger.info("session.autosave", extra={"athlete_id": current_user.id, "session_id": ws.id, "changed": notes_changed})

    return {
        "id": ws.id,
        "status": ws.status,
        "notes": ws.notes,
        "last_saved_at": ws.last_saved_at.isoformat() if ws.last_saved_at else None,
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
        "version": ws.version,
    }


def finish_session(db: Session, current_user: User, session_id: str, session_version: int) -> dict:
    ws = session_repo.get_session(db, session_id)
    if not ws:
        raise AppError(code="session_not_found", message="Session not found", status_code=404)
    if ws.athlete_id != current_user.id:
        raise AppError(code="forbidden", message="Forbidden", status_code=403)
    _assert_session_mutable(ws)
    _assert_session_version(ws, session_version)

    ws.status = "completed"
    ended_at = datetime.now(timezone.utc)
    started_at = ws.started_at
    if started_at and started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    ws.ended_at = ended_at
    if started_at:
        ws.duration_seconds = int((ended_at - started_at).total_seconds())
    session_repo.touch_session(ws)

    scheduled_status = None
    if ws.scheduled_workout_id:
        sw = db.get(ScheduledWorkout, ws.scheduled_workout_id)
        if sw:
            sw.status = "completed"
            scheduled_status = sw.status

    session_repo.commit(db)
    db.refresh(ws)
    logger.info("session.finish", extra={"athlete_id": current_user.id, "session_id": ws.id, "scheduled_workout_status": scheduled_status})
    return {"id": ws.id, "status": ws.status, "scheduled_workout_status": scheduled_status, "version": ws.version}
