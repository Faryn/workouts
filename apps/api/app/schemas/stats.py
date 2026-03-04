from pydantic import BaseModel


class WeightPoint(BaseModel):
    date: str
    weight: float


class WeightsOverTimeOut(BaseModel):
    athlete_id: str
    exercise_id: str
    points: list[WeightPoint]
