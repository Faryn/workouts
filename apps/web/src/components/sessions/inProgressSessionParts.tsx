import { useState } from 'react'

import { DUMBBELL_WEIGHTS_KG, nextDumbbellWeight, normalizeDumbbellWeightInput } from '../../lib/weights'

type LoggedSet = {
  set_number: number
  planned_weight?: number | null
  planned_reps?: number | null
  actual_weight?: number | null
  actual_reps?: number | null
  status: 'pending' | 'done' | 'skipped'
}

type LoggedExercise = {
  id: string
  exercise_id: string
  sets: LoggedSet[]
}

export type SessionOut = {
  id: string
  logged_exercises: LoggedExercise[]
}

export type SetDraft = {
  actual_weight: string
  actual_reps: string
  status: 'done' | 'skipped'
}

export function setKey(loggedExerciseId: string, setNumber: number) {
  return `${loggedExerciseId}:${setNumber}`
}

export function statusBadgeClass(status: 'pending' | 'done' | 'skipped') {
  if (status === 'done') return 'status-badge status-done'
  if (status === 'skipped') return 'status-badge status-skipped'
  return 'status-badge status-planned'
}

export function SessionProgressSummary(props: {
  completedCount: number
  totalCount: number
  exerciseCount: number
  progressPct: number
  prevLabel?: string | null
  nextLabel?: string | null
}) {
  const { completedCount, totalCount, exerciseCount, progressPct, prevLabel, nextLabel } = props

  return (
    <div className="session-progress compact-progress">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div><strong>{completedCount}/{totalCount}</strong> sets completed</div>
          <div className="small">{exerciseCount} exercises in this session</div>
        </div>
        <div className="status-badge status-in_progress">{progressPct}% complete</div>
      </div>
      <div className="progress-track"><div className="progress-bar" style={{ width: `${progressPct}%` }} /></div>
      {(prevLabel || nextLabel) && (
        <div className="small" style={{ marginTop: 8 }}>
          {prevLabel && <>Previous: {prevLabel}</>}
          {prevLabel && nextLabel && ' · '}
          {nextLabel && <>Next: {nextLabel}</>}
        </div>
      )}
    </div>
  )
}

export function CurrentSetEditor(props: {
  active: {
    loggedExerciseId: string
    setNumber: number
    usesWeight: boolean
  }
  activeDraft: SetDraft
  prevDisabled: boolean
  nextDisabled: boolean
  onChangeDraft: (key: string, draft: SetDraft) => void
  onDone: (loggedExerciseId: string, setNumber: number) => void
  onSkip: (loggedExerciseId: string, setNumber: number) => void
  onMovePrev: () => void
  onMoveNext: () => void
}) {
  const [editingWeight, setEditingWeight] = useState(false)
  const [editingReps, setEditingReps] = useState(false)
  const key = setKey(props.active.loggedExerciseId, props.active.setNumber)

  return (
    <>
      <div className="grid-2" style={{ marginBottom: 10 }}>
        {props.active.usesWeight && (
          <div>
            <div className="small" style={{ marginBottom: 4 }}>Weight (kg)</div>
            <input
              list="dumbbell-weight-options"
              value={props.activeDraft.actual_weight}
              onChange={e => props.onChangeDraft(key, { ...props.activeDraft, actual_weight: e.target.value })}
              onFocus={() => setEditingWeight(true)}
              onBlur={e => {
                props.onChangeDraft(key, { ...props.activeDraft, actual_weight: normalizeDumbbellWeightInput(e.target.value) })
                window.setTimeout(() => setEditingWeight(false), 120)
              }}
              aria-label="Weight"
              placeholder="kg"
              style={{ width: '100%' }}
            />
            <datalist id="dumbbell-weight-options">
              {DUMBBELL_WEIGHTS_KG.map(weight => <option key={weight} value={weight} />)}
            </datalist>
            {editingWeight && (
              <div className="quick-stepper">
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => props.onChangeDraft(key, { ...props.activeDraft, actual_weight: nextDumbbellWeight(props.activeDraft.actual_weight, -1) })}>-</button>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => props.onChangeDraft(key, { ...props.activeDraft, actual_weight: nextDumbbellWeight(props.activeDraft.actual_weight, 1) })}>+</button>
              </div>
            )}
          </div>
        )}
        <div>
          <div className="small" style={{ marginBottom: 4 }}>Reps</div>
          <input
            value={props.activeDraft.actual_reps}
            onChange={e => props.onChangeDraft(key, { ...props.activeDraft, actual_reps: e.target.value })}
            onFocus={() => setEditingReps(true)}
            onBlur={() => window.setTimeout(() => setEditingReps(false), 120)}
            aria-label="Repetitions"
            placeholder="reps"
            style={{ width: '100%' }}
          />
          {editingReps && (
            <div className="quick-stepper">
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => props.onChangeDraft(key, { ...props.activeDraft, actual_reps: String(Math.max(0, Number(props.activeDraft.actual_reps || 0) - 1)) })}>-1</button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => props.onChangeDraft(key, { ...props.activeDraft, actual_reps: String(Math.max(0, Number(props.activeDraft.actual_reps || 0) + 1)) })}>+1</button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => props.onChangeDraft(key, { ...props.activeDraft, actual_reps: String(Math.max(0, Number(props.activeDraft.actual_reps || 0) + 2)) })}>+2</button>
            </div>
          )}
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
        <button style={{ flex: 1 }} onClick={props.onMovePrev} disabled={props.prevDisabled}>Previous</button>
        <button style={{ flex: 1 }} onClick={props.onMoveNext} disabled={props.nextDisabled}>Next</button>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
        <button className="primary" style={{ flex: 1, minHeight: 52 }} onClick={() => props.onDone(props.active.loggedExerciseId, props.active.setNumber)}>Done</button>
        <button style={{ flex: 1, minHeight: 52 }} onClick={() => props.onSkip(props.active.loggedExerciseId, props.active.setNumber)}>Skip</button>
      </div>
    </>
  )
}

