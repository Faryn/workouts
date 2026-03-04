from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import hash_password
from app.models.user import User
from app.schemas.admin_user import AdminPasswordReset, AdminUserCreate, AdminUserOut, AdminUserPatch

router = APIRouter()


def _ensure_admin(current_user: User) -> None:
    if current_user.role != 'admin':
        raise AppError(code='forbidden', message='Admin access required', status_code=403)


def _serialize(u: User) -> dict:
    return {
        'id': u.id,
        'email': u.email,
        'role': u.role,
        'active': u.active,
    }


@router.get('/', response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_admin(current_user)
    rows = db.query(User).order_by(User.email.asc()).all()
    return [_serialize(u) for u in rows]


@router.post('/', response_model=AdminUserOut)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_admin(current_user)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise AppError(code='email_exists', message='Email already exists', status_code=409)

    row = User(
        email=payload.email,
        role=payload.role,
        password_hash=hash_password(payload.password),
        active=payload.active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.patch('/{user_id}', response_model=AdminUserOut)
def patch_user(
    user_id: str,
    payload: AdminUserPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_admin(current_user)
    row = db.get(User, user_id)
    if not row:
        raise AppError(code='user_not_found', message='User not found', status_code=404)

    if payload.email is not None and payload.email != row.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise AppError(code='email_exists', message='Email already exists', status_code=409)
        row.email = payload.email

    if payload.role is not None:
        row.role = payload.role
    if payload.active is not None:
        row.active = payload.active

    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.post('/{user_id}/password')
def reset_password(
    user_id: str,
    payload: AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_admin(current_user)
    row = db.get(User, user_id)
    if not row:
        raise AppError(code='user_not_found', message='User not found', status_code=404)

    row.password_hash = hash_password(payload.password)
    db.commit()
    return {'ok': True}
