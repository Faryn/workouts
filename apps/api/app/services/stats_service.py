from sqlalchemy.orm import Session

from app.models.session import LoggedExercise, LoggedSet, WorkoutSession


def weights_over_time(db: Session, athlete_id: str, exercise_id: str) -> dict:
    rows = (
        db.query(WorkoutSession.started_at, LoggedSet.actual_weight)
        .join(LoggedExercise, LoggedExercise.session_id == WorkoutSession.id)
        .join(LoggedSet, LoggedSet.logged_exercise_id == LoggedExercise.id)
        .filter(
            WorkoutSession.athlete_id == athlete_id,
            WorkoutSession.status == "completed",
            LoggedExercise.exercise_id == exercise_id,
            LoggedSet.actual_weight.isnot(None),
            LoggedSet.status == "done",
        )
        .all()
    )

    by_date: dict[str, float] = {}
    for started_at, weight in rows:
        if started_at is None or weight is None:
            continue
        d = started_at.date().isoformat()
        by_date[d] = max(by_date.get(d, float("-inf")), float(weight))

    points = [{"date": d, "weight": w} for d, w in sorted(by_date.items(), key=lambda x: x[0])]
    return {"athlete_id": athlete_id, "exercise_id": exercise_id, "points": points}
