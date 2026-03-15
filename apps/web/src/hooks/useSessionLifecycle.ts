import { useEffect, useRef, useState } from 'react'

import {
  api,
  type ExerciseOption,
  type ScheduledWorkout,
  type SessionDetail,
  type SessionHistoryItem,
  type Template,
} from '../lib/api'
import { ApiError } from '../lib/api/client'
import { errorMessage } from '../lib/errors'
import { useActiveSessionBackup } from './useActiveSessionBackup'

export type SetDraft = {
  actual_weight: string
  actual_reps: string
  status: 'done' | 'skipped'
}

export type SessionCompletionSummary = {
  status: string
  scheduledWorkoutStatus?: string | null
  durationSeconds: number | null
  doneSets: number
  skippedSets: number
  notes: string
}

export type LeaveSessionResult = 'saved' | 'saved_with_conflict_reload' | 'error'

function setKey(loggedExerciseId: string, setNumber: number) {
  return `${loggedExerciseId}:${setNumber}`
}

function summarizeSession(session: SessionDetail | null, scheduledWorkoutStatus?: string | null): SessionCompletionSummary {
  let doneSets = 0
  let skippedSets = 0
  if (session) {
    for (const ex of session.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        if (st.status === 'done') doneSets += 1
        if (st.status === 'skipped') skippedSets += 1
      }
    }
  }

  let durationSeconds: number | null = null
  if (session?.started_at) {
    const started = new Date(session.started_at).getTime()
    const ended = Date.now()
    if (!Number.isNaN(started)) durationSeconds = Math.max(0, Math.round((ended - started) / 1000))
  }

  return {
    status: 'completed',
    scheduledWorkoutStatus,
    durationSeconds,
    doneSets,
    skippedSets,
    notes: session?.notes ?? '',
  }
}

