import { useEffect, useMemo } from 'react'

import type { SessionDetail } from '../lib/api'
import type { SetDraft } from './sessionLifecycleHelpers'

export type ActiveSessionBackup = {
  sessionId: string
  draftValues: Record<string, SetDraft>
  activeSetKey: string | null
  notes: string
  savedAt: string
}

function readBackup(key: string): ActiveSessionBackup | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as ActiveSessionBackup
  } catch {
    return null
  }
}

function writeBackup(key: string, value: ActiveSessionBackup) {
  localStorage.setItem(key, JSON.stringify(value))
}

function clearBackup(key: string) {
  localStorage.removeItem(key)
}

export function useActiveSessionBackup(params: {
  athleteId: string
  session: SessionDetail | null
  draftValues: Record<string, SetDraft>
  activeSetKey: string | null
  notes: string
}) {
  const { athleteId, session, draftValues, activeSetKey, notes } = params
  const backupKey = useMemo(() => `active-session-backup:${athleteId}`, [athleteId])

  useEffect(() => {
    if (!session || session.status !== 'in_progress') {
      clearBackup(backupKey)
      return
    }
    writeBackup(backupKey, {
      sessionId: session.id,
      draftValues,
      activeSetKey,
      notes,
      savedAt: new Date().toISOString(),
    })
  }, [backupKey, session, draftValues, activeSetKey, notes])

  return {
    loadBackup: () => readBackup(backupKey),
    clearBackup: () => clearBackup(backupKey),
  }
}
