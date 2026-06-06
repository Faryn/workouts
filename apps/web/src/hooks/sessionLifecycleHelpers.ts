import type { SessionDetail } from '../lib/api'

export type SetDraft = {
  actual_weight: string
  actual_reps: string
  status: 'done' | 'skipped'
}

export type SessionCompletionSummary = {
  status: string
  scheduledWorkoutStatus?: string | null
  durationSeconds: number | null
  doneSets: number
  skippedSets: number
  notes: string
}

export function setKey(loggedExerciseId: string, setNumber: number) {
  return `${loggedExerciseId}:${setNumber}`
}

export function summarizeSession(session: SessionDetail | null, scheduledWorkoutStatus?: string | null): SessionCompletionSummary {
  let doneSets = 0
  let skippedSets = 0
  if (session) {
    for (const ex of session.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        if (st.status === 'done') doneSets += 1
        if (st.status === 'skipped') skippedSets += 1
      }
    }
  }

  let durationSeconds: number | null = session?.duration_seconds ?? null
  if (durationSeconds == null && session?.started_at) {
    const started = new Date(session.started_at).getTime()
    const ended = Date.now()
    if (!Number.isNaN(started)) durationSeconds = Math.max(0, Math.round((ended - started) / 1000))
  }

  return {
    status: 'completed',
    scheduledWorkoutStatus,
    durationSeconds,
    doneSets,
    skippedSets,
    notes: session?.notes ?? '',
  }
}

export function hasRemainingSets(session: SessionDetail | null) {
  if (!session) return false
  for (const ex of session.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      if (st.status !== 'done' && st.status !== 'skipped') return true
    }
  }
  return false
}

export function orderedSetKeys(session: SessionDetail | null) {
  if (!session) return [] as string[]
  const keys: string[] = []
  for (const ex of session.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      keys.push(setKey(ex.id, st.set_number))
    }
  }
  return keys
}

export function nextSetKey(session: SessionDetail | null, currentLoggedExerciseId: string, currentSetNumber: number): string | null {
  const flat = orderedSetKeys(session)
  const current = setKey(currentLoggedExerciseId, currentSetNumber)
  const idx = flat.findIndex(x => x === current)
  if (idx < 0 || idx >= flat.length - 1) return null
  return flat[idx + 1] ?? null
}

export function initializeDraftStateFromSession(session: SessionDetail | null) {
  const draftValues: Record<string, SetDraft> = {}
  let firstKey: string | null = null
  let firstUnfinishedKey: string | null = null

  if (!session) {
    return {
      draftValues,
      activeSetKey: null,
      notes: '',
    }
  }

  for (const ex of session.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      const key = setKey(ex.id, st.set_number)
      if (!firstKey) firstKey = key
      if (!firstUnfinishedKey && st.status !== 'done' && st.status !== 'skipped') firstUnfinishedKey = key
      draftValues[key] = {
        actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.planned_weight != null ? String(st.planned_weight) : ''),
        actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.planned_reps != null ? String(st.planned_reps) : ''),
        status: st.status === 'skipped' ? 'skipped' : 'done',
      }
    }
  }

  return {
    draftValues,
    activeSetKey: firstUnfinishedKey ?? firstKey,
    notes: session.notes ?? '',
  }
}
