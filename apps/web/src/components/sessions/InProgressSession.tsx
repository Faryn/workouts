import { useMemo } from 'react'
import type { ReactNode } from 'react'

import {
  CurrentSetEditor,
  SessionProgressSummary,
  WorkoutMap,
  type SessionOut,
  type SetDraft,
  setKey,
} from './inProgressSessionParts'
import {
  findActiveSet,
  flattenSessionSets,
  getAdjacentSetPreviews,
  getSetPreviewLabel,
  summarizeProgress,
} from './inProgressSessionSelectors'

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
  const flatSets = useMemo(() => flattenSessionSets(props.session), [props.session])

  const active = useMemo(() => findActiveSet({
    session: props.session,
    activeSetKey: props.activeSetKey,
    exerciseNameById: props.exerciseNameById,
    flatSets,
  }), [props.session, props.activeSetKey, props.exerciseNameById, flatSets])

  const activeDraft = useMemo(() => {
    if (!active) return null
    const k = setKey(active.loggedExerciseId, active.setNumber)
    return props.setDrafts[k] ?? { actual_weight: '', actual_reps: '', status: 'done' as const }
  }, [active, props.setDrafts])

  const { completedCount, progressPct } = useMemo(() => summarizeProgress(flatSets), [flatSets])
  const { prevSetPreview, nextSetPreview } = useMemo(
    () => getAdjacentSetPreviews(flatSets, active?.index ?? null),
    [flatSets, active?.index],
  )

  const prevLabel = useMemo(
    () => getSetPreviewLabel(prevSetPreview, props.exerciseNameById),
    [prevSetPreview, props.exerciseNameById],
  )
  const nextLabel = useMemo(
    () => getSetPreviewLabel(nextSetPreview, props.exerciseNameById),
    [nextSetPreview, props.exerciseNameById],
  )

  return (
    <div className="stack">
      <div className="card current-set-card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="section-kicker">Current set</div>
            <h3 style={{ marginBottom: 6 }}>{active?.exerciseName ?? 'Workout in progress'}</h3>
            <div className="small">
              {active ? `Set ${active.setNumber} of ${active.exerciseSetCount}` : 'Keep moving. Your latest changes save automatically.'}
            </div>
          </div>
          <div className="train-status-indicator">
            <span className={props.autosaveStateClassName}>{props.autosaveStateLabel}</span>
            {props.autosaveMeta && <div className="small" style={{ textAlign: 'right', marginTop: 6 }}>{props.autosaveMeta}</div>}
          </div>
        </div>

        <SessionProgressSummary
          completedCount={completedCount}
          totalCount={flatSets.length}
          exerciseCount={props.session.logged_exercises?.length ?? 0}
          progressPct={progressPct}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
        />

        {active && activeDraft && (
          <CurrentSetEditor
            active={active}
            activeDraft={activeDraft}
            prevDisabled={!prevSetPreview}
            nextDisabled={!nextSetPreview}
            onChangeDraft={props.onChangeDraft}
            onDone={props.onDone}
            onSkip={props.onSkip}
            onMovePrev={props.onMovePrev}
            onMoveNext={props.onMoveNext}
          />
        )}

        <div style={{ marginBottom: 10 }}>{props.restTimer}</div>

        <details className="advanced-panel">
          <summary>Session notes</summary>
          <div style={{ marginTop: 10 }}>
            <textarea
              value={props.sessionNotes}
              onChange={e => props.onChangeNotes(e.target.value)}
              rows={3}
              placeholder="How did this session feel?"
              style={{ width: '100%' }}
            />
          </div>
        </details>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <button className="ghost" onClick={props.onLeave}>Back to dashboard</button>
          <button onClick={props.onFinish}>Finish session</button>
        </div>
      </div>

      <WorkoutMap
        session={props.session}
        exerciseNameById={props.exerciseNameById}
        setDrafts={props.setDrafts}
        activeSetKey={props.activeSetKey}
        onSelectSet={props.onSelectSet}
      />
    </div>
  )
}
