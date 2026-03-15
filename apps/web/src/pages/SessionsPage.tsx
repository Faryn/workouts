import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InProgressSession } from '../components/sessions/InProgressSession'
import { RestTimer } from '../components/sessions/RestTimer'
import { SessionHistoryPanel } from '../components/sessions/SessionHistoryPanel'
import { SessionStarter } from '../components/sessions/SessionStarter'
import { useOfflineSetQueue } from '../hooks/useOfflineSetQueue'
import { useRestTimer } from '../hooks/useRestTimer'
import { useSessionDraft } from '../hooks/useSessionDraft'
import { useSessionLifecycle } from '../hooks/useSessionLifecycle'

const DEFAULT_REST_SECONDS = 90

function autosaveLabel(state: 'idle' | 'saving' | 'ok' | 'error') {
  switch (state) {
    case 'saving': return 'Saving…'
    case 'ok': return 'Saved'
    case 'error': return 'Sync issue'
    default: return 'Autosave on'
  }
}

function autosaveBadgeClass(state: 'idle' | 'saving' | 'ok' | 'error') {
  switch (state) {
    case 'ok': return 'status-badge status-completed'
    case 'saving': return 'status-badge status-in_progress'
    case 'error': return 'status-badge status-skipped'
    default: return 'status-badge status-planned'
  }
}

function autosaveMeta(session: { last_saved_at?: string | null; version?: number } | null) {
  if (!session) return undefined
  const parts: string[] = []
  if (session.last_saved_at) parts.push(`Last saved ${new Date(session.last_saved_at).toLocaleTimeString()}`)
  else parts.push('Not saved yet')
  if (session.version) parts.push(`v${session.version}`)
  return parts.join(' · ')
}

export function SessionsPage({ token, athleteId }: { token: string; athleteId: string }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [templateId, setTemplateId] = useState('')
  const [scheduledId, setScheduledId] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const rest = useRestTimer(DEFAULT_REST_SECONDS)

  const { enqueuePendingLog } = useOfflineSetQueue({
    token,
    athleteId,
    onSynced: () => setNotice('Offline set logs synced.'),
  })

  const lifecycle = useSessionLifecycle({
    token,
    athleteId,
    templateId,
    scheduledId,
    setTemplateId,
    setScheduledId,
    onNotice: setNotice,
    onRestCooldown: rest.startFromDefault,
    enqueuePendingLog,
  })

  const {
    templates,
    exercises,
    scheduledItems,
    session,
    history,
    err,
    setDrafts,
    setDraftValues,
    activeSetKey,
    setActiveSetKey,
    moveActiveSet,
    autosaveState,
    historyDetails,
    sessionNotes,
    setSessionNotes,
    hasActiveSession,
    completionSummary,
    dismissCompletionSummary,
    loadAll,
    startFromTemplate,
    startFromScheduled,
    logSet,
    finish,
    leaveSession,
    toggleHistoryDetails,
  } = lifecycle

  const templateNameById = useMemo(() => {
    const m: Record<string, string> = {}
    templates.forEach(t => {
      m[t.id] = t.name
    })
    return m
  }, [templates])

  const exerciseNameById = useMemo(() => {
    const m: Record<string, string> = {}
    exercises.forEach(e => {
      m[e.id] = e.name
    })
    return m
  }, [exercises])

  useSessionDraft(
    athleteId,
    { templateId, scheduledId, restSeconds: rest.restSeconds },
    draft => {
      if (draft.templateId) setTemplateId(draft.templateId)
      if (draft.scheduledId) setScheduledId(draft.scheduledId)
      if (typeof draft.restSeconds === 'number') rest.applyDefault(draft.restSeconds)
    },
  )

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(id)
  }, [notice])

  useEffect(() => {
    const fromUrl = searchParams.get('scheduled_id')
    if (fromUrl) setScheduledId(fromUrl)
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {notice && <div className="toast-banner"><span>{notice}</span><button className="ghost" onClick={() => setNotice(null)}>Dismiss</button></div>}

      {completionSummary && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ marginBottom: 0 }}>Workout complete</h3>
            <button className="ghost" onClick={dismissCompletionSummary}>Close</button>
          </div>
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="metric-card">
              <div className="small">Duration</div>
              <div className="metric-value">{completionSummary.durationSeconds != null ? `${Math.round(completionSummary.durationSeconds / 60)} min` : '—'}</div>
            </div>
            <div className="metric-card">
              <div className="small">Done / skipped</div>
              <div className="metric-value">{completionSummary.doneSets} / {completionSummary.skippedSets}</div>
            </div>
          </div>
          <div className="row small" style={{ marginTop: 12 }}>
            <span className="status-badge status-completed">{completionSummary.status}</span>
            {completionSummary.scheduledWorkoutStatus && <span className="status-badge status-planned">scheduled {completionSummary.scheduledWorkoutStatus}</span>}
          </div>
          {completionSummary.notes && <p className="small" style={{ marginTop: 12 }}>Notes: {completionSummary.notes}</p>}
        </div>
      )}

      {!session && (
        <SessionStarter
          templates={templates}
          scheduledItems={scheduledItems}
          templateId={templateId}
          scheduledId={scheduledId}
          templateNameById={templateNameById}
          hasActiveSession={hasActiveSession}
          onTemplateId={setTemplateId}
          onScheduledId={setScheduledId}
          onStartFromTemplate={() => void startFromTemplate()}
          onStartFromScheduled={() => void startFromScheduled()}
          onResume={() => void loadAll()}
          err={err}
        />
      )}

      {session && (
        <InProgressSession
          session={session}
          exerciseNameById={exerciseNameById}
          setDrafts={setDrafts}
          activeSetKey={activeSetKey}
          sessionNotes={sessionNotes}
          autosaveStateLabel={autosaveLabel(autosaveState)}
          autosaveStateClassName={autosaveBadgeClass(autosaveState)}
          autosaveMeta={autosaveMeta(session)}
          onChangeDraft={(k, draft) => setDraftValues(prev => ({ ...prev, [k]: draft }))}
          onChangeNotes={setSessionNotes}
          onDone={(loggedExerciseId, setNumber) => void logSet(loggedExerciseId, setNumber, 'done', true, true)}
          onSkip={(loggedExerciseId, setNumber) => void logSet(loggedExerciseId, setNumber, 'skipped', false, true)}
          onSelectSet={setActiveSetKey}
          onMovePrev={() => moveActiveSet(-1)}
          onMoveNext={() => moveActiveSet(1)}
          onFinish={() => void finish()}
          onLeave={() => {
            void leaveSession().then(() => {
              setNotice('Session progress saved.')
              navigate('/')
            })
          }}
          restTimer={
            <RestTimer
              restSeconds={rest.restSeconds}
              restRemaining={rest.restRemaining}
              restRunning={rest.restRunning}
              onSetSeconds={rest.applyDefault}
              onStart={rest.start}
              onRestart={rest.restart}
              onPause={rest.pause}
            />
          }
        />
      )}

      <SessionHistoryPanel
        history={history}
        historyDetails={historyDetails}
        exerciseNameById={exerciseNameById}
        onToggleDetails={(id) => void toggleHistoryDetails(id)}
      />
    </>
  )
}
