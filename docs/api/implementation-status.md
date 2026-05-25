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
- `GET /v1/exercises/` (auth required, returns the shared global exercise pool)
- `POST /v1/exercises/` (creates into the shared global exercise pool)
- `PATCH /v1/exercises/{exercise_id}` (currently admin-only in practice because exercises are global)
- `DELETE /v1/exercises/{exercise_id}` (currently admin-only in practice because exercises are global)

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
- `POST /v1/sessions/{session_id}/autosave` (event-driven/session-safety autosave for notes + lifecycle saves; requires `session_version` and avoids no-op version churn)
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
- On mobile, navigation uses a sticky top bar with the current section label and a left-side slide-out menu.
- Scheduling UI is now dashboard-first rather than a separate primary-nav tab.
- The Train page now prioritizes resume / today’s planned workout before secondary start flows.
- The active workout view is centered on the **current set**, with previous/next navigation, a quieter workout map, save-and-exit, and auto-finish on the final remaining set.
- Active workout autosave is presented as passive status in the in-progress workout header rather than as a separate action row.
- Rest timer timing is deadline-based so countdowns recover from tab switches/background throttling; cues include a stronger final cue plus a **3-2-1 countdown**.
- Strength weight entry uses Paul’s adjustable-dumbbell steps only: 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 16, 18, 20, 23, 24 kg. Manual weights round down to the nearest supported step.
- Program exercise editing uses persistent labels and inline units (`kg`, `s`) to distinguish sets/reps/weight/rest even after numeric values are filled.
- Login inputs are blank by default and use browser autocomplete hints for password-manager compatibility.
- Calendar month view uses a compact day-cell layout with subtle event dots, with strong emphasis reserved for selected day and today.
- Recent reliability/cache fixes ensure that stale local/session/service-worker state is reconciled against server truth more aggressively on load.
- Error responses support structured shape for app-level authorization/domain errors:
  - `{ "error": { "code": string, "message": string, "details": object } }`
- Current backend refactor direction is slice-by-slice alignment around thin routers plus domain-local service/policy/serializer modules. Templates, exercises, auth/assignment, scheduling, and session queries now follow that pattern more closely than before.
- The session slice is intentionally split: `session_queries.py` now uses domain-local policy/summary serializers, while `session_commands.py` remains the reliability-focused mutation path for optimistic concurrency and stale-write protection.
