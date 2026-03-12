import json

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.permissions import ensure_self_or_assigned
from app.models.assignment import TrainerAssignment
from app.models.audit import AuditEvent
from app.models.template import WorkoutTemplate
from app.models.user import User
from app.repositories import template_repo
from app.services.template_policy import can_manage_template, validate_exercises_payload
from app.services.template_serializers import serialize_template


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
    return [serialize_template(db, template, user) for template in rows]


def create_template(
    db: Session,
    user: User,
    name: str,
    notes: str | None,
    exercises: list[dict] | None = None,
) -> dict:
    exercises = exercises or []
    validate_exercises_payload(db, user, exercises, template_owner_id=user.id)

    template = template_repo.create(db, user.id, name, notes)
    if exercises:
        template_repo.replace_exercises(db, template.id, exercises)

    _record_template_audit(db, user, 'template.create', template, {'exercise_count': len(exercises)})
    db.commit()
    db.refresh(template)
    return serialize_template(db, template, user)


def patch_template(
    db: Session,
    user: User,
    template_id: str,
    name: str | None,
    notes: str | None,
    exercises: list[dict] | None,
) -> dict:
    template = template_repo.get(db, template_id)
    if not template:
        raise AppError(code='template_not_found', message='Template not found', status_code=404)
    if not can_manage_template(db, user, template):
        raise AppError(code='forbidden', message='Forbidden', status_code=403)

    if name is not None:
        template.name = name
    if notes is not None:
        template.notes = notes
    if exercises is not None:
        validate_exercises_payload(db, user, exercises, template_owner_id=template.owner_id)
        template_repo.replace_exercises(db, template.id, exercises)

    _record_template_audit(
        db,
        user,
        'template.patch',
        template,
        {
            'updated_name': name is not None,
            'updated_notes': notes is not None,
            'updated_exercises': exercises is not None,
        },
    )
    db.commit()
    db.refresh(template)
    return serialize_template(db, template, user)


def delete_template(db: Session, user: User, template_id: str) -> dict:
    template = template_repo.get(db, template_id)
    if not template:
        raise AppError(code='template_not_found', message='Template not found', status_code=404)
    if not can_manage_template(db, user, template):
        raise AppError(code='forbidden', message='Forbidden', status_code=403)

    _record_template_audit(db, user, 'template.delete', template, None)
    template_repo.delete(db, template)
    return {'ok': True}
