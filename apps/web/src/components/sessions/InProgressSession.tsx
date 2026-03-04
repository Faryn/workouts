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

  return (
    <div className="card">
      <h3>In Progress Session</h3>
      <p>ID: {props.session.id}</p>
      <p>Exercises: {props.session.logged_exercises?.length ?? 0}</p>

      {(props.session.logged_exercises ?? []).map(ex => (
        <div key={ex.id} className="card" style={{ marginBottom: 8 }}>
          <h4 style={{ marginBottom: 6 }}>{props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id}</h4>
          {(ex.sets ?? []).map(st => {
            const k = setKey(ex.id, st.set_number)
            const draft = props.setDrafts[k] ?? {
              actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.planned_weight != null ? String(st.planned_weight) : ''),
              actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.planned_reps != null ? String(st.planned_reps) : ''),
              status: st.status === 'skipped' ? 'skipped' : 'done',
            }
            return (
              <div
                key={k}
                className="row"
                style={{
                  marginBottom: 8,
                  alignItems: 'center',
                  padding: 8,
                  borderRadius: 10,
                  border: props.activeSetKey === k ? '2px solid #60a5fa' : '1px solid #374151',
                }}
                onClick={() => props.onSelectSet(k)}
              >
                <span style={{ minWidth: 70 }}>Set {st.set_number}</span>
                <span className="small" style={{ minWidth: 170 }}>
                  Planned: {st.planned_weight ?? '-'} kg × {st.planned_reps ?? '-'} reps
                </span>
                <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                  <input
                    placeholder=""
                    value={draft.actual_weight}
                    onChange={e => props.onChangeDraft(k, { ...draft, actual_weight: e.target.value })}
                    style={{ width: 110, fontSize: '1.05rem', padding: 12 }}
                    aria-label="Weight"
                  />
                  <span className="small">kg</span>
                </div>
                <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                  <input
                    placeholder=""
                    value={draft.actual_reps}
                    onChange={e => props.onChangeDraft(k, { ...draft, actual_reps: e.target.value })}
                    style={{ width: 95, fontSize: '1.05rem', padding: 12 }}
                    aria-label="Repetitions"
                  />
                  <span className="small">reps</span>
                </div>
                <button style={{ padding: '12px 14px' }} onClick={() => props.onDone(ex.id, st.set_number)}>Done</button>
                <button style={{ padding: '12px 14px' }} onClick={() => props.onSkip(ex.id, st.set_number)}>Skip</button>
              </div>
            )
          })}
        </div>
      ))}

      {props.restTimer}

      {active && (
        <div className="sticky-set-actions row" style={{ alignItems: 'center' }}>
          <strong>{active.exerciseName} · Set {active.setNumber}</strong>
          <button style={{ padding: '14px 18px' }} onClick={() => props.onDone(active.loggedExerciseId, active.setNumber)}>Done</button>
          <button style={{ padding: '14px 18px' }} onClick={() => props.onSkip(active.loggedExerciseId, active.setNumber)}>Skip</button>
        </div>
      )}

      <div className="row">
        <button onClick={props.onFinish}>Finish session</button>
      </div>
    </div>
  )
}
