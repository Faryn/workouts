from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import hash_password
from app.models.user import User


def normalize_email(email: str) -> str:
    return email.strip().lower()


def ensure_admin(current_user: User) -> None:
    if current_user.role != 'admin':
        raise AppError(code='forbidden', message='Admin access required', status_code=403)


def serialize_user(u: User) -> dict:
    return {
        'id': u.id,
        'email': u.email,
        'name': u.name,
        'role': u.role,
        'active': u.active,
    }


def list_users(db: Session) -> list[dict]:
    rows = db.query(User).order_by(User.email.asc()).all()
    return [serialize_user(u) for u in rows]


def create_user(db: Session, email: str, name: str | None, role: str, password: str, active: bool) -> dict:
    normalized_email = normalize_email(email)
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        raise AppError(code='email_exists', message='Email already exists', status_code=409)

    row = User(
        email=normalized_email,
        name=name.strip() if name else None,
        role=role,
        password_hash=hash_password(password),
        active=active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_user(row)


def patch_user(
    db: Session,
    user_id: str,
    email: str | None,
    name: str | None,
    role: str | None,
    active: bool | None,
) -> dict:
    row = db.get(User, user_id)
    if not row:
        raise AppError(code='user_not_found', message='User not found', status_code=404)

    if email is not None:
        normalized_email = normalize_email(email)
        if normalized_email != row.email:
            existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
            if existing:
                raise AppError(code='email_exists', message='Email already exists', status_code=409)
            row.email = normalized_email

    if name is not None:
        row.name = name.strip() or None
    if role is not None:
        row.role = role
    if active is not None:
        row.active = active

    db.commit()
    db.refresh(row)
    return serialize_user(row)


def reset_password(db: Session, user_id: str, password: str) -> dict:
    row = db.get(User, user_id)
    if not row:
        raise AppError(code='user_not_found', message='User not found', status_code=404)

    row.password_hash = hash_password(password)
    db.commit()
    return {'ok': True}
