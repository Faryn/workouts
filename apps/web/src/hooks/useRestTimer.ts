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
  const restEndsAtRef = useRef<number | null>(null)
  const countdownMarksPlayedRef = useRef<Set<number>>(new Set())
  const finishedCuePlayedRef = useRef(false)

  function getAudioContext() {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = audioCtxRef.current ?? new Ctx()
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  function primeAudio() {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.connect(ctx.destination)
      gain.disconnect()
    } catch {
      // ignore unsupported device audio
    }
  }

  function playToneSequence(tones: Array<{ freq: number; duration: number; delay: number; gain?: number }>) {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      tones.forEach(tone => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = tone.freq
        gain.gain.setValueAtTime(0.0001, now + tone.delay)
        gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.14, now + tone.delay + 0.02)
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
        { freq: 880, duration: 0.18, delay: 0, gain: 0.14 },
        { freq: 1174, duration: 0.18, delay: 0.24, gain: 0.14 },
        { freq: 1568, duration: 0.28, delay: 0.48, gain: 0.16 },
      ])
    } catch {
      // ignore unsupported device audio/haptics
    }
  }

  useEffect(() => {
    function unlockAudio() {
      primeAudio()
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  useEffect(() => {
    if (!restRunning) return

    function updateFromDeadline() {
      const endsAt = restEndsAtRef.current
      if (!endsAt) return

      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRestRemaining(remaining)

      if (remaining <= 3 && remaining >= 1 && !countdownMarksPlayedRef.current.has(remaining)) {
        countdownMarksPlayedRef.current.add(remaining)
        setCountdownMark(remaining)
        playToneSequence([{ freq: remaining === 1 ? 988 : 784, duration: 0.14, delay: 0, gain: 0.13 }])
        try {
          if (navigator.vibrate) navigator.vibrate(70)
        } catch {
          // ignore unsupported haptics
        }
      }

      if (remaining === 0) {
        if (!finishedCuePlayedRef.current) {
          finishedCuePlayedRef.current = true
          setCountdownMark(1)
          setRestFinishedAt(Date.now())
          playCompletionCue()
        }
        setRestRunning(false)
        restEndsAtRef.current = null
      }
    }

    updateFromDeadline()
    const intervalId = window.setInterval(updateFromDeadline, 250)
    window.addEventListener('visibilitychange', updateFromDeadline)
    window.addEventListener('focus', updateFromDeadline)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('visibilitychange', updateFromDeadline)
      window.removeEventListener('focus', updateFromDeadline)
    }
  }, [restRunning])

  function clearFinishedCue() {
    setRestFinishedAt(null)
    setCountdownMark(null)
  }

  function resetCueState() {
    clearFinishedCue()
    countdownMarksPlayedRef.current = new Set()
    finishedCuePlayedRef.current = false
  }

  function applyDefault(seconds: number) {
    setRestSeconds(seconds)
    setRestRemaining(seconds)
    restEndsAtRef.current = null
    setRestRunning(false)
    resetCueState()
  }

  function begin(seconds: number) {
    if (seconds <= 0) return
    primeAudio()
    restEndsAtRef.current = Date.now() + seconds * 1000
    setRestRemaining(seconds)
    setRestRunning(true)
    resetCueState()
  }

  function remainingFromDeadline() {
    const endsAt = restEndsAtRef.current
    if (!endsAt) return restRemaining
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
  }

  function startFromDefault() {
    begin(restSeconds)
  }

  function start() {
    begin(remainingFromDeadline())
  }

  function pause() {
    const remaining = remainingFromDeadline()
    restEndsAtRef.current = null
    setRestRemaining(remaining)
    setRestRunning(false)
  }

  function restart() {
    setRestRemaining(restSeconds)
    restEndsAtRef.current = null
    setRestRunning(false)
    resetCueState()
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
