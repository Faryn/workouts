# Workout App API

FastAPI backend for the workout app.

## Run locally
```bash
cd apps/api
python3 -m venv .venv
. .venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy alembic pydantic pydantic-settings python-jose[cryptography] passlib pytest httpx email-validator ruff mypy
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. uvicorn app.main:app --reload --port 8080
```

## Alembic
```bash
cd apps/api
PYTHONPATH=. alembic revision --autogenerate -m "your change"
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. alembic current
```

## Current notes
- Session mutations use optimistic concurrency via `version` / `updated_at`.
- Autosave is intended to be event-driven first, with slower periodic safety saves.
- Exercises now belong to a single shared global pool; no per-user exercise library.
- For deployment/migration guardrails, see `../../docs/admin/deployment.md`.
- For current API slice status, see `../../docs/api/implementation-status.md`.
