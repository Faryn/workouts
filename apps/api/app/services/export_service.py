import csv
import io

from sqlalchemy.orm import Session

from app.models.cardio import CardioSession
from app.models.exercise import Exercise
from app.models.session import LoggedExercise, LoggedSet, WorkoutSession


def sessions_csv(db: Session, athlete_id: str) -> str:
    rows = (
        db.query(
            WorkoutSession.id,
            WorkoutSession.athlete_id,
            WorkoutSession.started_at,
            WorkoutSession.ended_at,
            WorkoutSession.duration_seconds,
            WorkoutSession.status,
            LoggedExercise.exercise_id,
            Exercise.name,
            LoggedSet.set_number,
            LoggedSet.planned_weight,
            LoggedSet.planned_reps,
            LoggedSet.actual_weight,
            LoggedSet.actual_reps,
            LoggedSet.status,
            LoggedSet.notes,
        )
        .join(LoggedExercise, LoggedExercise.session_id == WorkoutSession.id)
        .join(LoggedSet, LoggedSet.logged_exercise_id == LoggedExercise.id)
        .join(Exercise, Exercise.id == LoggedExercise.exercise_id)
        .filter(WorkoutSession.athlete_id == athlete_id)
        .order_by(WorkoutSession.started_at.desc(), LoggedExercise.sort_order.asc(), LoggedSet.set_number.asc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'session_id',
        'athlete_id',
        'started_at',
        'ended_at',
        'duration_seconds',
        'session_status',
        'exercise_id',
        'exercise_name',
        'set_number',
        'planned_weight',
        'planned_reps',
        'actual_weight',
        'actual_reps',
        'set_status',
        'set_notes',
    ])
    for r in rows:
        writer.writerow(list(r))
    return buffer.getvalue()


def exercise_history_csv(db: Session, athlete_id: str, exercise_id: str | None = None) -> str:
    query = (
        db.query(
            WorkoutSession.started_at,
            LoggedExercise.exercise_id,
            Exercise.name,
            LoggedSet.set_number,
            LoggedSet.planned_weight,
            LoggedSet.planned_reps,
            LoggedSet.actual_weight,
            LoggedSet.actual_reps,
            LoggedSet.status,
        )
        .join(LoggedExercise, LoggedExercise.session_id == WorkoutSession.id)
        .join(LoggedSet, LoggedSet.logged_exercise_id == LoggedExercise.id)
        .join(Exercise, Exercise.id == LoggedExercise.exercise_id)
        .filter(WorkoutSession.athlete_id == athlete_id)
        .order_by(WorkoutSession.started_at.desc(), Exercise.name.asc(), LoggedSet.set_number.asc())
    )
    if exercise_id:
        query = query.filter(LoggedExercise.exercise_id == exercise_id)

    rows = query.all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'date',
        'exercise_id',
        'exercise_name',
        'set_number',
        'planned_weight',
        'planned_reps',
        'actual_weight',
        'actual_reps',
        'set_status',
    ])
    for r in rows:
        date_str = r[0].date().isoformat() if r[0] else None
        writer.writerow([date_str, *list(r[1:])])
    return buffer.getvalue()


def cardio_csv(db: Session, athlete_id: str) -> str:
    rows = (
        db.query(CardioSession)
        .filter(CardioSession.athlete_id == athlete_id)
        .order_by(CardioSession.date.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['id', 'athlete_id', 'date', 'type', 'duration_seconds', 'distance', 'notes'])
    for r in rows:
        writer.writerow([r.id, r.athlete_id, r.date.isoformat(), r.type, r.duration_seconds, r.distance, r.notes])
    return buffer.getvalue()
