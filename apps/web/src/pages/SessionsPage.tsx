import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { InProgressSession } from '../components/sessions/InProgressSession'
import { RestTimer } from '../components/sessions/RestTimer'
import { SessionHistoryPanel } from '../components/sessions/SessionHistoryPanel'
import { SessionStarter } from '../components/sessions/SessionStarter'
import { useOfflineSetQueue } from '../hooks/useOfflineSetQueue'
import { useRestTimer } from '../hooks/useRestTimer'
import { useSessionDraft } from '../hooks/useSessionDraft'
import { useSessionLifecycle } from '../hooks/useSessionLifecycle'

const DEFAULT_REST_SECONDS = 90

export function SessionsPage({ token, athleteId }: { token: string; athleteId: string }) {
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
    autosaveState,
    historyDetails,
    loadAll,
    startFromTemplate,
    startFromScheduled,
    logSet,
    finish,
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

  const { clearDraft } = useSessionDraft(
    athleteId,
    { templateId, scheduledId, restSeconds: rest.restSeconds },
    draft => {
      if (draft.templateId) setTemplateId(draft.templateId)
      if (draft.scheduledId) setScheduledId(draft.scheduledId)
      if (typeof draft.restSeconds === 'number') rest.applyDefault(draft.restSeconds)
    },
  )

  useEffect(() => {
    const fromUrl = searchParams.get('scheduled_id')
    if (fromUrl) setScheduledId(fromUrl)
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {notice && <div className="card"><p style={{ color: '#86efac', margin: 0 }}>{notice}</p></div>}

      <SessionStarter
        templates={templates}
        scheduledItems={scheduledItems}
        templateId={templateId}
        scheduledId={scheduledId}
        templateNameById={templateNameById}
        onTemplateId={setTemplateId}
        onScheduledId={setScheduledId}
        onStartFromTemplate={() => void startFromTemplate()}
        onStartFromScheduled={() => void startFromScheduled()}
        onClearDraft={clearDraft}
        onResume={() => void loadAll()}
        err={err}
      />

      {session && (
        <>
          <div className="card">
            <p className="small" style={{ margin: 0 }}>
              Autosave: {autosaveState === 'saving' ? 'saving…' : autosaveState === 'ok' ? 'ok' : autosaveState === 'error' ? 'retrying' : 'idle'}
              {session.last_saved_at ? ` · last saved ${new Date(session.last_saved_at).toLocaleTimeString()}` : ''}
            </p>
          </div>
          <InProgressSession
            session={session}
            exerciseNameById={exerciseNameById}
            setDrafts={setDrafts}
            activeSetKey={activeSetKey}
            onChangeDraft={(k, draft) => setDraftValues(prev => ({ ...prev, [k]: draft }))}
            onDone={(loggedExerciseId, setNumber) => void logSet(loggedExerciseId, setNumber, 'done', true, true)}
            onSkip={(loggedExerciseId, setNumber) => void logSet(loggedExerciseId, setNumber, 'skipped', false, true)}
            onSelectSet={setActiveSetKey}
            onFinish={() => void finish()}
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
        </>
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
