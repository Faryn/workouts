# AGENTS.md — Workout App Contributor Guide

## Purpose
This repository is an API-first workout app (strength training focus) for athlete + trainer workflows.

## Working rules
- Keep API and frontend in sync in the same change set when behavior/contracts change.
- Prefer small, vertical PRs (endpoint + tests + UI + docs) over wide refactors.
- Keep docs honest: clearly mark implemented vs planned.
- For meaningful app changes, prefer the guarded live deploy flow so the running instance matches the repo.

## Current product direction
- Primary web vocabulary is **Dashboard / Programs / Train**.
- Scheduling is **dashboard-first** rather than a separate top-level nav destination.
- The **Train** surface should prioritize:
  1. resume in-progress workout
  2. start today’s planned workout
  3. secondary/manual start flows
- On mobile, always preserve section context with a visible current-section label and lightweight nav access.
- In month calendar views, optimize for fast scanning: compact day cells, clear date numbers, subtle event indicators.

## Definition of done (repo-specific)
A change is done only if all of the following are true:
1. Code implemented.
2. Tests updated/added and passing.
3. Docs updated (`README`, `docs/api/implementation-status.md`, relevant developer docs).
4. Frontend reflects backend changes (no contract drift).
5. If behavior changed materially, the live app is redeployed unless explicitly skipped.

## Quality gates
- API: `just test-api && just lint-api && just typecheck-api`
- Web: `cd apps/web && npm run build`
- For broader release confidence: `just release-check`

## Architecture notes
- Keep route modules thin: validation/auth orchestration only.
- Put aggregation/CSV/business logic into services.
- Keep page components under ~200 LOC; split into hooks/components when exceeding.
- Keep runtime artifacts (backups, logs, generated exports) out of the repo tree where practical.

## Current guardrails
- Preserve planned vs actual set values.
- Enforce trainer-athlete assignment boundaries on read/write endpoints.
- Avoid exposing IDs in UI where names are available.
- Treat autosave/recovery as passive reliability features, not primary user actions.
- Use the guarded deploy flow and runtime backup path defaults unless there is a specific reason to override them.
