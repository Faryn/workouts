from datetime import date
from pydantic import BaseModel


class ScheduledCreate(BaseModel):
    athlete_id: str
    template_id: str
    date: date


class MoveCopyPayload(BaseModel):
    to_date: date


class ScheduledOut(BaseModel):
    id: str
    athlete_id: str
    template_id: str
    date: str
    status: str
    source: str
    notes: str | None = None
