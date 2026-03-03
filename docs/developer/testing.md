# Testing Strategy (v1)

This project follows TDD-oriented practice for implemented functionality:
1. Write/adjust tests first for expected behavior.
2. Implement minimal code to pass tests.
3. Refactor while keeping tests green.

## Current automated tests
- API health endpoint
- Auth login success/failure
- Auth `/me` requires valid bearer token
- Exercise list requires auth
- Exercise list visibility filter (global + user-owned only)
- Template CRUD owner-scoped behavior
- Scheduled workout create/move/copy behavior
- Scheduled workout write denied for other athlete IDs (athlete role)
- Session start from schedule/template creates planned set snapshots
- Session set logging stores actuals without overwriting planned values
- Session finish marks linked scheduled workout completed
- Trainer can access assigned athlete schedule
- Trainer is forbidden from unassigned athlete schedule access (structured error shape)

## Test levels
- **Unit tests:** pure business rules (to expand as services are added)
- **Integration tests:** API + DB interaction (current focus)
- **E2E tests:** planned for trainer/athlete core workflows

## Run tests
From `apps/api`:

```bash
. .venv/bin/activate
pytest
```

## Rule for future changes
Any feature or bugfix must include/update tests before considered done.
