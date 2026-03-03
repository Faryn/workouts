import uuid
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class TrainerAssignment(Base):
    __tablename__ = "trainer_assignments"
    __table_args__ = (UniqueConstraint("trainer_id", "athlete_id", name="uq_trainer_athlete"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trainer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    athlete_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
