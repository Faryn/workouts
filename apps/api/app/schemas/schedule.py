from datetime import date
from pydantic import BaseModel


class ScheduledCreate(BaseModel):
    athlete_id: str
    template_id: str
    date: date


class MoveCopyPayload(BaseModel):
    to_date: date


class ScheduledPatternCreate(BaseModel):
    athlete_id: str
    template_id: str
    start_date: date
    end_date: date
    pattern_type: str  # interval_days | weekday
    interval_days: int | None = None
    weekday: str | None = None  # monday..sunday


class ScheduledOut(BaseModel):
    id: str
    athlete_id: str
    template_id: str
    date: str
    status: str
    source: str
    notes: str | None = None
