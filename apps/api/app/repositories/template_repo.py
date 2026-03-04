from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.template import WorkoutTemplate, WorkoutTemplateExercise


def list_by_owner(db: Session, owner_id: str) -> list[WorkoutTemplate]:
    return (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.owner_id == owner_id)
        .order_by(WorkoutTemplate.name.asc())
        .all()
    )


def list_by_owners(db: Session, owner_ids: list[str]) -> list[WorkoutTemplate]:
    if not owner_ids:
        return []
    return (
        db.query(WorkoutTemplate)
        .filter(or_(*[WorkoutTemplate.owner_id == owner_id for owner_id in owner_ids]))
        .order_by(WorkoutTemplate.name.asc())
        .all()
    )


def get(db: Session, template_id: str) -> WorkoutTemplate | None:
    return db.get(WorkoutTemplate, template_id)


def list_exercises(db: Session, template_id: str) -> list[WorkoutTemplateExercise]:
    return (
        db.query(WorkoutTemplateExercise)
        .filter(WorkoutTemplateExercise.template_id == template_id)
        .order_by(WorkoutTemplateExercise.sort_order.asc())
        .all()
    )


def create(db: Session, owner_id: str, name: str, notes: str | None) -> WorkoutTemplate:
    row = WorkoutTemplate(owner_id=owner_id, name=name, notes=notes)
    db.add(row)
    db.flush()
    return row


def replace_exercises(
    db: Session,
    template_id: str,
    exercises: list[dict],
) -> list[WorkoutTemplateExercise]:
    db.query(WorkoutTemplateExercise).filter(WorkoutTemplateExercise.template_id == template_id).delete()

    out: list[WorkoutTemplateExercise] = []
    for idx, ex in enumerate(exercises):
        row = WorkoutTemplateExercise(
            template_id=template_id,
            exercise_id=ex["exercise_id"],
            sort_order=ex.get("sort_order") if ex.get("sort_order") is not None else (idx + 1),
            planned_sets=ex["planned_sets"],
            planned_reps=ex["planned_reps"],
            planned_weight=ex.get("planned_weight"),
            rest_seconds=ex.get("rest_seconds"),
            notes=ex.get("notes"),
        )
        db.add(row)
        out.append(row)

    db.flush()
    return out


def delete(db: Session, row: WorkoutTemplate) -> None:
    db.delete(row)
    db.commit()
