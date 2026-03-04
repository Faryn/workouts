import { useMemo } from 'react'
import type { ReactNode } from 'react'

type LoggedSet = {
  set_number: number
  planned_weight?: number | null
  planned_reps?: number | null
  actual_weight?: number | null
  actual_reps?: number | null
  status: 'done' | 'skipped'
}

type LoggedExercise = {
  id: string
  exercise_id: string
  sets: LoggedSet[]
}

type SessionOut = {
  id: string
  logged_exercises: LoggedExercise[]
}

type SetDraft = {
  actual_weight: string
  actual_reps: string
  status: 'done' | 'skipped'
}

function setKey(loggedExerciseId: string, setNumber: number) {
  return `${loggedExerciseId}:${setNumber}`
}

export function InProgressSession(props: {
  session: SessionOut
  exerciseNameById: Record<string, string>
  setDrafts: Record<string, SetDraft>
  activeSetKey: string | null
  onChangeDraft: (key: string, draft: SetDraft) => void
  onDone: (loggedExerciseId: string, setNumber: number) => void
  onSkip: (loggedExerciseId: string, setNumber: number) => void
  onSelectSet: (key: string) => void
  onFinish: () => void
  restTimer: ReactNode
}) {
  const active = (() => {
    if (!props.activeSetKey) return null
    for (const ex of props.session.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        const k = setKey(ex.id, st.set_number)
        if (k === props.activeSetKey) {
          return { loggedExerciseId: ex.id, setNumber: st.set_number, exerciseName: props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id }
        }
      }
    }
    return null
  })()

  const activeDraft = useMemo(() => {
    if (!active) return null
    const k = setKey(active.loggedExerciseId, active.setNumber)
    return props.setDrafts[k] ?? { actual_weight: '', actual_reps: '', status: 'done' as const }
  }, [active, props.setDrafts])

  return (
    <div className="card">
      <h3>Workout in progress</h3>
      <p className="small">Exercises: {props.session.logged_exercises?.length ?? 0}</p>

      {(props.session.logged_exercises ?? []).map(ex => (
        <div key={ex.id} className="card" style={{ marginBottom: 10 }}>
          <h4 style={{ marginBottom: 8 }}>{props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id}</h4>
          {(ex.sets ?? []).map(st => {
            const k = setKey(ex.id, st.set_number)
            const isActive = props.activeSetKey === k
            const draft = props.setDrafts[k] ?? {
              actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.planned_weight != null ? String(st.planned_weight) : ''),
              actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.planned_reps != null ? String(st.planned_reps) : ''),
              status: st.status === 'skipped' ? 'skipped' : 'done',
            }
            return (
              <button
                key={k}
                type="button"
                className="set-row"
                style={{ border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                onClick={() => props.onSelectSet(k)}
              >
                <span><strong>Set {st.set_number}</strong></span>
                <span className="small">{st.planned_weight ?? '-'} kg × {st.planned_reps ?? '-'} reps</span>
                <span className="small">{draft.actual_weight || '-'} / {draft.actual_reps || '-'}</span>
              </button>
            )
          })}
        </div>
      ))}

      {props.restTimer}

      {active && activeDraft && (
        <div className="sticky-set-actions" style={{ alignItems: 'stretch' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>{active.exerciseName}</strong>
            <span className="small">Set {active.setNumber}</span>
          </div>

          <div className="row" style={{ marginBottom: 8 }}>
            <input
              value={activeDraft.actual_weight}
              onChange={e => props.onChangeDraft(setKey(active.loggedExerciseId, active.setNumber), { ...activeDraft, actual_weight: e.target.value })}
              aria-label="Weight"
              placeholder="kg"
              style={{ flex: 1, minWidth: 120 }}
            />
            <input
              value={activeDraft.actual_reps}
              onChange={e => props.onChangeDraft(setKey(active.loggedExerciseId, active.setNumber), { ...activeDraft, actual_reps: e.target.value })}
              aria-label="Repetitions"
              placeholder="reps"
              style={{ flex: 1, minWidth: 120 }}
            />
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="primary" style={{ flex: 1, minHeight: 52 }} onClick={() => props.onDone(active.loggedExerciseId, active.setNumber)}>Done</button>
            <button style={{ flex: 1, minHeight: 52 }} onClick={() => props.onSkip(active.loggedExerciseId, active.setNumber)}>Skip</button>
          </div>
        </div>
      )}

      <div className="row">
        <button onClick={props.onFinish}>Finish session</button>
      </div>
    </div>
  )
}
