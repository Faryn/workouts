from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.assignment import TrainerAssignment
from app.models.exercise import Exercise
from app.models.user import User

ALLOWED_TYPES = {"strength", "cardio"}
ALLOWED_SCOPES = {"global", "trainer", "athlete"}


def validate_exercise_type(exercise_type: str) -> None:
    if exercise_type not in ALLOWED_TYPES:
        raise AppError(code="invalid_exercise_type", message="Invalid exercise type", status_code=400)



def can_manage_exercise(current_user: User, exercise: Exercise) -> bool:
    if current_user.role == "admin":
        return True
    if exercise.owner_scope == "global":
        return False
    return exercise.owner_id == current_user.id



def resolve_create_exercise_ownership(
    db: Session,
    current_user: User,
    owner_scope: str | None,
    owner_id: str | None,
) -> tuple[str, str | None]:
    resolved_scope = owner_scope or current_user.role
    if resolved_scope == "admin":
        resolved_scope = "global"

    if resolved_scope not in ALLOWED_SCOPES:
        raise AppError(code="invalid_owner_scope", message="Invalid owner scope", status_code=400)

    if current_user.role == "athlete":
        if resolved_scope != "athlete":
            raise AppError(code="forbidden", message="Athletes can only create athlete-scoped exercises", status_code=403)
        return resolved_scope, current_user.id

    if current_user.role == "trainer":
        if resolved_scope == "global":
            raise AppError(code="forbidden", message="Trainers cannot create global exercises", status_code=403)
        if resolved_scope == "athlete":
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
            return resolved_scope, owner_id
        return resolved_scope, current_user.id

    if resolved_scope == "global":
        return resolved_scope, None
    if not owner_id:
        raise AppError(code="validation_error", message="owner_id is required for non-global scope", status_code=400)
    return resolved_scope, owner_id
