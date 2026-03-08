# API Implementation Status

## Implemented now
- `GET /v1/health`
- `POST /v1/auth/login` (supports optional athlete-scoped tokens for trainer/admin via `athlete_ids`)
- `GET /v1/auth/me`
- `GET /v1/auth/assigned-athletes` (trainer/admin athlete context helper)

## Admin User Management
- `GET /v1/admin/users/` (admin-only)
- `POST /v1/admin/users/` (admin-only)
- `PATCH /v1/admin/users/{user_id}` (admin-only)
- `POST /v1/admin/users/{user_id}/password` (admin-only)
- `GET /v1/exercises/` (auth required, basic visibility filtering)
- `POST /v1/exercises/` (role/ownership-aware create)
- `PATCH /v1/exercises/{exercise_id}`
- `DELETE /v1/exercises/{exercise_id}`

## Programs / Templates
- `GET /v1/templates/` (supports optional `athlete_id` context for trainer/admin)
- `POST /v1/templates/`
- `PATCH /v1/templates/{template_id}`
- `DELETE /v1/templates/{template_id}`
- Supports ordered template exercises with planned sets/reps/weight/rest/notes.
- Template payload includes `exercise_name` fallback and `can_manage` flag for role-aware UI actions.
- Web UI presents these as **Programs**.
- Template create/patch/delete writes `AuditEvent` entries.

## Scheduling + Calendar
- `GET /v1/scheduled-workouts/?athlete_id=...`
- `POST /v1/scheduled-workouts/`
- `POST /v1/scheduled-workouts/pattern` (interval days or weekday recurring schedule between start/end)
- `POST /v1/scheduled-workouts/{scheduled_id}/move`
- `POST /v1/scheduled-workouts/{scheduled_id}/copy`
- `POST /v1/scheduled-workouts/{scheduled_id}/skip`
- `DELETE /v1/scheduled-workouts/{scheduled_id}`
- `GET /v1/scheduled-workouts/calendar?athlete_id=...&from_date=...&to_date=...` (merged strength + cardio feed)

## Sessions
- `GET /v1/sessions/?athlete_id=...` (session history list)
- `GET /v1/sessions/{session_id}` (session detail)
- `GET /v1/sessions/in-progress?athlete_id=...` (latest resumable in-progress session)
- `POST /v1/sessions/start` (from scheduled workout or template; reuses matching in-progress session instead of duplicating)
- `POST /v1/sessions/{session_id}/sets` (set actual logging while keeping planned values; requires `session_version` for stale-write protection)
- `POST /v1/sessions/{session_id}/autosave` (updates `last_saved_at` and optional notes for reliability/resume; requires `session_version`)
- `POST /v1/sessions/{session_id}/finish` (marks session complete and linked scheduled workout complete; requires `session_version`)
- Session payloads include `version` + `updated_at` for optimistic concurrency handling.

## Cardio + Stats
- `GET /v1/cardio-sessions/?athlete_id=...`
- `POST /v1/cardio-sessions/`
- `GET /v1/stats/exercises/{exercise_id}/weights-over-time?athlete_id=...`

## Exports
- `GET /v1/exports/sessions.csv?athlete_id=...`
- `GET /v1/exports/exercise-history.csv?athlete_id=...`
- `GET /v1/exports/cardio.csv?athlete_id=...`

## Notes
- Documentation distinguishes implemented vs planned to avoid capability drift.
- Current web navigation is centered on **Dashboard / Programs / Train**.
- Scheduling UI is now dashboard-first rather than a separate primary-nav tab.
- Error responses support structured shape for app-level authorization/domain errors:
  - `{ "error": { "code": string, "message": string, "details": object } }`