function hasRemainingSets(session: SessionDetail | null) {
  if (!session) return false
  for (const ex of session.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      if (st.status !== 'done' && st.status !== 'skipped') return true
    }
  }
  return false
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
  const [sessionNotes, setSessionNotes] = useState('')
  const [completionSummary, setCompletionSummary] = useState<SessionCompletionSummary | null>(null)

  const sessionRef = useRef<SessionDetail | null>(null)
  const notesRef = useRef('')
  const suppressNextNotesAutosaveRef = useRef(false)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    notesRef.current = sessionNotes
  }, [sessionNotes])

  const { loadBackup, clearBackup } = useActiveSessionBackup({
    athleteId,
    session,
    draftValues,
    activeSetKey,
    notes: sessionNotes,
  })

  function initializeSetDraftsFromSession(s: SessionDetail | null, opts?: { preserveLocalDrafts?: boolean }) {
    if (!s) return
    const next: Record<string, SetDraft> = {}
    let firstKey: string | null = null
    let firstUnfinishedKey: string | null = null
    for (const ex of s.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        const k = setKey(ex.id, st.set_number)
        if (!firstKey) firstKey = k
        if (!firstUnfinishedKey && st.status !== 'done' && st.status !== 'skipped') firstUnfinishedKey = k
        next[k] = {
          actual_weight: st.actual_weight != null ? String(st.actual_weight) : (st.status === 'pending' ? '' : (st.planned_weight != null ? String(st.planned_weight) : '')),
          actual_reps: st.actual_reps != null ? String(st.actual_reps) : (st.status === 'pending' ? '' : (st.planned_reps != null ? String(st.planned_reps) : '')),
          status: st.status === 'skipped' ? 'skipped' : 'done',
        }
      }
    }

    suppressNextNotesAutosaveRef.current = true
    const targetKey = firstUnfinishedKey ?? firstKey
    const backup = opts?.preserveLocalDrafts ? loadBackup() : null
    if (backup && backup.sessionId === s.id) {
      setDraftValues({ ...next, ...backup.draftValues })
      setActiveSetKey(targetKey)
      setSessionNotes(backup.notes ?? (s.notes ?? ''))
      onNotice('Recovered local draft for in-progress session.')
      return
    }

    setDraftValues(next)
    setActiveSetKey(targetKey)
    setSessionNotes(s.notes ?? '')
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
      if (latest) {
        setSession(latest)
        initializeSetDraftsFromSession(latest, { preserveLocalDrafts: true })
      }
      const planned = s.filter(x => x.status === 'planned')
      setScheduledItems(planned)
      if (!templateId && t[0]) setTemplateId(t[0].id)
      if (!scheduledId && planned[0]) setScheduledId(planned[0].id)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  async function autosaveCurrent(reason: 'interval' | 'visibility' | 'pagehide' | 'notes') {
    const active = sessionRef.current
    if (!active || active.status !== 'in_progress') return
    try {
      setAutosaveState('saving')
      const saved = await api.autosaveSession(token, active.id, active.version, notesRef.current)
      setAutosaveState('ok')
      setSession(prev => prev ? {
        ...prev,
        last_saved_at: saved.last_saved_at ?? prev.last_saved_at,
        updated_at: saved.updated_at ?? prev.updated_at,
        notes: saved.notes ?? prev.notes,
        version: saved.version ?? prev.version,
      } : prev)
      if (reason === 'visibility' || reason === 'pagehide') onNotice('Session progress saved.')
    } catch (e) {
      setAutosaveState('error')
      if (e instanceof ApiError && e.code === 'session_conflict' && active.id) {
        const latest = await api.getSession(token, active.id).catch(() => null)
        if (latest) {
          setSession(latest)
          initializeSetDraftsFromSession(latest, { preserveLocalDrafts: true })
        }
        onNotice('Session changed elsewhere. Reloaded latest version.')
      }
    }
  }

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return

    const id = window.setInterval(() => {
      void autosaveCurrent('interval')
    }, 15000)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void autosaveCurrent('visibility')
    }
    const onPageHide = () => {
      void autosaveCurrent('pagehide')
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [session, token])

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return
    if (suppressNextNotesAutosaveRef.current) {
      suppressNextNotesAutosaveRef.current = false
      return
    }
    const id = window.setTimeout(() => {
      void autosaveCurrent('notes')
    }, 1200)
    return () => window.clearTimeout(id)
  }, [session, sessionNotes])

  async function startFromTemplate() {
    setErr(null)
    try {
      const s = await api.startSession(token, { template_id: templateId })
      setSession(s)
      initializeSetDraftsFromSession(s)
      clearBackup()
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'session_already_in_progress') {
        onNotice('You already have an in-progress session. Resuming it instead.')
        await loadAll()
        return
      }
      setErr(errorMessage(e))
    }
  }

  async function startFromScheduled() {
    setErr(null)
    try {
      const s = await api.startSession(token, { scheduled_workout_id: scheduledId })
      setSession(s)
      initializeSetDraftsFromSession(s)
      clearBackup()
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'session_already_in_progress') {
        onNotice('You already have an in-progress session. Resuming it instead.')
        await loadAll()
        return
      }
      setErr(errorMessage(e))
    }
  }

  function orderedSetKeys(sourceSession: SessionDetail | null = session) {
    if (!sourceSession) return [] as string[]
    const keys: string[] = []
    for (const ex of sourceSession.logged_exercises ?? []) {
      for (const st of ex.sets ?? []) {
        keys.push(setKey(ex.id, st.set_number))
      }
    }
    return keys
  }

  function nextSetKey(currentLoggedExerciseId: string, currentSetNumber: number): string | null {
    const flat = orderedSetKeys()
    const current = setKey(currentLoggedExerciseId, currentSetNumber)
    const idx = flat.findIndex(x => x === current)
    if (idx < 0 || idx >= flat.length - 1) return null
    return flat[idx + 1] ?? null
  }

  function moveActiveSet(direction: -1 | 1) {
    if (!activeSetKey) return
    const flat = orderedSetKeys()
    const idx = flat.findIndex(x => x === activeSetKey)
    if (idx < 0) return
    const next = flat[idx + direction]
    if (next) setActiveSetKey(next)
  }

  async function logSet(loggedExerciseId: string, setNumber: number, status: 'done' | 'skipped', triggerCooldown: boolean, goNext = true) {
    if (!session) return
    const k = setKey(loggedExerciseId, setNumber)
    const draft = draftValues[k] ?? { actual_weight: '', actual_reps: '', status }
    const actualWeight = draft.actual_weight === '' ? null : Number(draft.actual_weight)
    const actualReps = draft.actual_reps === '' ? null : Number(draft.actual_reps)

    try {
      const logged = await api.logSet(token, session.id, {
        logged_exercise_id: loggedExerciseId,
        set_number: setNumber,
        actual_weight: actualWeight,
        actual_reps: actualReps,
        status,
        session_version: session.version,
      })
      setSession(prev => prev ? {
        ...prev,
        version: logged.session_version ?? prev.version,
        last_saved_at: logged.last_saved_at ?? prev.last_saved_at,
      } : prev)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'session_conflict') {
        const latest = await api.getSession(token, session.id).catch(() => null)
        if (latest) {
          setSession(latest)
          initializeSetDraftsFromSession(latest, { preserveLocalDrafts: true })
        }
        onNotice('Session changed elsewhere. Reloaded latest version before continuing.')
        return
      }

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

    if (!hasRemainingSets(refreshed)) {
      try {
        await finalizeSession(refreshed)
        return
      } catch (e) {
        if (e instanceof ApiError && e.code === 'session_conflict') {
          const latest = await api.getSession(token, session.id).catch(() => null)
          if (latest) {
            setSession(latest)
            initializeSetDraftsFromSession(latest, { preserveLocalDrafts: true })
          }
          onNotice('Session changed elsewhere. Review latest state before finishing.')
          return
        }
        setErr(errorMessage(e))
        return
      }
    }

    setSession(refreshed)
    initializeSetDraftsFromSession(refreshed, { preserveLocalDrafts: true })
    if (nextKey) setActiveSetKey(nextKey)
    if (triggerCooldown) onRestCooldown()
  }

  async function finalizeSession(active: SessionDetail) {
    const done = await api.finishSession(token, active.id, active.version)
    setCompletionSummary(summarizeSession(active, done.scheduled_workout_status))
    onNotice(`Session ${done.status}, scheduled=${done.scheduled_workout_status ?? 'n/a'}`)
    setSession(null)
    setSessionNotes('')
    setDraftValues({})
    setActiveSetKey(null)
    clearBackup()
    await loadAll()
  }

  async function finish() {
    if (!session) return
    try {
      await finalizeSession(session)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'session_conflict') {
        const latest = await api.getSession(token, session.id).catch(() => null)
        if (latest) {
          setSession(latest)
          initializeSetDraftsFromSession(latest, { preserveLocalDrafts: true })
        }
        onNotice('Session changed elsewhere. Review latest state before finishing.')
        return
      }
      setErr(errorMessage(e))
    }
  }

  async function leaveSession(): Promise<LeaveSessionResult> {
    const active = sessionRef.current
    if (!active || active.status !== 'in_progress') return 'saved'
    try {
      await autosaveCurrent('pagehide')
      return 'saved'
    } catch {
      return 'error'
    }
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
    moveActiveSet,
    autosaveState,
    historyDetails,
    sessionNotes,
    setSessionNotes,
    hasActiveSession: !!session,
    completionSummary,
    dismissCompletionSummary: () => setCompletionSummary(null),
    loadAll,
    startFromTemplate,
    startFromScheduled,
    logSet,
    finish,
    leaveSession,
    toggleHistoryDetails,
  }
}
