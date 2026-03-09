from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from threading import Lock
from time import time

from app.core.config import settings
from app.core.errors import AppError


@dataclass(frozen=True)
class RateLimitConfig:
    attempts: int = 5
    window_seconds: int = 300
    lockout_seconds: int = 900


class LoginRateLimiter:
    def __init__(self, config: RateLimitConfig | None = None):
        self.config = config or RateLimitConfig()
        self._lock = Lock()
        self._attempts: dict[str, deque[float]] = {}
        self._lockouts: dict[str, float] = {}

    def _prune(self, key: str, now: float) -> deque[float]:
        window_start = now - self.config.window_seconds
        attempts = self._attempts.get(key, deque())
        while attempts and attempts[0] < window_start:
            attempts.popleft()
        if attempts:
            self._attempts[key] = attempts
        else:
            self._attempts.pop(key, None)
        return attempts

    def check(self, key: str) -> None:
        now = time()
        with self._lock:
            until = self._lockouts.get(key)
            if until and until > now:
                retry_after = max(1, int(until - now))
                raise AppError(
                    code='rate_limited',
                    message='Too many login attempts. Try again later.',
                    status_code=429,
                    details={'retry_after_seconds': retry_after},
                )
            if until and until <= now:
                self._lockouts.pop(key, None)
            self._prune(key, now)

    def register_failure(self, key: str) -> None:
        now = time()
        with self._lock:
            attempts = self._prune(key, now)
            attempts.append(now)
            self._attempts[key] = attempts
            if len(attempts) >= self.config.attempts:
                self._lockouts[key] = now + self.config.lockout_seconds
                self._attempts.pop(key, None)

    def register_success(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)
            self._lockouts.pop(key, None)


login_rate_limiter = LoginRateLimiter(
    RateLimitConfig(
        attempts=settings.auth_login_rate_limit_attempts,
        window_seconds=settings.auth_login_rate_limit_window_seconds,
        lockout_seconds=settings.auth_login_rate_limit_lockout_seconds,
    )
)
