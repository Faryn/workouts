from pydantic import BaseModel


class SessionStartPayload(BaseModel):
    scheduled_workout_id: str | None = None
    template_id: str | None = None


class LogSetPayload(BaseModel):
    logged_exercise_id: str
    set_number: int
    actual_weight: float | None = None
    actual_reps: int | None = None
    status: str = "done"
    notes: str | None = None


class LoggedSetOut(BaseModel):
    id: str
    set_number: int
    planned_weight: float | None = None
    planned_reps: int | None = None
    actual_weight: float | None = None
    actual_reps: int | None = None
    status: str
    notes: str | None = None


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
    logged_exercises: list[LoggedExerciseOut]
