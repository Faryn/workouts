from app.core.errors import AppError
from app.models.exercise import Exercise
from app.models.user import User

ALLOWED_TYPES = {"strength", "cardio"}


def validate_exercise_type(exercise_type: str) -> None:
    if exercise_type not in ALLOWED_TYPES:
        raise AppError(code="invalid_exercise_type", message="Invalid exercise type", status_code=400)



def can_manage_exercise(current_user: User, exercise: Exercise) -> bool:
    return current_user.role == "admin"
