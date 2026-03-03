import uuid
from sqlalchemy import String, Date, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class CardioSession(Base):
    __tablename__ = "cardio_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[Date] = mapped_column(Date, index=True)
    type: Mapped[str] = mapped_column(Enum("running", "rowing", "cycling", "walking", "other", name="cardio_type"))
    duration_seconds: Mapped[int] = mapped_column(Integer)
    distance: Mapped[float | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
