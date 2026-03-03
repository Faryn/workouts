from sqlalchemy.orm import Session

from app.models.template import WorkoutTemplate
from app.models.user import User
from app.repositories import template_repo


def list_templates(db: Session, user: User) -> list[WorkoutTemplate]:
    return template_repo.list_by_owner(db, user.id)


def create_template(db: Session, user: User, name: str, notes: str | None) -> WorkoutTemplate:
    return template_repo.create(db, user.id, name, notes)


def patch_template(
    db: Session,
    user: User,
    template_id: str,
    name: str | None,
    notes: str | None,
) -> WorkoutTemplate | None:
    t = template_repo.get(db, template_id)
    if not t or t.owner_id != user.id:
        return None
    if name is not None:
        t.name = name
    if notes is not None:
        t.notes = notes
    db.commit()
    db.refresh(t)
    return t


def delete_template(db: Session, user: User, template_id: str) -> bool:
    t = template_repo.get(db, template_id)
    if not t or t.owner_id != user.id:
        return False
    template_repo.delete(db, t)
    return True
