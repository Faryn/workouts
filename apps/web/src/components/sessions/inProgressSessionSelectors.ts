import { setKey, type SessionOut } from './inProgressSessionParts'

export type FlatSetRow = {
  exerciseId: string
  loggedExerciseId: string
  setNumber: number
  status: 'pending' | 'done' | 'skipped'
}

export function flattenSessionSets(session: SessionOut): FlatSetRow[] {
  const rows: FlatSetRow[] = []
  for (const ex of session.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      rows.push({
        exerciseId: ex.exercise_id,
        loggedExerciseId: ex.id,
        setNumber: st.set_number,
        status: st.status,
      })
    }
  }
  return rows
}

export function findActiveSet(params: {
  session: SessionOut
  activeSetKey: string | null
  exerciseNameById: Record<string, string>
  flatSets: FlatSetRow[]
}) {
  const { session, activeSetKey, exerciseNameById, flatSets } = params
  if (!activeSetKey) return null

  for (const ex of session.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      const key = setKey(ex.id, st.set_number)
      if (key === activeSetKey) {
        const index = flatSets.findIndex(x => x.loggedExerciseId === ex.id && x.setNumber === st.set_number)
        return {
          loggedExerciseId: ex.id,
          setNumber: st.set_number,
          exerciseName: exerciseNameById[ex.exercise_id] ?? ex.exercise_id,
          usesWeight: st.planned_weight != null || st.actual_weight != null,
          index,
          exerciseSetCount: (ex.sets ?? []).length,
        }
      }
    }
  }

  return null
}

export function summarizeProgress(flatSets: FlatSetRow[]) {
  const completedCount = flatSets.filter(s => s.status === 'done' || s.status === 'skipped').length
  const progressPct = flatSets.length ? Math.round((completedCount / flatSets.length) * 100) : 0
  return { completedCount, progressPct }
}

export function getAdjacentSetPreviews(flatSets: FlatSetRow[], activeIndex: number | null) {
  if (activeIndex == null || activeIndex < 0) {
    return {
      prevSetPreview: null,
      nextSetPreview: null,
    }
  }

  return {
    prevSetPreview: activeIndex > 0 ? flatSets[activeIndex - 1] : null,
    nextSetPreview: activeIndex < flatSets.length - 1 ? flatSets[activeIndex + 1] : null,
  }
}

export function getSetPreviewLabel(preview: FlatSetRow | null, exerciseNameById: Record<string, string>) {
  if (!preview) return null
  return `${exerciseNameById[preview.exerciseId] ?? preview.exerciseId} · set ${preview.setNumber}`
}
