# API Architecture (Current)

## Layering
- `app/api/v1/*` — HTTP layer (request parsing, dependencies, response models)
- `app/services/*` — business orchestration (templates, scheduling, sessions)
- `app/repositories/*` — DB access primitives reused by services
- `app/models/*` — persistence models (SQLAlchemy)
- `app/schemas/*` — API contracts (Pydantic)
- `app/core/permissions.py` — centralized access checks
- `app/core/errors.py` — structured API error model/handler

## Permission model currently enforced
- athlete: own records
- trainer: only assigned athlete records
- admin: unrestricted

## Notes
This structure keeps routers thin and makes service-layer unit testing easier.
