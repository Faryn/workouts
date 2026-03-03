from typing import cast

from fastapi import FastAPI

from app.api.v1 import (
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
from app.core.errors import AppError, app_error_handler

app = FastAPI(title="Workout API", version="0.1.0")
app.add_exception_handler(AppError, cast(object, app_error_handler))

app.include_router(health.router, prefix="/v1", tags=["health"])
app.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
app.include_router(exercises.router, prefix="/v1/exercises", tags=["exercises"])
app.include_router(templates.router, prefix="/v1/templates", tags=["templates"])
app.include_router(scheduled_workouts.router, prefix="/v1/scheduled-workouts", tags=["scheduled-workouts"])
app.include_router(sessions.router, prefix="/v1/sessions", tags=["sessions"])
app.include_router(cardio_sessions.router, prefix="/v1/cardio-sessions", tags=["cardio"])
app.include_router(stats.router, prefix="/v1/stats", tags=["stats"])
app.include_router(exports.router, prefix="/v1/exports", tags=["exports"])
