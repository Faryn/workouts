import { useEffect, useState } from 'react'

import {
  api,
  type ExerciseOption,
  type ScheduledWorkout,
  type SessionDetail,
  type SessionHistoryItem,
  type Template,
} from '../lib/api'
import { errorMessage } from '../lib/errors'

export type SetDraft = {
  actual_weight: string
  actual_reps: string
  status: 'done' | 'skipped'
}

function setKey(loggedExerciseId: string, setNumber: number) {
  return `${loggedExerciseId}:${setNumber}`
}

export function useSessionLifecycle(params: {
  token: string
  athleteId: string
  templateId: string
  scheduledId: string
  setTemplateId: (id: string) => void
  setScheduledId: (id: string) => void
  onNotice: (msg: string | null) => void
  onRestCooldown: () => void
  enqueuePendingLog: (item: {
    session_id: string
    logged_exercise_id: string
    set_number: number
    actual_weight: number | null
    actual_reps: number | null
    status: 'done' | 'skipped'
  }) => void
}) {
  const {
    token,
    athleteId,
    templateId,
    scheduledId,
    setTemplateId,
    setScheduledId,
    onNotice,
    onRestCooldown,
    enqueuePendingLog,
  } = params

  const [templates, setTemplates] = useState<Template[]>([])
  const [exercises, setExercises] = useState<ExerciseOption[]>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledWorkout[]>([])
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [history, setHistory] = useState<SessionHistoryItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [draftValues, setDraftValues] = useState<Record<string, SetDraft>>({})
  const [activeSetKey, setActiveSetKey] = useState<string | null>(null)
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [historyDetails, setHistoryDetails] = useState<Record<string, SessionDetail | null>>({})

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
    setDraftValues(next)
    setActiveSetKey(firstKey)
  }

  async function loadAll() {
    try {
      const [h, t, s, latest, ex] = await Promise.all([
        api.listSessions(token, athleteId),
        api.listTemplates(token, athleteId),
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
    if (!session || session.status !== 'in_progress') return

    const id = window.setInterval(() => {
      setAutosaveState('saving')
      void api.autosaveSession(token, session.id)
        .then((saved) => {
          setAutosaveState('ok')
          setSession(prev => (prev ? { ...prev, last_saved_at: saved.last_saved_at ?? prev.last_saved_at, notes: saved.notes ?? prev.notes } : prev))
        })
        .catch(() => {
          setAutosaveState('error')
        })
    }, 15000)

    return () => window.clearInterval(id)
  }, [session, token])

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
    const draft = draftValues[k] ?? { actual_weight: '', actual_reps: '', status }
    const actualWeight = draft.actual_weight === '' ? null : Number(draft.actual_weight)
    const actualReps = draft.actual_reps === '' ? null : Number(draft.actual_reps)

    try {
      await api.logSet(token, session.id, {
        logged_exercise_id: loggedExerciseId,
        set_number: setNumber,
        actual_weight: actualWeight,
        actual_reps: actualReps,
        status,
      })
    } catch {
      enqueuePendingLog({
        session_id: session.id,
        logged_exercise_id: loggedExerciseId,
        set_number: setNumber,
        actual_weight: actualWeight,
        actual_reps: actualReps,
        status,
      })
      onNotice('Offline: set saved locally and will sync when back online.')
    }

    const nextKey = goNext ? nextSetKey(loggedExerciseId, setNumber) : null
    const refreshed = await api.getSession(token, session.id).catch(() => session)
    setSession(refreshed)
    initializeSetDraftsFromSession(refreshed)
    if (nextKey) setActiveSetKey(nextKey)
    if (triggerCooldown) onRestCooldown()
  }

  async function finish() {
    if (!session) return
    const done = await api.finishSession(token, session.id)
    onNotice(`Session ${done.status}, scheduled=${done.scheduled_workout_status ?? 'n/a'}`)
    setSession(null)
    setDraftValues({})
    setActiveSetKey(null)
    await loadAll()
  }

  async function toggleHistoryDetails(sessionId: string) {
    if (historyDetails[sessionId]) {
      setHistoryDetails(prev => ({ ...prev, [sessionId]: null }))
      return
    }
    const detail = await api.getSession(token, sessionId)
    setHistoryDetails(prev => ({ ...prev, [sessionId]: detail }))
  }

  return {
    templates,
    exercises,
    scheduledItems,
    session,
    history,
    err,
    setErr,
    setSession,
    setDrafts: draftValues,
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
  }
}
