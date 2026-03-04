from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.assignment import TrainerAssignment
from app.models.user import User


def ensure_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise AppError(code="forbidden", message="Forbidden", status_code=403)


def ensure_self_or_assigned(db: Session, actor: User, athlete_id: str) -> None:
    token_athlete_ids = getattr(actor, "_token_athlete_ids", None)
    if token_athlete_ids is not None and athlete_id not in token_athlete_ids:
        raise AppError(code="token_scope_forbidden", message="Token does not allow access to athlete", status_code=403)

    if actor.role == "admin":
        return
    if actor.role == "athlete":
        if actor.id != athlete_id:
            raise AppError(code="forbidden", message="Forbidden", status_code=403)
        return
    if actor.role == "trainer":
        link = (
            db.query(TrainerAssignment)
            .filter(
                TrainerAssignment.trainer_id == actor.id,
                TrainerAssignment.athlete_id == athlete_id,
            )
            .first()
        )
        if not link:
            raise AppError(code="forbidden", message="Forbidden", status_code=403)
        return
    raise AppError(code="forbidden", message="Forbidden", status_code=403)
