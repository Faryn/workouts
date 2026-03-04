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
    athlete_ids: list[str] | None = None


@router.post('/login')
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    athlete_ids: list[str] | None = None
    if user.role == 'athlete':
        athlete_ids = [user.id]
    elif payload.athlete_ids:
        if user.role == 'trainer':
            assigned = {
                row.athlete_id
                for row in db.query(TrainerAssignment).filter(TrainerAssignment.trainer_id == user.id).all()
            }
            requested = set(payload.athlete_ids)
            if not requested.issubset(assigned):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Requested athlete scope exceeds assignment')
            athlete_ids = list(requested)
        elif user.role == 'admin':
            athlete_ids = list(set(payload.athlete_ids))

    claims = {'role': user.role}
    if athlete_ids is not None:
        claims['athlete_ids'] = athlete_ids

    return {'access_token': create_access_token(user.id, claims=claims), 'token_type': 'bearer'}


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
