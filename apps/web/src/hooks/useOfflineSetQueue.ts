import { useCallback, useEffect } from 'react'

import { api } from '../lib/api'
import { ApiError } from '../lib/api/client'

type PendingSetLog = {
  session_id: string
  logged_exercise_id: string
  set_number: number
  actual_weight: number | null
  actual_reps: number | null
  status: 'done' | 'skipped'
}

function safeReadQueue(queueKey: string): PendingSetLog[] {
  try {
    const raw = localStorage.getItem(queueKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useOfflineSetQueue(params: {
  token: string
  athleteId: string
  onSynced?: () => void
}) {
  const { token, athleteId, onSynced } = params
  const queueKey = `pending-set-logs:${athleteId}`

  const setPendingLogs = useCallback((items: PendingSetLog[]) => {
    localStorage.setItem(queueKey, JSON.stringify(items))
  }, [queueKey])

  const enqueuePendingLog = useCallback((item: PendingSetLog) => {
    const current = safeReadQueue(queueKey)
    current.push(item)
    setPendingLogs(current)
  }, [queueKey, setPendingLogs])

  const flushPendingLogs = useCallback(async () => {
    if (!navigator.onLine) return

    const pending = safeReadQueue(queueKey)
    if (!pending.length) return

    const remaining: PendingSetLog[] = []
    for (const p of pending) {
      try {
        const latest = await api.getSession(token, p.session_id)
        await api.logSet(token, p.session_id, {
          logged_exercise_id: p.logged_exercise_id,
          set_number: p.set_number,
          actual_weight: p.actual_weight,
          actual_reps: p.actual_reps,
          status: p.status,
          session_version: latest.version,
        })
      } catch (err) {
        if (err instanceof ApiError && (err.code === 'session_not_in_progress' || err.code === 'session_not_found')) {
          continue
        }
        remaining.push(p)
      }
    }

    setPendingLogs(remaining)
    if (remaining.length === 0) onSynced?.()
  }, [onSynced, queueKey, setPendingLogs, token])

  useEffect(() => {
    void flushPendingLogs()
    const onOnline = () => { void flushPendingLogs() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flushPendingLogs])

  return { enqueuePendingLog, flushPendingLogs }
}
