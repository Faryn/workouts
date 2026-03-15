import { useEffect, useRef, useState } from 'react'

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
  const [restFinishedAt, setRestFinishedAt] = useState<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  function playCompletionCue() {
    try {
      if (navigator.vibrate) navigator.vibrate([160, 60, 160, 60, 220])
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = audioCtxRef.current ?? new Ctx()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') void ctx.resume()
      const now = ctx.currentTime
      const notes = [880, 1174, 1568]
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, now + index * 0.22)
        gain.gain.exponentialRampToValueAtTime(0.06, now + index * 0.22 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.22 + 0.18)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + index * 0.22)
        osc.stop(now + index * 0.22 + 0.2)
      })
    } catch {
      // ignore unsupported device audio/haptics
    }
  }

  useEffect(() => {
    if (!restRunning) return
    const id = window.setInterval(() => {
      setRestRemaining(prev => {
        if (prev <= 1) {
          setRestRunning(false)
          setRestFinishedAt(Date.now())
          playCompletionCue()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [restRunning])

  function clearFinishedCue() {
    setRestFinishedAt(null)
  }

  function applyDefault(seconds: number) {
    setRestSeconds(seconds)
    setRestRemaining(seconds)
    clearFinishedCue()
  }

  function startFromDefault() {
    setRestRemaining(restSeconds)
    setRestRunning(true)
    clearFinishedCue()
  }

  function start() {
    setRestRunning(true)
    clearFinishedCue()
  }

  function pause() {
    setRestRunning(false)
  }

  function restart() {
    setRestRemaining(restSeconds)
    setRestRunning(false)
    clearFinishedCue()
  }

  return {
    restSeconds,
    restRemaining,
    restRunning,
    restFinishedAt,
    setRestSeconds,
    setRestRemaining,
    applyDefault,
    startFromDefault,
    start,
    pause,
    restart,
    clearFinishedCue,
  }
}
