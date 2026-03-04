from datetime import date
from pydantic import BaseModel


class CardioCreate(BaseModel):
    athlete_id: str
    date: date
    type: str
    duration_seconds: int
    distance: float | None = None
    notes: str | None = None


class CardioOut(BaseModel):
    id: str
    athlete_id: str
    date: str
    type: str
    duration_seconds: int
    distance: float | None = None
    notes: str | None = None
