import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { InProgressSession } from '../components/sessions/InProgressSession'
import { RestTimer } from '../components/sessions/RestTimer'
import { SessionStarter } from '../components/sessions/SessionStarter'
import { useRestTimer } from '../hooks/useRestTimer'
import { useSessionDraft } from '../hooks/useSessionDraft'
import { api, type ExerciseOption, type ScheduledWorkout, type SessionDetail, type SessionHistoryItem, type Template } from '../lib/api'
import { errorMessage } from '../lib/errors'

const DEFAULT_REST_SECONDS = 90

type SetDraft = {
  actual_weight: string
  actual_reps: string
  status: 'done' | 'skipped'
}

function setKey(loggedExerciseId: string, setNumber: number) {
  return `${loggedExerciseId}:${setNumber}`
}

export function SessionsPage({ token, athleteId }: { token: string; athleteId: string }) {
  const [searchParams] = useSearchParams()
  const [templates, setTemplates] = useState<Template[]>([])
  const [exercises, setExercises] = useState<ExerciseOption[]>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledWorkout[]>([])
  const [templateId, setTemplateId] = useState('')
  const [scheduledId, setScheduledId] = useState('')
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [history, setHistory] = useState<SessionHistoryItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({})
  const [activeSetKey, setActiveSetKey] = useState<string | null>(null)

  const rest = useRestTimer(DEFAULT_REST_SECONDS)

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

  function initializeSetDraftsFromSession(s: SessionDetail | null) {
    if (!s) return
    const next: Record<string, SetDraft> = {}
    let firstKey: string | null = null
    for (const ex of s.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        const k = setKey(ex.id, st.set_number)
        if (!firstKey) firstKey = k
        next[k] = {
          actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.planned_weight != null ? String(st.planned_weight) : ''),
          actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.planned_reps != null ? String(st.planned_reps) : ''),
          status: st.status === 'skipped' ? 'skipped' : 'done',
        }
      }
    }
    setSetDrafts(next)
    setActiveSetKey(firstKey)
  }

  async function loadAll() {
    try {
      const [h, t, s, latest, ex] = await Promise.all([
        api.listSessions(token, athleteId),
        api.listTemplates(token),
        api.listScheduled(token, athleteId),
        api.latestInProgressSession(token, athleteId),
        api.listExercises(token),
      ])
      setHistory(h)
      setTemplates(t)
      setExercises(ex)
      if (!session && latest) {
        setSession(latest)
        initializeSetDraftsFromSession(latest)
      }
      const planned = s.filter(x => x.status === 'planned')
      setScheduledItems(planned)
      if (!templateId && t[0]) setTemplateId(t[0].id)
      if (!scheduledId && planned[0]) setScheduledId(planned[0].id)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => {
    const fromUrl = searchParams.get('scheduled_id')
    if (fromUrl) setScheduledId(fromUrl)
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startFromTemplate() {
    setErr(null)
    try {
      const s = await api.startSession(token, { template_id: templateId })
      setSession(s)
      initializeSetDraftsFromSession(s)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  async function startFromScheduled() {
    setErr(null)
    try {
      const s = await api.startSession(token, { scheduled_workout_id: scheduledId })
      setSession(s)
      initializeSetDraftsFromSession(s)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  function nextSetKey(currentLoggedExerciseId: string, currentSetNumber: number): string | null {
    if (!session) return null
    const flat: Array<{ key: string; loggedExerciseId: string; setNumber: number }> = []
    for (const ex of session.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        flat.push({ key: setKey(ex.id, st.set_number), loggedExerciseId: ex.id, setNumber: st.set_number })
      }
    }
    const idx = flat.findIndex(x => x.loggedExerciseId === currentLoggedExerciseId && x.setNumber === currentSetNumber)
    if (idx < 0 || idx >= flat.length - 1) return null
    return flat[idx + 1].key
  }

  async function logSet(loggedExerciseId: string, setNumber: number, status: 'done' | 'skipped', triggerCooldown: boolean, goNext = true) {
    if (!session) return
    const k = setKey(loggedExerciseId, setNumber)
    const draft = setDrafts[k] ?? { actual_weight: '', actual_reps: '', status }

    await api.logSet(token, session.id, {
      logged_exercise_id: loggedExerciseId,
      set_number: setNumber,
      actual_weight: draft.actual_weight === '' ? null : Number(draft.actual_weight),
      actual_reps: draft.actual_reps === '' ? null : Number(draft.actual_reps),
      status,
    })

    const nextKey = goNext ? nextSetKey(loggedExerciseId, setNumber) : null
    const refreshed = await api.getSession(token, session.id)
    setSession(refreshed)
    initializeSetDraftsFromSession(refreshed)
    if (nextKey) setActiveSetKey(nextKey)
    if (triggerCooldown) rest.startFromDefault()
  }

  async function finish() {
    if (!session) return
    const done = await api.finishSession(token, session.id)
    setNotice(`Session ${done.status}, scheduled=${done.scheduled_workout_status ?? 'n/a'}`)
    setSession(null)
    setSetDrafts({})
    setActiveSetKey(null)
    await loadAll()
  }

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
        <InProgressSession
          session={session}
          exerciseNameById={exerciseNameById}
          setDrafts={setDrafts}
          activeSetKey={activeSetKey}
          onChangeDraft={(k, draft) => setSetDrafts(prev => ({ ...prev, [k]: draft }))}
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
      )}

      <div className="card">
        <h3>History</h3>
        <ul>
          {history.map(h => (
            <li key={h.id}>
              {h.started_at ? new Date(h.started_at).toLocaleString() : 'n/a'} · {h.status} · exercises: {h.exercise_count}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
