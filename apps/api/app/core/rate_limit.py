from __future__ import annotations

from dataclasses import dataclass
import json
from time import time

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.models.login_rate_limit import LoginRateLimit


@dataclass(frozen=True)
class RateLimitConfig:
    attempts: int = 5
    window_seconds: int = 300
    lockout_seconds: int = 900


class LoginRateLimiter:
    def __init__(self, config: RateLimitConfig | None = None):
        self.config = config or RateLimitConfig()
    def _prune(self, attempts: list[float], now: float) -> list[float]:
        window_start = now - self.config.window_seconds
        return [attempt for attempt in attempts if attempt >= window_start]

    def check(self, db: Session, key: str) -> None:
        now = time()
        row = db.get(LoginRateLimit, key)
        if not row:
            return
        if row.locked_until and row.locked_until > now:
            retry_after = max(1, int(row.locked_until - now))
            raise AppError(
                code='rate_limited',
                message='Too many login attempts. Try again later.',
                status_code=429,
                details={'retry_after_seconds': retry_after},
            )
        attempts = self._prune(json.loads(row.attempts_json), now)
        if attempts:
            row.attempts_json = json.dumps(attempts)
            row.locked_until = None
        else:
            db.delete(row)

    def register_failure(self, db: Session, key: str) -> None:
        now = time()
        row = db.get(LoginRateLimit, key) or LoginRateLimit(key=key, attempts_json="[]")
        attempts = self._prune(json.loads(row.attempts_json), now)
        attempts.append(now)
        row.attempts_json = json.dumps(attempts)
        if len(attempts) >= self.config.attempts:
            row.locked_until = now + self.config.lockout_seconds
            row.attempts_json = "[]"
        db.add(row)
        db.commit()

    def register_success(self, db: Session, key: str) -> None:
        row = db.get(LoginRateLimit, key)
        if row:
            db.delete(row)
            db.commit()


login_rate_limiter = LoginRateLimiter(
    RateLimitConfig(
        attempts=settings.auth_login_rate_limit_attempts,
        window_seconds=settings.auth_login_rate_limit_window_seconds,
        lockout_seconds=settings.auth_login_rate_limit_lockout_seconds,
    )
)
