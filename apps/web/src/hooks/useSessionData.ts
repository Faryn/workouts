import { useState } from 'react'

import {
  api,
  type ExerciseOption,
  type ScheduledWorkout,
  type SessionDetail,
  type SessionHistoryItem,
  type Template,
} from '../lib/api'
import { errorMessage } from '../lib/errors'

export function useSessionData(params: {
  token: string
  athleteId: string
  templateId: string
  scheduledId: string
  setTemplateId: (id: string) => void
  setScheduledId: (id: string) => void
  setSession: (session: SessionDetail | null) => void
  initializeFromSession: (session: SessionDetail | null, opts?: { preserveLocalDrafts?: boolean; suppressAutosave?: () => void }) => void
  clearDraftState: () => void
  suppressNextNotesAutosave?: () => void
}) {
  const {
    token,
    athleteId,
    templateId,
    scheduledId,
    setTemplateId,
    setScheduledId,
    setSession,
    initializeFromSession,
    clearDraftState,
    suppressNextNotesAutosave,
  } = params

  const [templates, setTemplates] = useState<Template[]>([])
  const [exercises, setExercises] = useState<ExerciseOption[]>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledWorkout[]>([])
  const [history, setHistory] = useState<SessionHistoryItem[]>([])
  const [historyDetails, setHistoryDetails] = useState<Record<string, SessionDetail | null>>({})
  const [err, setErr] = useState<string | null>(null)

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
        initializeFromSession(latest, { preserveLocalDrafts: true, suppressAutosave: suppressNextNotesAutosave })
      } else {
        setSession(null)
        clearDraftState()
      }
      const planned = s.filter(x => x.status === 'planned')
      setScheduledItems(planned)
      if (!templateId && t[0]) setTemplateId(t[0].id)
      if (!scheduledId && planned[0]) {
        const today = new Date().toLocaleDateString('en-CA')
        const ordered = planned.slice().sort((a, b) => a.date.localeCompare(b.date))
        const preferred = ordered.find(item => item.date === today)
          ?? ordered.find(item => item.date >= today)
          ?? ordered[0]
        setScheduledId(preferred.id)
      }
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  async function reloadLatestSession(sessionId: string): Promise<SessionDetail | null> {
    const latest = await api.getSession(token, sessionId).catch(() => null)
    if (latest) {
      setSession(latest)
      initializeFromSession(latest, { preserveLocalDrafts: true, suppressAutosave: suppressNextNotesAutosave })
    }
    return latest
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
    history,
    historyDetails,
    err,
    setErr,
    loadAll,
    reloadLatestSession,
    toggleHistoryDetails,
  }
}
