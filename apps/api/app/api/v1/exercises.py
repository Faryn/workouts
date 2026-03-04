from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.errors import AppError
from app.models.assignment import TrainerAssignment
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseOut, ExercisePatch

router = APIRouter()


ALLOWED_TYPES = {"strength", "cardio"}
ALLOWED_SCOPES = {"global", "trainer", "athlete"}


def _serialize(e: Exercise) -> dict:
    return {
        "id": e.id,
        "name": e.name,
        "type": e.type,
        "owner_scope": e.owner_scope,
        "owner_id": e.owner_id,
        "equipment": e.equipment,
        "notes": e.notes,
    }


def _validate_type(exercise_type: str) -> None:
    if exercise_type not in ALLOWED_TYPES:
        raise AppError(code="invalid_exercise_type", message="Invalid exercise type", status_code=400)


def _can_manage(current_user: User, exercise: Exercise) -> bool:
    if current_user.role == "admin":
        return True
    if exercise.owner_scope == "global":
        return False
    return exercise.owner_id == current_user.id


@router.get("/", response_model=list[ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Exercise)
        .filter(
            (Exercise.owner_scope == "global")
            | ((Exercise.owner_id == current_user.id) & (Exercise.owner_scope.in_(["trainer", "athlete"])))
        )
        .order_by(Exercise.name.asc())
        .all()
    )
    return [_serialize(e) for e in rows]


@router.post("/", response_model=ExerciseOut)
def create_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_type(payload.type)

    owner_scope = payload.owner_scope or current_user.role
    if owner_scope == "admin":
        owner_scope = "global"

    if owner_scope not in ALLOWED_SCOPES:
        raise AppError(code="invalid_owner_scope", message="Invalid owner scope", status_code=400)

    owner_id = payload.owner_id

    if current_user.role == "athlete":
        if owner_scope != "athlete":
            raise AppError(code="forbidden", message="Athletes can only create athlete-scoped exercises", status_code=403)
        owner_id = current_user.id

    elif current_user.role == "trainer":
        if owner_scope == "global":
            raise AppError(code="forbidden", message="Trainers cannot create global exercises", status_code=403)
        if owner_scope == "athlete":
            if not owner_id:
                raise AppError(code="validation_error", message="owner_id is required for athlete scope", status_code=400)
            link = (
                db.query(TrainerAssignment)
                .filter(
                    TrainerAssignment.trainer_id == current_user.id,
                    TrainerAssignment.athlete_id == owner_id,
                )
                .first()
            )
            if not link:
                raise AppError(code="forbidden", message="Trainer not assigned to athlete", status_code=403)
        else:
            owner_id = current_user.id

    else:  # admin
        if owner_scope == "global":
            owner_id = None
        elif not owner_id:
            raise AppError(code="validation_error", message="owner_id is required for non-global scope", status_code=400)

    row = Exercise(
        name=payload.name.strip(),
        type=payload.type,
        owner_scope=owner_scope,
        owner_id=owner_id,
        equipment=payload.equipment,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def patch_exercise(
    exercise_id: str,
    payload: ExercisePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(Exercise, exercise_id)
    if not row:
        raise AppError(code="not_found", message="Exercise not found", status_code=404)
    if not _can_manage(current_user, row):
        raise AppError(code="forbidden", message="Forbidden", status_code=403)

    if payload.type is not None:
        _validate_type(payload.type)
        row.type = payload.type
    if payload.name is not None:
        row.name = payload.name.strip()
    if payload.equipment is not None:
        row.equipment = payload.equipment
    if payload.notes is not None:
        row.notes = payload.notes

    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/{exercise_id}")
def delete_exercise(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(Exercise, exercise_id)
    if not row:
        raise AppError(code="not_found", message="Exercise not found", status_code=404)
    if not _can_manage(current_user, row):
        raise AppError(code="forbidden", message="Forbidden", status_code=403)

    db.delete(row)
    db.commit()
    return {"ok": True}
