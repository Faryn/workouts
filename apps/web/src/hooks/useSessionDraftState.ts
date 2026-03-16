import { useState } from 'react'

import type { SessionDetail } from '../lib/api'
import { useActiveSessionBackup } from './useActiveSessionBackup'
import { initializeDraftStateFromSession, type SetDraft } from './sessionLifecycleHelpers'

export function useSessionDraftState(params: {
  athleteId: string
  session: SessionDetail | null
  onRecoveredDraft: () => void
}) {
  const { athleteId, session, onRecoveredDraft } = params

  const [draftValues, setDraftValues] = useState<Record<string, SetDraft>>({})
  const [activeSetKey, setActiveSetKey] = useState<string | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')

  const { loadBackup, clearBackup } = useActiveSessionBackup({
    athleteId,
    session,
    draftValues,
    activeSetKey,
    notes: sessionNotes,
  })

  function initializeFromSession(nextSession: SessionDetail | null, opts?: { preserveLocalDrafts?: boolean; suppressAutosave?: () => void }) {
    if (!nextSession) return

    const next = initializeDraftStateFromSession(nextSession)
    opts?.suppressAutosave?.()
    const backup = opts?.preserveLocalDrafts ? loadBackup() : null
    if (backup && backup.sessionId === nextSession.id) {
      setDraftValues({ ...next.draftValues, ...backup.draftValues })
      setActiveSetKey(next.activeSetKey)
      setSessionNotes(backup.notes ?? next.notes)
      onRecoveredDraft()
      return
    }

    setDraftValues(next.draftValues)
    setActiveSetKey(next.activeSetKey)
    setSessionNotes(next.notes)
  }

  function clearDraftState() {
    setDraftValues({})
    setActiveSetKey(null)
    setSessionNotes('')
    clearBackup()
  }

  return {
    draftValues,
    setDraftValues,
    activeSetKey,
    setActiveSetKey,
    sessionNotes,
    setSessionNotes,
    initializeFromSession,
    clearDraftState,
    clearBackup,
    loadBackup,
  }
}
