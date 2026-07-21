import { useEffect, useRef, useState } from 'react'

import type { SessionDetail } from '../lib/api'
import { ApiError, isUnauthorizedError } from '../lib/api/client'

export type AutosaveReason = 'interval' | 'visibility' | 'pagehide' | 'notes'

export function useSessionAutosave(params: {
  token: string
  session: SessionDetail | null
  sessionNotes: string
  autosaveSession: (sessionId: string, sessionVersion: number, notes: string) => Promise<{
    notes?: string | null
    last_saved_at?: string | null
    updated_at?: string | null
    version?: number | null
  }>
  setSession: React.Dispatch<React.SetStateAction<SessionDetail | null>>
  onConflict: (sessionId: string) => Promise<SessionDetail | null>
  onNotice: (message: string) => void
}) {
  const { session, sessionNotes, autosaveSession, setSession, onConflict, onNotice } = params

  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const sessionRef = useRef<SessionDetail | null>(null)
  const notesRef = useRef('')
  const lastAutosavedNotesRef = useRef('')
  const lastHeartbeatAutosaveAtRef = useRef(0)
  const suppressNextNotesAutosaveRef = useRef(false)
  const autosaveInFlightRef = useRef(false)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    notesRef.current = sessionNotes
  }, [sessionNotes])

  useEffect(() => {
    lastAutosavedNotesRef.current = session?.notes ?? ''
    if (!session) lastHeartbeatAutosaveAtRef.current = 0
  }, [session?.id, session?.notes])

  async function autosaveCurrent(reason: AutosaveReason) {
    const active = sessionRef.current
    if (!active || active.status !== 'in_progress') return
    if (autosaveInFlightRef.current) return

    const notesChanged = notesRef.current !== lastAutosavedNotesRef.current
    const now = Date.now()
    const heartbeatDue = now - lastHeartbeatAutosaveAtRef.current >= 120000
    const shouldSave = reason === 'notes'
      ? notesChanged
      : reason === 'interval'
        ? heartbeatDue && notesChanged
        : notesChanged || heartbeatDue

    if (!shouldSave) {
      if (reason === 'interval') setAutosaveState('idle')
      return
    }

    try {
      autosaveInFlightRef.current = true
      setAutosaveState('saving')
      const saved = await autosaveSession(active.id, active.version, notesRef.current)
      setAutosaveState('ok')
      lastAutosavedNotesRef.current = saved.notes ?? notesRef.current
      lastHeartbeatAutosaveAtRef.current = now
      setSession(prev => prev ? {
        ...prev,
        last_saved_at: saved.last_saved_at ?? prev.last_saved_at,
        updated_at: saved.updated_at ?? prev.updated_at,
        notes: saved.notes ?? prev.notes,
        version: saved.version ?? prev.version,
      } : prev)
      if (reason === 'visibility' || reason === 'pagehide') onNotice('Session progress saved.')
    } catch (e) {
      if (isUnauthorizedError(e)) {
        setAutosaveState('idle')
        return
      }
      setAutosaveState('error')
      if (e instanceof ApiError && e.code === 'session_conflict' && active.id) {
        const latest = await onConflict(active.id)
        // A set write on this same device can win the race against a notes
        // autosave. If the notes are already present, there is nothing for
        // the athlete to resolve and showing a cross-device warning is noisy.
        if (latest?.notes === notesRef.current) {
          lastAutosavedNotesRef.current = latest.notes ?? ''
          setAutosaveState('ok')
          return
        }
        onNotice('Session notes changed elsewhere. Reloaded the latest version.')
      }
    } finally {
      autosaveInFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return

    const id = window.setInterval(() => {
      void autosaveCurrent('interval')
    }, 60000)

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
  }, [session])

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

  return {
    autosaveState,
    autosaveCurrent,
    suppressNextNotesAutosave() {
      suppressNextNotesAutosaveRef.current = true
    },
  }
}
