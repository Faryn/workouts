from pydantic import BaseModel, Field, field_validator


class SessionStartPayload(BaseModel):
    scheduled_workout_id: str | None = None
    template_id: str | None = None


class LogSetPayload(BaseModel):
    logged_exercise_id: str
    set_number: int = Field(ge=1)
    actual_weight: float | None = Field(default=None, ge=0)
    actual_reps: int | None = Field(default=None, ge=0)
    status: str = "done"
    notes: str | None = None
    session_version: int = Field(ge=1)

    @field_validator('status')
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in {"done", "skipped"}:
            raise ValueError('status must be done or skipped')
        return value


class LoggedSetOut(BaseModel):
    id: str
    set_number: int
    planned_weight: float | None = None
    planned_reps: int | None = None
    actual_weight: float | None = None
    actual_reps: int | None = None
    status: str
    notes: str | None = None
    session_version: int | None = None
    last_saved_at: str | None = None


class LoggedExerciseOut(BaseModel):
    id: str
    exercise_id: str
    sort_order: int
    sets: list[LoggedSetOut]


class SessionOut(BaseModel):
    id: str
    athlete_id: str
    scheduled_workout_id: str | None = None
    status: str
    notes: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    last_saved_at: str | None = None
    updated_at: str | None = None
    version: int
    logged_exercises: list[LoggedExerciseOut]


class SessionAutosavePayload(BaseModel):
    notes: str | None = None
    session_version: int = Field(ge=1)


class SessionFinishPayload(BaseModel):
    session_version: int = Field(ge=1)
