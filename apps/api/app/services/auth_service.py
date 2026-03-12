from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import create_access_token, verify_password
from app.models.assignment import TrainerAssignment
from app.models.user import User
from app.services.admin_user_service import normalize_email
from app.services.assignment_policy import ensure_requested_athlete_scope_allowed


def authenticate_user(db: Session, email: str, password: str) -> User:
    normalized_email = normalize_email(email)
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not user.active or not verify_password(password, user.password_hash):
        raise AppError(code='invalid_credentials', message='Invalid credentials', status_code=401)
    return user



def issue_login_token(db: Session, email: str, password: str, athlete_ids: list[str] | None) -> dict:
    user = authenticate_user(db, email, password)
    scoped_athlete_ids = ensure_requested_athlete_scope_allowed(db, user, athlete_ids)

    claims = {'role': user.role}
    if scoped_athlete_ids is not None:
        claims['athlete_ids'] = scoped_athlete_ids

    token = create_access_token(user.id, claims=claims)
    return {'access_token': token, 'token_type': 'bearer'}



def list_assigned_athletes(db: Session, current_user: User) -> list[dict]:
    if current_user.role == 'trainer':
        rows = (
            db.query(User)
            .join(TrainerAssignment, TrainerAssignment.athlete_id == User.id)
            .filter(TrainerAssignment.trainer_id == current_user.id)
            .order_by(User.email.asc())
            .all()
        )
        return [{'id': u.id, 'email': u.email, 'name': u.name} for u in rows]

    if current_user.role == 'admin':
        rows = db.query(User).filter(User.role == 'athlete').order_by(User.email.asc()).all()
        return [{'id': u.id, 'email': u.email, 'name': u.name} for u in rows]

    return [{'id': current_user.id, 'email': current_user.email, 'name': current_user.name}]
