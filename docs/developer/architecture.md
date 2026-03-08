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

## Current web product model
The web app is organized around:
- **Dashboard** — schedule overview, upcoming workouts, calendar, quick scheduling, advanced scheduling tools
- **Programs** — reusable workout/program definitions backed by template APIs
- **Train** — live workout execution and session history for athletes

This is a vocabulary/UI-layer decision; the underlying API still exposes `templates`, `scheduled-workouts`, and `sessions` resources.

## Session reliability architecture
The session flow now uses an optimistic concurrency pattern:
- `workout_sessions.version` and `updated_at` are returned in session payloads.
- Mutating endpoints (`sets`, `autosave`, `finish`) require the caller's `session_version`.
- The service layer rejects stale writes with a structured `session_conflict` error.
- The web app keeps a local active-session backup, resumes the latest in-progress session, and autosaves on interval plus lifecycle events (`visibilitychange`, `pagehide`).
- Offline queued set writes refresh the latest session before replay so retries use the current session version.
