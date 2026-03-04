# AGENTS.md — Workout App Contributor Guide

## Purpose
This repository is an API-first workout app (strength training focus) for athlete + trainer workflows.

## Working rules
- Keep API and frontend in sync in the same change set when behavior/contracts change.
- Prefer small, vertical PRs (endpoint + tests + UI + docs) over wide refactors.
- Keep docs honest: clearly mark implemented vs planned.

## Definition of done (repo-specific)
A change is done only if all of the following are true:
1. Code implemented.
2. Tests updated/added and passing.
3. Docs updated (`README`, `docs/api/implementation-status.md`, relevant developer docs).
4. Frontend reflects backend changes (no contract drift).

## Quality gates
- API: `just test-api && just lint-api && just typecheck-api`
- Web: `cd apps/web && npm run build`

## Architecture notes
- Keep route modules thin: validation/auth orchestration only.
- Put aggregation/CSV/business logic into services.
- Keep page components under ~200 LOC; split into hooks/components when exceeding.

## Current guardrails
- Preserve planned vs actual set values.
- Enforce trainer-athlete assignment boundaries on read/write endpoints.
- Avoid exposing IDs in UI where names are available.
