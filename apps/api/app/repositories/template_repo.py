from sqlalchemy.orm import Session

from app.models.template import WorkoutTemplate


def list_by_owner(db: Session, owner_id: str) -> list[WorkoutTemplate]:
    return (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.owner_id == owner_id)
        .order_by(WorkoutTemplate.name.asc())
        .all()
    )


def get(db: Session, template_id: str) -> WorkoutTemplate | None:
    return db.get(WorkoutTemplate, template_id)


def create(db: Session, owner_id: str, name: str, notes: str | None) -> WorkoutTemplate:
    row = WorkoutTemplate(owner_id=owner_id, name=name, notes=notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session, row: WorkoutTemplate) -> None:
    db.delete(row)
    db.commit()
