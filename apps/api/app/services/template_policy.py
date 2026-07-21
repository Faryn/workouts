from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.assignment import TrainerAssignment
from app.models.exercise import Exercise
from app.models.template import WorkoutTemplate
from app.models.user import User


def is_assigned_trainer_for_athlete(db: Session, trainer_id: str, athlete_id: str) -> bool:
    link = (
        db.query(TrainerAssignment)
        .filter(
            TrainerAssignment.trainer_id == trainer_id,
            TrainerAssignment.athlete_id == athlete_id,
        )
        .first()
    )
    return link is not None


def can_manage_template(db: Session, user: User, template: WorkoutTemplate) -> bool:
    if user.role == 'admin':
        return True
    if template.owner_id == user.id:
        return True
    if user.role == 'trainer':
        return is_assigned_trainer_for_athlete(db, user.id, template.owner_id)
    return False


def can_use_template_for_athlete(db: Session, template: WorkoutTemplate, athlete_id: str) -> bool:
    """Return whether a program is visible in an athlete's program context."""
    if template.owner_id == athlete_id:
        return True
    return is_assigned_trainer_for_athlete(db, template.owner_id, athlete_id)


def ensure_template_usable_by_athlete(
    db: Session,
    template: WorkoutTemplate,
    athlete_id: str,
) -> None:
    if not can_use_template_for_athlete(db, template, athlete_id):
        # Do not reveal whether an inaccessible program exists.
        raise AppError(code="template_not_found", message="Template not found", status_code=404)


def is_exercise_visible_to_user(
    db: Session,
    exercise: Exercise,
    user: User,
    template_owner_id: str | None = None,
) -> bool:
    if exercise.owner_scope == "global":
        return True
    if exercise.owner_scope in {"athlete", "trainer"} and exercise.owner_id == user.id:
        return True
    if user.role == 'trainer' and template_owner_id and is_assigned_trainer_for_athlete(db, user.id, template_owner_id):
        return exercise.owner_id == template_owner_id
    return False


def validate_exercises_payload(
    db: Session,
    user: User,
    exercises: list[dict],
    template_owner_id: str | None = None,
) -> None:
    for item in exercises:
        ex = db.get(Exercise, item["exercise_id"])
        if not ex:
            raise AppError(code="exercise_not_found", message=f"Exercise not found: {item['exercise_id']}", status_code=400)
        if ex.type != "strength":
            raise AppError(code="invalid_template_exercise_type", message="Only strength exercises can be used in workout templates", status_code=400)
        if not is_exercise_visible_to_user(db, ex, user, template_owner_id=template_owner_id):
            raise AppError(code="exercise_not_visible", message=f"Exercise not visible to user: {item['exercise_id']}", status_code=400)
