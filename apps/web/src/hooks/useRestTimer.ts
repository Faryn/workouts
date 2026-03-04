import { useEffect, useState } from 'react'

export function formatClock(totalSec: number) {
  const s = Math.max(0, totalSec)
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export function useRestTimer(defaultSeconds: number) {
  const [restSeconds, setRestSeconds] = useState(defaultSeconds)
  const [restRemaining, setRestRemaining] = useState(defaultSeconds)
  const [restRunning, setRestRunning] = useState(false)

  useEffect(() => {
    if (!restRunning) return
    const id = window.setInterval(() => {
      setRestRemaining(prev => {
        if (prev <= 1) {
          setRestRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [restRunning])

  function applyDefault(seconds: number) {
    setRestSeconds(seconds)
    setRestRemaining(seconds)
  }

  function startFromDefault() {
    setRestRemaining(restSeconds)
    setRestRunning(true)
  }

  function start() {
    setRestRunning(true)
  }

  function pause() {
    setRestRunning(false)
  }

  function restart() {
    setRestRemaining(restSeconds)
    setRestRunning(false)
  }

  return {
    restSeconds,
    restRemaining,
    restRunning,
    setRestSeconds,
    setRestRemaining,
    applyDefault,
    startFromDefault,
    start,
    pause,
    restart,
  }
}
