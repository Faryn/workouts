# API Architecture (Current)

## Layering
- `app/api/v1/*` — HTTP layer (request parsing, dependencies, response models)
- `app/services/*` — business orchestration (templates, scheduling, sessions, cardio, stats, admin-users)
- `app/repositories/*` — DB access primitives reused by services (templates, schedule, sessions, cardio)
- `app/models/*` — persistence models (SQLAlchemy)
- `app/schemas/*` — API contracts (Pydantic)
- `app/core/permissions.py` — centralized access checks
- `app/core/errors.py` — structured API error model/handler
- `app/models/audit.py` — audit trail entity for change tracking (template lifecycle currently wired)

## Permission model currently enforced
- athlete: own records (plus assigned-trainer template visibility)
- trainer: assigned athlete records, including assigned-athlete template management
- admin: unrestricted API access; web UI is users-admin surface

## Notes
This structure keeps routers thin and makes service-layer unit testing easier.
