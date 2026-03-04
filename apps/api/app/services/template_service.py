from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.template import WorkoutTemplate
from app.models.user import User
from app.repositories import template_repo


def _serialize_template(db: Session, t: WorkoutTemplate) -> dict:
    exercise_rows = template_repo.list_exercises(db, t.id)
    return {
        "id": t.id,
        "name": t.name,
        "notes": t.notes,
        "owner_id": t.owner_id,
        "exercises": [
            {
                "id": row.id,
                "exercise_id": row.exercise_id,
                "sort_order": row.sort_order,
                "planned_sets": row.planned_sets,
                "planned_reps": row.planned_reps,
                "planned_weight": row.planned_weight,
                "rest_seconds": row.rest_seconds,
                "notes": row.notes,
            }
            for row in exercise_rows
        ],
    }


def _is_exercise_visible_to_user(exercise: Exercise, user: User) -> bool:
    if exercise.owner_scope == "global":
        return True
    if exercise.owner_scope in {"athlete", "trainer"}:
        return exercise.owner_id == user.id
    return False


def _validate_exercises_payload(db: Session, user: User, exercises: list[dict]) -> None:
    for item in exercises:
        ex = db.get(Exercise, item["exercise_id"])
        if not ex:
            raise ValueError(f"Exercise not found: {item['exercise_id']}")
        if ex.type != "strength":
            raise ValueError("Only strength exercises can be used in workout templates")
        if not _is_exercise_visible_to_user(ex, user):
            raise ValueError(f"Exercise not visible to user: {item['exercise_id']}")



def list_templates(db: Session, user: User) -> list[dict]:
    rows = template_repo.list_by_owner(db, user.id)
    return [_serialize_template(db, t) for t in rows]



def create_template(
    db: Session,
    user: User,
    name: str,
    notes: str | None,
    exercises: list[dict] | None = None,
) -> dict:
    exercises = exercises or []
    _validate_exercises_payload(db, user, exercises)

    t = template_repo.create(db, user.id, name, notes)
    if exercises:
        template_repo.replace_exercises(db, t.id, exercises)

    db.commit()
    db.refresh(t)
    return _serialize_template(db, t)



def patch_template(
    db: Session,
    user: User,
    template_id: str,
    name: str | None,
    notes: str | None,
    exercises: list[dict] | None,
) -> dict | None:
    t = template_repo.get(db, template_id)
    if not t or t.owner_id != user.id:
        return None

    if name is not None:
        t.name = name
    if notes is not None:
        t.notes = notes
    if exercises is not None:
        _validate_exercises_payload(db, user, exercises)
        template_repo.replace_exercises(db, t.id, exercises)

    db.commit()
    db.refresh(t)
    return _serialize_template(db, t)



def delete_template(db: Session, user: User, template_id: str) -> bool:
    t = template_repo.get(db, template_id)
    if not t or t.owner_id != user.id:
        return False
    template_repo.delete(db, t)
    return True
