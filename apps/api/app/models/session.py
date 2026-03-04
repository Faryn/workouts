import uuid
from sqlalchemy import String, DateTime, Integer, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    scheduled_workout_id: Mapped[str | None] = mapped_column(String, ForeignKey("scheduled_workouts.id"), nullable=True)
    started_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    last_saved_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(Enum("in_progress", "completed", "abandoned", name="session_status"), default="in_progress")


class LoggedExercise(Base):
    __tablename__ = "logged_exercises"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("workout_sessions.id"), index=True)
    exercise_id: Mapped[str] = mapped_column(String, ForeignKey("exercises.id"), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    template_exercise_id: Mapped[str | None] = mapped_column(String, ForeignKey("workout_template_exercises.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)


class LoggedSet(Base):
    __tablename__ = "logged_sets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    logged_exercise_id: Mapped[str] = mapped_column(String, ForeignKey("logged_exercises.id"), index=True)
    set_number: Mapped[int] = mapped_column(Integer)
    planned_weight: Mapped[float | None] = mapped_column(nullable=True)
    planned_reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_weight: Mapped[float | None] = mapped_column(nullable=True)
    actual_reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(Enum("done", "skipped", name="set_status"), default="done")
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
