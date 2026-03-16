import { useState } from 'react'

import { api, type SessionDetail } from '../lib/api'
import {
  type SessionCompletionSummary,
  orderedSetKeys,
} from './sessionLifecycleHelpers'
import { useSessionAutosave } from './useSessionAutosave'
import { useSessionDraftState } from './useSessionDraftState'
import { useSessionActions } from './useSessionActions'
import { useSessionData } from './useSessionData'

export type LeaveSessionResult = 'saved' | 'saved_with_conflict_reload' | 'error'

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

  const [session, setSession] = useState<SessionDetail | null>(null)
  const [completionSummary, setCompletionSummary] = useState<SessionCompletionSummary | null>(null)

  const {
    draftValues,
    setDraftValues,
    activeSetKey,
    setActiveSetKey,
    sessionNotes,
    setSessionNotes,
    initializeFromSession,
    clearDraftState,
    clearBackup,
  } = useSessionDraftState({
    athleteId,
    session,
    onRecoveredDraft: () => onNotice('Recovered local draft for in-progress session.'),
  })

  const {
    templates,
    exercises,
    scheduledItems,
    history,
    historyDetails,
    err,
    setErr,
    loadAll,
    reloadLatestSession,
    toggleHistoryDetails,
  } = useSessionData({
    token,
    athleteId,
    templateId,
    scheduledId,
    setTemplateId,
    setScheduledId,
    setSession,
    initializeFromSession,
    clearDraftState,
  })

  const { autosaveState, autosaveCurrent, suppressNextNotesAutosave } = useSessionAutosave({
    token,
    session,
    sessionNotes,
    autosaveSession: (sessionId, sessionVersion, notes) => api.autosaveSession(token, sessionId, sessionVersion, notes),
    setSession,
    onConflict: reloadLatestSession,
    onNotice: message => onNotice(message),
  })

  function moveActiveSet(direction: -1 | 1) {
    if (!activeSetKey) return
    const flat = orderedSetKeys(session)
    const idx = flat.findIndex(x => x === activeSetKey)
    if (idx < 0) return
    const next = flat[idx + direction]
    if (next) setActiveSetKey(next)
  }

  const {
    startFromTemplate,
    startFromScheduled,
    logSet,
    finish,
    leaveSession,
  } = useSessionActions({
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
  })

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
