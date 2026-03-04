from pydantic import BaseModel, Field


class ExerciseBase(BaseModel):
    name: str = Field(min_length=1)
    type: str = Field(default="strength")
    equipment: str | None = None
    notes: str | None = None


class ExerciseCreate(ExerciseBase):
    owner_scope: str | None = None
    owner_id: str | None = None


class ExercisePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    type: str | None = None
    equipment: str | None = None
    notes: str | None = None


class ExerciseOut(BaseModel):
    id: str
    name: str
    type: str
    owner_scope: str
    owner_id: str | None = None
    equipment: str | None = None
    notes: str | None = None
