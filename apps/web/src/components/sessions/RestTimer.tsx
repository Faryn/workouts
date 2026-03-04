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
    <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
      <strong>Rest timer: {formatClock(props.restRemaining)}</strong>
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
  )
}
