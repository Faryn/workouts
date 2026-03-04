from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import hash_password
from app.models.user import User


def ensure_admin(current_user: User) -> None:
    if current_user.role != 'admin':
        raise AppError(code='forbidden', message='Admin access required', status_code=403)


def serialize_user(u: User) -> dict:
    return {
        'id': u.id,
        'email': u.email,
        'role': u.role,
        'active': u.active,
    }


def list_users(db: Session) -> list[dict]:
    rows = db.query(User).order_by(User.email.asc()).all()
    return [serialize_user(u) for u in rows]


def create_user(db: Session, email: str, role: str, password: str, active: bool) -> dict:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise AppError(code='email_exists', message='Email already exists', status_code=409)

    row = User(
        email=email,
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
    role: str | None,
    active: bool | None,
) -> dict:
    row = db.get(User, user_id)
    if not row:
        raise AppError(code='user_not_found', message='User not found', status_code=404)

    if email is not None and email != row.email:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise AppError(code='email_exists', message='Email already exists', status_code=409)
        row.email = email

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
