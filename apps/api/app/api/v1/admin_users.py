from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.admin_user import AdminPasswordReset, AdminUserCreate, AdminUserOut, AdminUserPatch
from app.services import admin_user_service

router = APIRouter()


@router.get('/', response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_user_service.ensure_admin(current_user)
    return admin_user_service.list_users(db)


@router.post('/', response_model=AdminUserOut)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_user_service.ensure_admin(current_user)
    return admin_user_service.create_user(
        db,
        email=payload.email,
        role=payload.role,
        password=payload.password,
        active=payload.active,
    )


@router.patch('/{user_id}', response_model=AdminUserOut)
def patch_user(
    user_id: str,
    payload: AdminUserPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_user_service.ensure_admin(current_user)
    return admin_user_service.patch_user(
        db,
        user_id=user_id,
        email=payload.email,
        role=payload.role,
        active=payload.active,
    )


@router.post('/{user_id}/password')
def reset_password(
    user_id: str,
    payload: AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_user_service.ensure_admin(current_user)
    return admin_user_service.reset_password(db, user_id=user_id, password=payload.password)
