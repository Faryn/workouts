import { useMemo } from 'react'
import type { ReactNode } from 'react'

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

function statusBadgeClass(status: 'pending' | 'done' | 'skipped') {
  if (status === 'done') return 'status-badge status-done'
  if (status === 'skipped') return 'status-badge status-skipped'
  return 'status-badge status-planned'
}

export function InProgressSession(props: {
  session: SessionOut
  exerciseNameById: Record<string, string>
  setDrafts: Record<string, SetDraft>
  activeSetKey: string | null
  sessionNotes: string
  autosaveStateLabel: string
  autosaveStateClassName: string
  autosaveMeta?: string
  onChangeDraft: (key: string, draft: SetDraft) => void
  onChangeNotes: (notes: string) => void
  onDone: (loggedExerciseId: string, setNumber: number) => void
  onSkip: (loggedExerciseId: string, setNumber: number) => void
  onSelectSet: (key: string) => void
  onMovePrev: () => void
  onMoveNext: () => void
  onFinish: () => void
  onLeave: () => void
  restTimer: ReactNode
}) {
  const flatSets = useMemo(() => {
    const rows: Array<{ exerciseId: string; loggedExerciseId: string; setNumber: number; status: 'pending' | 'done' | 'skipped' }> = []
    for (const ex of props.session.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        rows.push({ exerciseId: ex.exercise_id, loggedExerciseId: ex.id, setNumber: st.set_number, status: st.status })
      }
    }
    return rows
  }, [props.session.logged_exercises])

  const active = (() => {
    if (!props.activeSetKey) return null
    for (const ex of props.session.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        const k = setKey(ex.id, st.set_number)
        if (k === props.activeSetKey) {
          const index = flatSets.findIndex(x => x.loggedExerciseId === ex.id && x.setNumber === st.set_number)
          return {
            loggedExerciseId: ex.id,
            setNumber: st.set_number,
            exerciseName: props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id,
            usesWeight: st.planned_weight != null || st.actual_weight != null,
            index,
            exerciseSetCount: (ex.sets ?? []).length,
          }
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

  const doneCount = flatSets.filter(s => s.status === 'done').length
  const completedCount = flatSets.filter(s => s.status === 'done' || s.status === 'skipped').length
  const progressPct = flatSets.length ? Math.round((completedCount / flatSets.length) * 100) : 0
  const prevSetPreview = active && active.index > 0 ? flatSets[active.index - 1] : null
  const nextSetPreview = active && active.index >= 0 && active.index < flatSets.length - 1 ? flatSets[active.index + 1] : null

  function adjustDraftNumber(key: string, field: 'actual_weight' | 'actual_reps', delta: number) {
    const current = props.setDrafts[key] ?? { actual_weight: '', actual_reps: '', status: 'done' as const }
    const raw = current[field]
    const base = raw === '' ? 0 : Number(raw)
    const next = Math.max(0, base + delta)
    props.onChangeDraft(key, { ...current, [field]: String(Number.isInteger(next) ? next : Number(next.toFixed(1))) })
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>Workout in progress</h3>
          <div className="small">Keep moving. Your latest changes save automatically.</div>
        </div>
        <div className="train-status-indicator">
          <span className={props.autosaveStateClassName}>{props.autosaveStateLabel}</span>
          {props.autosaveMeta && <div className="small" style={{ textAlign: 'right', marginTop: 6 }}>{props.autosaveMeta}</div>}
        </div>
      </div>

      <div className="session-progress">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div><strong>{completedCount}/{flatSets.length}</strong> sets completed</div>
            <div className="small">{props.session.logged_exercises?.length ?? 0} exercises in this session</div>
          </div>
          <div className="status-badge status-in_progress">{progressPct}% complete</div>
        </div>
        <div className="progress-track"><div className="progress-bar" style={{ width: `${progressPct}%` }} /></div>
        {(prevSetPreview || nextSetPreview) && (
          <div className="small" style={{ marginTop: 8 }}>
            {prevSetPreview && <>Previous: {props.exerciseNameById[prevSetPreview.exerciseId] ?? prevSetPreview.exerciseId} · set {prevSetPreview.setNumber}</>}
            {prevSetPreview && nextSetPreview && ' · '}
            {nextSetPreview && <>Next: {props.exerciseNameById[nextSetPreview.exerciseId] ?? nextSetPreview.exerciseId} · set {nextSetPreview.setNumber}</>}
          </div>
        )}
      </div>

      {(props.session.logged_exercises ?? []).map(ex => {
        const hasActive = (ex.sets ?? []).some(st => setKey(ex.id, st.set_number) === props.activeSetKey)
        return (
          <div key={ex.id} className={`card exercise-card${hasActive ? '' : ' dimmed'}`} style={{ marginBottom: 10 }}>
            <h4 style={{ marginBottom: 8 }}>{props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id}</h4>
            {(ex.sets ?? []).map(st => {
              const k = setKey(ex.id, st.set_number)
              const isActive = props.activeSetKey === k
              const draft = props.setDrafts[k] ?? {
                actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.status === 'pending' ? '' : (st.planned_weight != null ? String(st.planned_weight) : '')),
                actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.status === 'pending' ? '' : (st.planned_reps != null ? String(st.planned_reps) : '')),
                status: st.status === 'skipped' ? 'skipped' : 'done',
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
                  className={`set-row${isActive ? ' active' : ''}${st.status === 'done' ? ' completed' : ''}${st.status === 'skipped' ? ' skipped' : ''}`}
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

      <div className="sticky-set-actions" style={{ alignItems: 'stretch' }}>
        {active && activeDraft && (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>{active.exerciseName}</strong>
              <span className="small">Set {active.setNumber} of {active.exerciseSetCount}</span>
            </div>

            <div className="grid-2" style={{ marginBottom: 8 }}>
              {active.usesWeight && (
                <div>
                  <div className="small" style={{ marginBottom: 4 }}>Weight (kg)</div>
                  <input
                    value={activeDraft.actual_weight}
                    onChange={e => props.onChangeDraft(setKey(active.loggedExerciseId, active.setNumber), { ...activeDraft, actual_weight: e.target.value })}
                    aria-label="Weight"
                    placeholder="kg"
                    style={{ width: '100%' }}
                  />
                  <div className="quick-stepper">
                    <button type="button" onClick={() => adjustDraftNumber(setKey(active.loggedExerciseId, active.setNumber), 'actual_weight', -2.5)}>-2.5</button>
                    <button type="button" onClick={() => adjustDraftNumber(setKey(active.loggedExerciseId, active.setNumber), 'actual_weight', 2.5)}>+2.5</button>
                    <button type="button" onClick={() => adjustDraftNumber(setKey(active.loggedExerciseId, active.setNumber), 'actual_weight', 5)}>+5</button>
                  </div>
                </div>
              )}
              <div>
                <div className="small" style={{ marginBottom: 4 }}>Reps</div>
                <input
                  value={activeDraft.actual_reps}
                  onChange={e => props.onChangeDraft(setKey(active.loggedExerciseId, active.setNumber), { ...activeDraft, actual_reps: e.target.value })}
                  aria-label="Repetitions"
                  placeholder="reps"
                  style={{ width: '100%' }}
                />
                <div className="quick-stepper">
                  <button type="button" onClick={() => adjustDraftNumber(setKey(active.loggedExerciseId, active.setNumber), 'actual_reps', -1)}>-1</button>
                  <button type="button" onClick={() => adjustDraftNumber(setKey(active.loggedExerciseId, active.setNumber), 'actual_reps', 1)}>+1</button>
                  <button type="button" onClick={() => adjustDraftNumber(setKey(active.loggedExerciseId, active.setNumber), 'actual_reps', 2)}>+2</button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div className="small" style={{ marginBottom: 4 }}>Session notes</div>
              <textarea
                value={props.sessionNotes}
                onChange={e => props.onChangeNotes(e.target.value)}
                rows={3}
                placeholder="How did this session feel?"
                style={{ width: '100%' }}
              />
            </div>

            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <button style={{ flex: 1 }} onClick={props.onMovePrev} disabled={!prevSetPreview}>Previous set</button>
              <button style={{ flex: 1 }} onClick={props.onMoveNext} disabled={!nextSetPreview}>Next set</button>
            </div>

            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <button className="primary" style={{ flex: 1, minHeight: 52 }} onClick={() => props.onDone(active.loggedExerciseId, active.setNumber)}>Done</button>
              <button style={{ flex: 1, minHeight: 52 }} onClick={() => props.onSkip(active.loggedExerciseId, active.setNumber)}>Skip</button>
            </div>
          </>
        )}

        <div>{props.restTimer}</div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="ghost" onClick={props.onLeave}>Back to dashboard</button>
        <button onClick={props.onFinish}>Finish session</button>
      </div>
    </div>
  )
}
