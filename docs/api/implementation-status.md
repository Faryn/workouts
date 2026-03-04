# API Implementation Status

## Implemented now
- `GET /v1/health`
- `POST /v1/auth/login` (supports optional athlete-scoped tokens for trainer/admin via `athlete_ids`)
- `GET /v1/auth/me`
- `GET /v1/auth/assigned-athletes` (trainer/admin athlete context helper)
- `GET /v1/exercises/` (auth required, basic visibility filtering)
- `POST /v1/exercises/` (role/ownership-aware create)
- `PATCH /v1/exercises/{exercise_id}`
- `DELETE /v1/exercises/{exercise_id}`

## Templates
- `GET /v1/templates/`
- `POST /v1/templates/`
- `PATCH /v1/templates/{template_id}`
- `DELETE /v1/templates/{template_id}`
- Supports ordered template exercises with planned sets/reps/weight/rest/notes.

## Scheduling + Calendar
- `GET /v1/scheduled-workouts/?athlete_id=...`
- `POST /v1/scheduled-workouts/`
- `POST /v1/scheduled-workouts/pattern` (interval days or weekday recurring schedule between start/end)
- `POST /v1/scheduled-workouts/{scheduled_id}/move`
- `POST /v1/scheduled-workouts/{scheduled_id}/copy`
- `POST /v1/scheduled-workouts/{scheduled_id}/skip`
- `GET /v1/scheduled-workouts/calendar?athlete_id=...&from_date=...&to_date=...` (merged strength + cardio feed)

## Sessions
- `GET /v1/sessions/?athlete_id=...` (session history list)
- `GET /v1/sessions/{session_id}` (session detail)
- `GET /v1/sessions/in-progress?athlete_id=...` (latest resumable in-progress session)
- `POST /v1/sessions/start` (from scheduled workout or template)
- `POST /v1/sessions/{session_id}/sets` (set actual logging while keeping planned values)
- `POST /v1/sessions/{session_id}/autosave` (updates `last_saved_at` and optional notes for reliability/resume)
- `POST /v1/sessions/{session_id}/finish` (marks session complete and linked scheduled workout complete)

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
- Error responses support structured shape for app-level authorization/domain errors:
  - `{ "error": { "code": string, "message": string, "details": object } }`
