from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.exercise import Exercise
from app.models.user import User
from app.services.exercise_policy import (
    can_manage_exercise,
    validate_exercise_type,
)
from app.services.exercise_serializers import serialize_exercise


def list_exercises(db: Session, current_user: User) -> list[dict]:
    rows = (
        db.query(Exercise)
        .filter(Exercise.owner_scope == "global")
        .order_by(Exercise.name.asc())
        .all()
    )
    return [serialize_exercise(exercise) for exercise in rows]



def create_exercise(
    db: Session,
    current_user: User,
    name: str,
    exercise_type: str,
    equipment: str | None,
    notes: str | None,
) -> dict:
    validate_exercise_type(exercise_type)

    row = Exercise(
        name=name.strip(),
        type=exercise_type,
        owner_scope="global",
        owner_id=None,
        equipment=equipment,
        notes=notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_exercise(row)



def patch_exercise(
    db: Session,
    current_user: User,
    exercise_id: str,
    name: str | None,
    exercise_type: str | None,
    equipment: str | None,
    notes: str | None,
) -> dict:
    row = db.get(Exercise, exercise_id)
    if not row:
        raise AppError(code="not_found", message="Exercise not found", status_code=404)
    if not can_manage_exercise(current_user, row):
        raise AppError(code="forbidden", message="Forbidden", status_code=403)

    if exercise_type is not None:
        validate_exercise_type(exercise_type)
        row.type = exercise_type
    if name is not None:
        row.name = name.strip()
    if equipment is not None:
        row.equipment = equipment
    if notes is not None:
        row.notes = notes

    db.commit()
    db.refresh(row)
    return serialize_exercise(row)



def delete_exercise(db: Session, current_user: User, exercise_id: str) -> dict:
    row = db.get(Exercise, exercise_id)
    if not row:
        raise AppError(code="not_found", message="Exercise not found", status_code=404)
    if not can_manage_exercise(current_user, row):
        raise AppError(code="forbidden", message="Forbidden", status_code=403)

    db.delete(row)
    db.commit()
    return {"ok": True}
