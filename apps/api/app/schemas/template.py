from pydantic import BaseModel, Field


class TemplateExerciseIn(BaseModel):
    exercise_id: str
    sort_order: int | None = Field(default=None, ge=1)
    planned_sets: int = Field(ge=1)
    planned_reps: int = Field(ge=1)
    planned_weight: float | None = None
    rest_seconds: int | None = Field(default=None, ge=0)
    notes: str | None = None


class TemplateExerciseOut(BaseModel):
    id: str
    exercise_id: str
    sort_order: int
    planned_sets: int
    planned_reps: int
    planned_weight: float | None = None
    rest_seconds: int | None = None
    notes: str | None = None


class TemplateCreate(BaseModel):
    name: str
    notes: str | None = None
    exercises: list[TemplateExerciseIn] = Field(default_factory=list)


class TemplatePatch(BaseModel):
    name: str | None = None
    notes: str | None = None
    exercises: list[TemplateExerciseIn] | None = None


class TemplateOut(BaseModel):
    id: str
    name: str
    notes: str | None = None
    owner_id: str
    exercises: list[TemplateExerciseOut] = Field(default_factory=list)
