import { useState } from 'react'
import { api } from '../lib/api'

export function SessionsPage({ token }: { token: string }) {
  const [templateId, setTemplateId] = useState('')
  const [scheduledId, setScheduledId] = useState('')
  const [session, setSession] = useState<any | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function startFromTemplate() {
    setErr(null)
    try { setSession(await api.startSession(token, { template_id: templateId })) } catch (e: any) { setErr(e.message) }
  }

  async function startFromScheduled() {
    setErr(null)
    try { setSession(await api.startSession(token, { scheduled_workout_id: scheduledId })) } catch (e: any) { setErr(e.message) }
  }

  async function logFirstSet() {
    if (!session) return
    const ex = session.logged_exercises?.[0]
    if (!ex) return
    const actualWeight = Number(prompt('Actual weight?', '80'))
    const actualReps = Number(prompt('Actual reps?', '5'))
    const updated = await api.logSet(token, session.id, {
      logged_exercise_id: ex.id,
      set_number: 1,
      actual_weight: actualWeight,
      actual_reps: actualReps,
      status: 'done'
    })
    alert(`Set logged: planned ${updated.planned_weight}x${updated.planned_reps}, actual ${updated.actual_weight}x${updated.actual_reps}`)
  }

  async function finish() {
    if (!session) return
    const done = await api.finishSession(token, session.id)
    alert(`Session ${done.status}, scheduled=${done.scheduled_workout_status}`)
    setSession(null)
  }

  return (
    <>
      <div className="card">
        <h2>Sessions</h2>
        <div className="row">
          <input value={templateId} onChange={e => setTemplateId(e.target.value)} placeholder="Template ID" />
          <button onClick={() => void startFromTemplate()} disabled={!templateId}>Start from template</button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input value={scheduledId} onChange={e => setScheduledId(e.target.value)} placeholder="Scheduled workout ID" />
          <button onClick={() => void startFromScheduled()} disabled={!scheduledId}>Start from scheduled</button>
        </div>
        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      {session && (
        <div className="card">
          <h3>In Progress Session</h3>
          <p>ID: {session.id}</p>
          <p>Exercises: {session.logged_exercises?.length ?? 0}</p>
          <div className="row">
            <button onClick={() => void logFirstSet()}>Log first set</button>
            <button onClick={() => void finish()}>Finish session</button>
          </div>
        </div>
      )}
    </>
  )
}
