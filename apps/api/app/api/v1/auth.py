from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth_cookie import clear_auth_cookie, set_auth_cookie
from app.core.db import get_db
from app.core.rate_limit import login_rate_limiter
from app.core.security import create_access_token, verify_password
from app.models.assignment import TrainerAssignment
from app.models.user import User
from app.services.admin_user_service import normalize_email

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    athlete_ids: list[str] | None = None


@router.post('/login')
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    normalized_email = normalize_email(payload.email)
    client_ip = request.headers.get('x-forwarded-for', request.client.host if request.client else 'unknown').split(',')[0].strip()
    rate_limit_key = f"{normalized_email}:{client_ip}"
    login_rate_limiter.check(rate_limit_key)

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        login_rate_limiter.register_failure(rate_limit_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    login_rate_limiter.register_success(rate_limit_key)

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

    token = create_access_token(user.id, claims=claims)
    set_auth_cookie(response, token)
    return {'access_token': token, 'token_type': 'bearer'}


@router.get('/me')
def me(current_user: User = Depends(get_current_user)):
    return {'id': current_user.id, 'email': current_user.email, 'name': current_user.name, 'role': current_user.role}


@router.post('/logout')
def logout(response: Response):
    clear_auth_cookie(response)
    return {'ok': True}


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
        return [{'id': u.id, 'email': u.email, 'name': u.name} for u in rows]

    if current_user.role == 'admin':
        rows = db.query(User).filter(User.role == 'athlete').order_by(User.email.asc()).all()
        return [{'id': u.id, 'email': u.email, 'name': u.name} for u in rows]

    return [{'id': current_user.id, 'email': current_user.email, 'name': current_user.name}]
