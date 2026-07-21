from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class LoginRateLimit(Base):
    __tablename__ = "login_rate_limits"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    attempts_json: Mapped[str] = mapped_column(Text, default="[]")
    locked_until: Mapped[float | None] = mapped_column(Float, nullable=True)
