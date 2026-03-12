from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth_cookie import clear_auth_cookie, set_auth_cookie
from app.core.db import get_db
from app.core.errors import AppError
from app.core.rate_limit import login_rate_limiter
from app.models.user import User
from app.services import auth_service
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

    try:
        result = auth_service.issue_login_token(db, payload.email, payload.password, payload.athlete_ids)
    except AppError as exc:
        if exc.status_code == 401 and exc.code == 'invalid_credentials':
            login_rate_limiter.register_failure(rate_limit_key)
        raise

    login_rate_limiter.register_success(rate_limit_key)
    set_auth_cookie(response, result['access_token'])
    return result


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
    return auth_service.list_assigned_athletes(db, current_user)
