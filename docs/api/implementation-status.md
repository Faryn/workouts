# API Implementation Status

## Implemented now
- `GET /v1/health`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `GET /v1/exercises/` (auth required, basic visibility filtering)
- `GET /v1/templates/`
- `POST /v1/templates/`
- `PATCH /v1/templates/{template_id}`
- `DELETE /v1/templates/{template_id}`
- `GET /v1/scheduled-workouts/?athlete_id=...`
- `POST /v1/scheduled-workouts/`
- `POST /v1/scheduled-workouts/{scheduled_id}/move`
- `POST /v1/scheduled-workouts/{scheduled_id}/copy`

## Implemented now (sessions slice)
- `POST /v1/sessions/start` (from scheduled workout or template)
- `POST /v1/sessions/{session_id}/sets` (set actual logging while keeping planned values)
- `POST /v1/sessions/{session_id}/finish` (marks session complete and scheduled workout complete if linked)

## Scaffolded placeholders (not fully implemented)
- cardio sessions
- stats
- exports

## Notes
- Documentation distinguishes implemented vs planned to avoid capability drift.
- Error responses now support structured shape for app-level authorization/domain errors:
  - `{ "error": { "code": string, "message": string, "details": object } }`
