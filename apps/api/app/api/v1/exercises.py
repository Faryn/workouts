from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseOut, ExercisePatch
from app.services import exercise_service

router = APIRouter()


@router.get("/", response_model=list[ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return exercise_service.list_exercises(db, current_user)


@router.post("/", response_model=ExerciseOut)
def create_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return exercise_service.create_exercise(
        db,
        current_user,
        name=payload.name,
        exercise_type=payload.type,
        equipment=payload.equipment,
        notes=payload.notes,
        owner_scope=payload.owner_scope,
        owner_id=payload.owner_id,
    )


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def patch_exercise(
    exercise_id: str,
    payload: ExercisePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return exercise_service.patch_exercise(
        db,
        current_user,
        exercise_id,
        name=payload.name,
        exercise_type=payload.type,
        equipment=payload.equipment,
        notes=payload.notes,
    )


@router.delete("/{exercise_id}")
def delete_exercise(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return exercise_service.delete_exercise(db, current_user, exercise_id)