export function WorkoutMap(props: {
  session: SessionOut
  exerciseNameById: Record<string, string>
  setDrafts: Record<string, SetDraft>
  activeSetKey: string | null
  onSelectSet: (key: string) => void
}) {
  return (
    <div className="card">
      <div className="section-kicker">Workout map</div>
      <h4 style={{ marginBottom: 10 }}>Jump anywhere</h4>
      {(props.session.logged_exercises ?? []).map(ex => {
        const hasActive = (ex.sets ?? []).some(st => setKey(ex.id, st.set_number) === props.activeSetKey)
        return (
          <div key={ex.id} className={`card exercise-card compact-exercise-card${hasActive ? '' : ' dimmed'}`} style={{ marginBottom: 10 }}>
            <h4 style={{ marginBottom: 8 }}>{props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id}</h4>
            {(ex.sets ?? []).map(st => {
              const k = setKey(ex.id, st.set_number)
              const isActive = props.activeSetKey === k
              const draft = props.setDrafts[k] ?? {
                actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.status === 'pending' ? '' : (st.planned_weight != null ? String(st.planned_weight) : '')),
                actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.status === 'pending' ? '' : (st.planned_reps != null ? String(st.planned_reps) : '')),
                status: st.status === 'skipped' ? 'skipped' : 'done' as const,
              }
              const usesWeight = st.planned_weight != null || draft.actual_weight !== ''
              const hasLogged = draft.actual_reps !== '' || draft.actual_weight !== ''
              const plannedText = usesWeight
                ? `${st.planned_weight ?? '-'} kg × ${st.planned_reps ?? '-'} reps`
                : `${st.planned_reps ?? '-'} reps`
              const loggedText = hasLogged
                ? (usesWeight
                    ? `${draft.actual_weight || '-'} kg × ${draft.actual_reps || '-'} reps`
                    : `${draft.actual_reps || '-'} reps`)
                : '—'

              return (
                <button
                  key={k}
                  type="button"
                  className={`set-row compact-set-row${isActive ? ' active' : ''}${st.status === 'done' ? ' completed' : ''}${st.status === 'skipped' ? ' skipped' : ''}`}
                  onClick={() => props.onSelectSet(k)}
                >
                  <span><strong>Set {st.set_number}</strong></span>
                  <span className="small"><strong>Planned:</strong> {plannedText}<br /><strong>Logged:</strong> {loggedText}</span>
                  <span className={statusBadgeClass(st.status)}>{st.status}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
