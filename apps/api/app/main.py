from typing import cast

from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.logging import RequestContextMiddleware, configure_logging

from app.api.v1 import (
    admin_users,
    auth,
    cardio_sessions,
    exercises,
    exports,
    health,
    scheduled_workouts,
    sessions,
    stats,
    templates,
)
from app.core.config import settings
from app.core.errors import AppError, app_error_handler

configure_logging()

is_production = settings.app_env.lower() == "production"
app = FastAPI(
    title="Workout API",
    version="0.1.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)
app.add_exception_handler(AppError, cast(object, app_error_handler))
app.add_middleware(RequestContextMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver", "api", "workouts.thepowl.de"])

app.include_router(health.router, prefix="/v1", tags=["health"])
app.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
app.include_router(admin_users.router, prefix="/v1/admin/users", tags=["admin-users"])
app.include_router(exercises.router, prefix="/v1/exercises", tags=["exercises"])
app.include_router(templates.router, prefix="/v1/templates", tags=["templates"])
app.include_router(scheduled_workouts.router, prefix="/v1/scheduled-workouts", tags=["scheduled-workouts"])
app.include_router(sessions.router, prefix="/v1/sessions", tags=["sessions"])
app.include_router(cardio_sessions.router, prefix="/v1/cardio-sessions", tags=["cardio"])
app.include_router(stats.router, prefix="/v1/stats", tags=["stats"])
app.include_router(exports.router, prefix="/v1/exports", tags=["exports"])
