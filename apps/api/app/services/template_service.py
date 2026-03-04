import json

from sqlalchemy.orm import Session

from app.core.permissions import ensure_self_or_assigned
from app.models.assignment import TrainerAssignment
from app.models.audit import AuditEvent
from app.models.exercise import Exercise
from app.models.template import WorkoutTemplate
from app.models.user import User
from app.repositories import template_repo


def _is_assigned_trainer_for_athlete(db: Session, trainer_id: str, athlete_id: str) -> bool:
    link = (
        db.query(TrainerAssignment)
        .filter(
            TrainerAssignment.trainer_id == trainer_id,
            TrainerAssignment.athlete_id == athlete_id,
        )
        .first()
    )
    return link is not None


def _can_manage_template(db: Session, user: User, template: WorkoutTemplate) -> bool:
    if user.role == 'admin':
        return True
    if template.owner_id == user.id:
        return True
    if user.role == 'trainer':
        return _is_assigned_trainer_for_athlete(db, user.id, template.owner_id)
    return False


def _record_template_audit(
    db: Session,
    actor: User,
    action: str,
    template: WorkoutTemplate,
    metadata: dict | None = None,
) -> None:
    evt = AuditEvent(
        actor_id=actor.id,
        actor_role=actor.role,
        action=action,
        entity_type='workout_template',
        entity_id=template.id,
        metadata_json=json.dumps(metadata or {}),
    )
    db.add(evt)


def _serialize_template(db: Session, t: WorkoutTemplate, user: User) -> dict:
    exercise_rows = template_repo.list_exercises(db, t.id)
    exercise_map = {
        ex.id: ex
        for ex in db.query(Exercise).filter(Exercise.id.in_([row.exercise_id for row in exercise_rows])).all()
    }
    return {
        "id": t.id,
        "name": t.name,
        "notes": t.notes,
        "owner_id": t.owner_id,
        "can_manage": _can_manage_template(db, user, t),
        "exercises": [
            {
                "id": row.id,
                "exercise_id": row.exercise_id,
                "exercise_name": exercise_map.get(row.exercise_id).name if exercise_map.get(row.exercise_id) else None,
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


def _is_exercise_visible_to_user(db: Session, exercise: Exercise, user: User, template_owner_id: str | None = None) -> bool:
    if exercise.owner_scope == "global":
        return True
    if exercise.owner_scope in {"athlete", "trainer"} and exercise.owner_id == user.id:
        return True
    if user.role == 'trainer' and template_owner_id and _is_assigned_trainer_for_athlete(db, user.id, template_owner_id):
        return exercise.owner_id == template_owner_id
    return False


def _validate_exercises_payload(
    db: Session,
    user: User,
    exercises: list[dict],
    template_owner_id: str | None = None,
) -> None:
    for item in exercises:
        ex = db.get(Exercise, item["exercise_id"])
        if not ex:
            raise ValueError(f"Exercise not found: {item['exercise_id']}")
        if ex.type != "strength":
            raise ValueError("Only strength exercises can be used in workout templates")
        if not _is_exercise_visible_to_user(db, ex, user, template_owner_id=template_owner_id):
            raise ValueError(f"Exercise not visible to user: {item['exercise_id']}")


def list_templates(db: Session, user: User, athlete_id: str | None = None) -> list[dict]:
    if user.role == 'trainer' and athlete_id:
        ensure_self_or_assigned(db, user, athlete_id)
        rows = template_repo.list_by_owners(db, [user.id, athlete_id])
    elif user.role == 'admin' and athlete_id:
        rows = template_repo.list_by_owners(db, [user.id, athlete_id])
    elif user.role == 'athlete':
        trainer_ids = [
            row.trainer_id
            for row in db.query(TrainerAssignment).filter(TrainerAssignment.athlete_id == user.id).all()
        ]
        owner_ids = [user.id, *trainer_ids]
        rows = template_repo.list_by_owners(db, owner_ids)
    else:
        rows = template_repo.list_by_owner(db, user.id)
    return [_serialize_template(db, t, user) for t in rows]


def create_template(
    db: Session,
    user: User,
    name: str,
    notes: str | None,
    exercises: list[dict] | None = None,
) -> dict:
    exercises = exercises or []
    _validate_exercises_payload(db, user, exercises, template_owner_id=user.id)

    t = template_repo.create(db, user.id, name, notes)
    if exercises:
        template_repo.replace_exercises(db, t.id, exercises)

    _record_template_audit(db, user, 'template.create', t, {'exercise_count': len(exercises)})
    db.commit()
    db.refresh(t)
    return _serialize_template(db, t, user)


def patch_template(
    db: Session,
    user: User,
    template_id: str,
    name: str | None,
    notes: str | None,
    exercises: list[dict] | None,
) -> dict | None:
    t = template_repo.get(db, template_id)
    if not t or not _can_manage_template(db, user, t):
        return None

    if name is not None:
        t.name = name
    if notes is not None:
        t.notes = notes
    if exercises is not None:
        _validate_exercises_payload(db, user, exercises, template_owner_id=t.owner_id)
        template_repo.replace_exercises(db, t.id, exercises)

    _record_template_audit(
        db,
        user,
        'template.patch',
        t,
        {
            'updated_name': name is not None,
            'updated_notes': notes is not None,
            'updated_exercises': exercises is not None,
        },
    )
    db.commit()
    db.refresh(t)
    return _serialize_template(db, t, user)


def delete_template(db: Session, user: User, template_id: str) -> bool:
    t = template_repo.get(db, template_id)
    if not t or not _can_manage_template(db, user, t):
        return False
    _record_template_audit(db, user, 'template.delete', t, None)
    template_repo.delete(db, t)
    return True
