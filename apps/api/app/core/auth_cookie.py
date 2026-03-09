from __future__ import annotations

from fastapi import Response

from app.core.config import settings

AUTH_COOKIE_NAME = 'workout_access_token'


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.app_env.lower() == 'production',
        samesite='strict',
        max_age=60 * 60,
        path='/',
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=settings.app_env.lower() == 'production',
        samesite='strict',
        path='/',
    )
