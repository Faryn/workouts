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


class ScheduledBulkRangeBase(BaseModel):
    athlete_id: str
    from_date: date
    to_date: date


class ScheduledBulkMovePayload(ScheduledBulkRangeBase):
    shift_days: int


class ScheduledBulkReplaceTemplatePayload(ScheduledBulkRangeBase):
    template_id: str


class ScheduledBulkResult(BaseModel):
    updated: list['ScheduledOut']
    created: list['ScheduledOut'] = []
    matched_count: int


class ScheduledOut(BaseModel):
    id: str
    athlete_id: str
    template_id: str
    date: str
    status: str
    source: str
    notes: str | None = None
