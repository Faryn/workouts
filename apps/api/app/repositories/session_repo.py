from sqlalchemy.orm import Session

from app.models.session import LoggedExercise, LoggedSet, WorkoutSession


def list_sessions_by_athlete(db: Session, athlete_id: str) -> list[WorkoutSession]:
    return (
        db.query(WorkoutSession)
        .filter(WorkoutSession.athlete_id == athlete_id)
        .order_by(WorkoutSession.started_at.desc())
        .all()
    )


def latest_in_progress_by_athlete(db: Session, athlete_id: str) -> WorkoutSession | None:
    return (
        db.query(WorkoutSession)
        .filter(WorkoutSession.athlete_id == athlete_id, WorkoutSession.status == "in_progress")
        .order_by(WorkoutSession.started_at.desc())
        .first()
    )


def get_session(db: Session, session_id: str) -> WorkoutSession | None:
    return db.get(WorkoutSession, session_id)


def create_session(db: Session, athlete_id: str, scheduled_workout_id: str | None) -> WorkoutSession:
    ws = WorkoutSession(
        athlete_id=athlete_id,
        scheduled_workout_id=scheduled_workout_id,
        status="in_progress",
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


def create_logged_exercise(
    db: Session,
    session_id: str,
    exercise_id: str,
    sort_order: int,
    template_exercise_id: str | None,
) -> LoggedExercise:
    le = LoggedExercise(
        session_id=session_id,
        exercise_id=exercise_id,
        sort_order=sort_order,
        template_exercise_id=template_exercise_id,
    )
    db.add(le)
    db.commit()
    db.refresh(le)
    return le


def create_logged_set(
    db: Session,
    logged_exercise_id: str,
    set_number: int,
    planned_weight: float | None,
    planned_reps: int | None,
) -> LoggedSet:
    ls = LoggedSet(
        logged_exercise_id=logged_exercise_id,
        set_number=set_number,
        planned_weight=planned_weight,
        planned_reps=planned_reps,
        status="done",
    )
    db.add(ls)
    return ls


def commit(db: Session) -> None:
    db.commit()


def list_logged_exercises(db: Session, session_id: str) -> list[LoggedExercise]:
    return (
        db.query(LoggedExercise)
        .filter(LoggedExercise.session_id == session_id)
        .order_by(LoggedExercise.sort_order.asc())
        .all()
    )


def list_logged_sets(db: Session, logged_exercise_id: str) -> list[LoggedSet]:
    return (
        db.query(LoggedSet)
        .filter(LoggedSet.logged_exercise_id == logged_exercise_id)
        .order_by(LoggedSet.set_number.asc())
        .all()
    )


def get_logged_exercise(db: Session, logged_exercise_id: str) -> LoggedExercise | None:
    return db.get(LoggedExercise, logged_exercise_id)


def get_set(db: Session, logged_exercise_id: str, set_number: int) -> LoggedSet | None:
    return (
        db.query(LoggedSet)
        .filter(LoggedSet.logged_exercise_id == logged_exercise_id, LoggedSet.set_number == set_number)
        .first()
    )
