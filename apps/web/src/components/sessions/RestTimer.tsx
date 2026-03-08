import { formatClock } from '../../hooks/useRestTimer'

export function RestTimer(props: {
  restSeconds: number
  restRemaining: number
  restRunning: boolean
  onSetSeconds: (n: number) => void
  onStart: () => void
  onRestart: () => void
  onPause: () => void
}) {
  return (
    <div className="stack" style={{ marginBottom: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Rest timer: {formatClock(props.restRemaining)}</strong>
        <span className={`status-badge ${props.restRunning ? 'status-in_progress' : 'status-planned'}`}>
          {props.restRunning ? 'Running' : 'Ready'}
        </span>
      </div>
      <div className="row" style={{ alignItems: 'center' }}>
        <input
          type="number"
          min={0}
          value={props.restSeconds}
          onChange={e => props.onSetSeconds(Number(e.target.value || 0))}
          style={{ width: 100 }}
        />
        <button onClick={props.onStart} disabled={props.restRunning || props.restRemaining <= 0}>
          Start
        </button>
        <button onClick={props.onRestart}>Restart</button>
        <button onClick={props.onPause} disabled={!props.restRunning}>
          Pause
        </button>
      </div>
      <div className="quick-stepper">
        <button type="button" onClick={() => props.onSetSeconds(60)}>60s</button>
        <button type="button" onClick={() => props.onSetSeconds(90)}>90s</button>
        <button type="button" onClick={() => props.onSetSeconds(120)}>120s</button>
        <button type="button" onClick={() => props.onSetSeconds(180)}>180s</button>
      </div>
    </div>
  )
}
