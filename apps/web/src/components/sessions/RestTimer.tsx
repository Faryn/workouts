import { useState } from 'react'

import { formatClock } from '../../hooks/useRestTimer'

export function RestTimer(props: {
  restSeconds: number
  restRemaining: number
  restRunning: boolean
  restFinishedAt?: number | null
  countdownMark?: number | null
  onSetSeconds: (n: number) => void
  onStart: () => void
  onRestart: () => void
  onPause: () => void
  onClearFinishedCue?: () => void
}) {
  const justFinished = !!props.restFinishedAt && !props.restRunning && props.restRemaining === 0
  const [editing, setEditing] = useState(false)

  return (
    <div className="stack" style={{ marginBottom: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Rest timer: {formatClock(props.restRemaining)}</strong>
        <span className={`status-badge ${props.restRunning ? 'status-in_progress' : justFinished ? 'status-completed' : 'status-planned'}`}>
          {props.restRunning ? 'Running' : justFinished ? 'Go' : 'Ready'}
        </span>
      </div>
      {props.restRunning && props.countdownMark && props.countdownMark <= 3 && (
        <div className="notice-banner">
          <strong>{props.countdownMark}…</strong>
          <span className="small">Next set starts soon</span>
        </div>
      )}
      {justFinished && (
        <div className="notice-banner">
          <strong>Rest complete — ready for the next set.</strong>
          {props.onClearFinishedCue && <button className="ghost" onClick={props.onClearFinishedCue}>Dismiss</button>}
        </div>
      )}

      {!editing ? (
        <div className="row" style={{ alignItems: 'center', gap: 10 }}>
          <button onClick={props.onStart} disabled={props.restRunning || props.restRemaining <= 0}>
            Start
          </button>
          <button onClick={props.onRestart}>Restart</button>
          <button onClick={props.onPause} disabled={!props.restRunning}>
            Pause
          </button>
          <button className="ghost" onClick={() => setEditing(true)}>Edit</button>
        </div>
      ) : (
        <>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              min={0}
              value={props.restSeconds}
              onChange={e => props.onSetSeconds(Number(e.target.value || 0))}
              style={{ width: 100 }}
              autoFocus
            />
            <button onClick={props.onStart} disabled={props.restRunning || props.restRemaining <= 0}>
              Start
            </button>
            <button onClick={props.onRestart}>Restart</button>
            <button onClick={props.onPause} disabled={!props.restRunning}>
              Pause
            </button>
            <button className="ghost" onClick={() => setEditing(false)}>Done</button>
          </div>
          <div className="quick-stepper">
            <button type="button" onClick={() => props.onSetSeconds(60)}>60s</button>
            <button type="button" onClick={() => props.onSetSeconds(90)}>90s</button>
            <button type="button" onClick={() => props.onSetSeconds(120)}>120s</button>
            <button type="button" onClick={() => props.onSetSeconds(180)}>180s</button>
          </div>
        </>
      )}
    </div>
  )
}
