import { useRef, type Dispatch, type SetStateAction } from 'react'

import { api, type SessionDetail } from '../lib/api'
import { ApiError, isUnauthorizedError } from '../lib/api/client'
import { errorMessage } from '../lib/errors'
import { hasRemainingSets, nextSetKey, setKey, summarizeSession, type SessionCompletionSummary, type SetDraft } from './sessionLifecycleHelpers'
import type { LeaveSessionResult } from './useSessionLifecycle'

export function useSessionActions(params: {
  token: string
  session: SessionDetail | null
  setSession: Dispatch<SetStateAction<SessionDetail | null>>
  templateId: string
  scheduledId: string
  draftValues: Record<string, SetDraft>
  setActiveSetKey: (value: string | null) => void
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
  initializeFromSession: (session: SessionDetail | null, opts?: { preserveLocalDrafts?: boolean; suppressAutosave?: () => void }) => void
  suppressNextNotesAutosave: () => void
  clearDraftState: () => void
  clearBackup: () => void
  loadAll: () => Promise<void>
  reloadLatestSession: (sessionId: string) => Promise<void>
  autosaveCurrent: (reason: 'interval' | 'visibility' | 'pagehide' | 'notes') => Promise<void>
  setErr: (message: string | null) => void
  setCompletionSummary: (summary: SessionCompletionSummary | null) => void
}) {
  const {
    token,
    session,
    setSession,
    templateId,
    scheduledId,
    draftValues,
    setActiveSetKey,
    onNotice,
    onRestCooldown,
    enqueuePendingLog,
    initializeFromSession,
    suppressNextNotesAutosave,
    clearDraftState,
    clearBackup,
    loadAll,
    reloadLatestSession,
    autosaveCurrent,
    setErr,
    setCompletionSummary,
  } = params
  const pendingSetKeysRef = useRef<Set<string>>(new Set())

  async function startFromTemplate() {
    setErr(null)
    try {
      const started = await api.startSession(token, { template_id: templateId })
      setSession(started)
      initializeFromSession(started, { suppressAutosave: suppressNextNotesAutosave })
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
      const started = await api.startSession(token, { scheduled_workout_id: scheduledId })
      setSession(started)
      initializeFromSession(started, { suppressAutosave: suppressNextNotesAutosave })
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

  async function finalizeSession(active: SessionDetail) {
    const done = await api.finishSession(token, active.id, active.version)
    setCompletionSummary(summarizeSession({
      ...active,
      status: done.status,
      started_at: done.started_at ?? active.started_at,
      ended_at: done.ended_at ?? active.ended_at,
      duration_seconds: done.duration_seconds ?? active.duration_seconds ?? null,
    }, done.scheduled_workout_status))
    onNotice(`Session ${done.status}, scheduled=${done.scheduled_workout_status ?? 'n/a'}`)
    setSession(null)
    clearDraftState()
    await loadAll()
  }

  async function logSet(loggedExerciseId: string, setNumber: number, status: 'done' | 'skipped', triggerCooldown: boolean, goNext = true) {
    if (!session) return
    const k = setKey(loggedExerciseId, setNumber)
    if (pendingSetKeysRef.current.has(k)) return
    pendingSetKeysRef.current.add(k)

    const draft = draftValues[k] ?? { actual_weight: '', actual_reps: '', status }
    const actualWeight = draft.actual_weight === '' ? null : Number(draft.actual_weight)
    const actualReps = draft.actual_reps === '' ? null : Number(draft.actual_reps)

    try {
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
        if (isUnauthorizedError(e)) return
        if (e instanceof ApiError && e.code === 'session_conflict') {
          await reloadLatestSession(session.id)
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

      const nextKey = goNext ? nextSetKey(session, loggedExerciseId, setNumber) : null
      const refreshed = await api.getSession(token, session.id).catch(err => isUnauthorizedError(err) ? null : session)
      if (!refreshed) return

      if (!hasRemainingSets(refreshed)) {
        try {
          await finalizeSession(refreshed)
          return
        } catch (e) {
          if (isUnauthorizedError(e)) return
          if (e instanceof ApiError && e.code === 'session_conflict') {
            await reloadLatestSession(session.id)
            onNotice('Session changed elsewhere. Review latest state before finishing.')
            return
          }
          setErr(errorMessage(e))
          return
        }
      }

      setSession(refreshed)
      initializeFromSession(refreshed, { preserveLocalDrafts: true, suppressAutosave: suppressNextNotesAutosave })
      if (nextKey) setActiveSetKey(nextKey)
      if (triggerCooldown) onRestCooldown()
    } finally {
      pendingSetKeysRef.current.delete(k)
    }
  }

  async function finish() {
    if (!session) return
    try {
      await finalizeSession(session)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'session_conflict') {
        await reloadLatestSession(session.id)
        onNotice('Session changed elsewhere. Review latest state before finishing.')
        return
      }
      setErr(errorMessage(e))
    }
  }

  async function leaveSession(): Promise<LeaveSessionResult> {
    const active = session
    if (!active || active.status !== 'in_progress') return 'saved'
    try {
      await autosaveCurrent('pagehide')
      return 'saved'
    } catch {
      return 'error'
    }
  }

  return {
    startFromTemplate,
    startFromScheduled,
    logSet,
    finish,
    leaveSession,
  }
}
