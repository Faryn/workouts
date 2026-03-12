from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.template import WorkoutTemplate
from app.models.user import User
from app.repositories import template_repo
from app.services.template_policy import can_manage_template


def serialize_template(db: Session, template: WorkoutTemplate, user: User) -> dict:
    exercise_rows = template_repo.list_exercises(db, template.id)
    exercise_map = {
        ex.id: ex
        for ex in db.query(Exercise).filter(Exercise.id.in_([row.exercise_id for row in exercise_rows])).all()
    }
    serialized_exercises: list[dict] = []
    for row in exercise_rows:
        ex = exercise_map.get(row.exercise_id)
        serialized_exercises.append(
            {
                "id": row.id,
                "exercise_id": row.exercise_id,
                "exercise_name": ex.name if ex is not None else None,
                "sort_order": row.sort_order,
                "planned_sets": row.planned_sets,
                "planned_reps": row.planned_reps,
                "planned_weight": row.planned_weight,
                "rest_seconds": row.rest_seconds,
                "notes": row.notes,
            }
        )

    return {
        "id": template.id,
        "name": template.name,
        "notes": template.notes,
        "owner_id": template.owner_id,
        "can_manage": can_manage_template(db, user, template),
        "exercises": serialized_exercises,
    }
