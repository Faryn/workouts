from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.security import create_access_token, verify_password
from app.models.assignment import TrainerAssignment
from app.models.user import User

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post('/login')
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
    return {'access_token': create_access_token(user.id), 'token_type': 'bearer'}


@router.get('/me')
def me(current_user: User = Depends(get_current_user)):
    return {'id': current_user.id, 'email': current_user.email, 'role': current_user.role}


@router.get('/assigned-athletes')
def assigned_athletes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == 'trainer':
        rows = (
            db.query(User)
            .join(TrainerAssignment, TrainerAssignment.athlete_id == User.id)
            .filter(TrainerAssignment.trainer_id == current_user.id)
            .order_by(User.email.asc())
            .all()
        )
        return [{'id': u.id, 'email': u.email} for u in rows]

    if current_user.role == 'admin':
        rows = db.query(User).filter(User.role == 'athlete').order_by(User.email.asc()).all()
        return [{'id': u.id, 'email': u.email} for u in rows]

    return [{'id': current_user.id, 'email': current_user.email}]
