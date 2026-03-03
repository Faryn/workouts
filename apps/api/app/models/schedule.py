import uuid
from sqlalchemy import String, Date, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class ScheduledWorkout(Base):
    __tablename__ = "scheduled_workouts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[Date] = mapped_column(Date, index=True)
    template_id: Mapped[str] = mapped_column(String, ForeignKey("workout_templates.id"), index=True)
    status: Mapped[str] = mapped_column(Enum("planned", "completed", "skipped", name="scheduled_status"), default="planned")
    source: Mapped[str] = mapped_column(Enum("trainer", "athlete", "api", name="scheduled_source"), default="trainer")
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
