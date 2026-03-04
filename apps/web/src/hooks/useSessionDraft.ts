import { useEffect, useMemo } from 'react'

type SessionDraft = {
  templateId: string
  scheduledId: string
  restSeconds: number
}

export function useSessionDraft(
  athleteId: string,
  values: SessionDraft,
  onLoad: (draft: Partial<SessionDraft>) => void,
) {
  const draftKey = useMemo(() => `session-draft:${athleteId}`, [athleteId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      onLoad(JSON.parse(raw))
    } catch {
      // ignore corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  useEffect(() => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        ...values,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [draftKey, values])

  function clearDraft() {
    localStorage.removeItem(draftKey)
  }

  return { draftKey, clearDraft }
}
