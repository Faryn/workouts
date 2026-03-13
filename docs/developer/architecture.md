# API Architecture (Current)

## Layering
- `app/api/v1/*` — HTTP layer (request parsing, dependencies, response models)
- `app/services/*` — business orchestration plus domain-local policy/serialization modules
- `app/repositories/*` — DB access primitives reused by services (templates, schedule, sessions, cardio)
- `app/models/*` — persistence models (SQLAlchemy)
- `app/schemas/*` — API contracts (Pydantic)
- `app/core/permissions.py` — small shared access primitives for cross-slice checks
- `app/core/errors.py` — structured API error model/handler
- `app/models/audit.py` — audit trail entity for change tracking (template lifecycle currently wired)

## Current domain-slice pattern
Recent refactors moved multiple slices toward the same shape:
- `template_service.py` + `template_policy.py` + `template_serializers.py`
- `exercise_service.py` + `exercise_policy.py` + `exercise_serializers.py`
- `auth_service.py` + `assignment_policy.py`
- `schedule_service.py` + `schedule_policy.py` + `schedule_serializers.py`
- `session_queries.py` + `session_policy.py` + `session_summary_serializers.py` (while leaving `session_commands.py` as the reliability-heavy command path)

The intended direction is **domain-local policy modules**, not a single global permissions hub. Routers should stay thin, service modules should orchestrate, policy modules should own slice-specific authorization/business rules, and serializers should shape API payloads.

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
- **Train** — live workout execution and session history for athletes, with the UI prioritizing resume / today’s workout first

Mobile/navigation notes:
- Primary mobile navigation is exposed through a sticky top bar that keeps the current section visible.
- The menu toggle is left-aligned and opens the left-side slide-out nav drawer.

This is a vocabulary/UI-layer decision; the underlying API still exposes `templates`, `scheduled-workouts`, and `sessions` resources.

## Session reliability architecture
The session flow now uses an optimistic concurrency pattern:
- `workout_sessions.version` and `updated_at` are returned in session payloads.
- Mutating endpoints (`sets`, `autosave`, `finish`) require the caller's `session_version`.
- The service layer rejects stale writes with a structured `session_conflict` error.
- The web app keeps a local active-session backup, resumes the latest in-progress session, and autosaves on interval plus lifecycle events (`visibilitychange`, `pagehide`).
- Offline queued set writes refresh the latest session before replay so retries use the current session version.
