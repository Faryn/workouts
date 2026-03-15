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
  const [countdownMark, setCountdownMark] = useState<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  function playToneSequence(tones: Array<{ freq: number; duration: number; delay: number; gain?: number }>) {
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = audioCtxRef.current ?? new Ctx()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') void ctx.resume()
      const now = ctx.currentTime
      tones.forEach(tone => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = tone.freq
        gain.gain.setValueAtTime(0.0001, now + tone.delay)
        gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.05, now + tone.delay + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.delay + tone.duration)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + tone.delay)
        osc.stop(now + tone.delay + tone.duration + 0.02)
      })
    } catch {
      // ignore unsupported device audio
    }
  }

  function playCompletionCue() {
    try {
      if (navigator.vibrate) navigator.vibrate([160, 60, 160, 60, 220])
      playToneSequence([
        { freq: 880, duration: 0.16, delay: 0, gain: 0.05 },
        { freq: 1174, duration: 0.16, delay: 0.22, gain: 0.05 },
        { freq: 1568, duration: 0.22, delay: 0.44, gain: 0.06 },
      ])
    } catch {
      // ignore unsupported device audio/haptics
    }
  }

  useEffect(() => {
    if (!restRunning) return
    const id = window.setInterval(() => {
      setRestRemaining(prev => {
        if (prev <= 1) {
          setCountdownMark(1)
          setRestRunning(false)
          setRestFinishedAt(Date.now())
          playCompletionCue()
          return 0
        }
        const next = prev - 1
        if (next <= 3 && next >= 1) {
          setCountdownMark(next)
          playToneSequence([{ freq: next === 1 ? 880 : 740, duration: 0.12, delay: 0, gain: 0.045 }])
          try {
            if (navigator.vibrate) navigator.vibrate(60)
          } catch {
            // ignore unsupported haptics
          }
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [restRunning])

  function clearFinishedCue() {
    setRestFinishedAt(null)
    setCountdownMark(null)
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
    countdownMark,
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
