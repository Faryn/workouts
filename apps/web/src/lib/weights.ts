export const DUMBBELL_WEIGHTS_KG = [2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 16, 18, 20, 23, 24] as const

export function formatWeight(value: number) {
  return String(value).replace(/\.0$/, '')
}

export function floorToDumbbellWeight(value: number) {
  if (!Number.isFinite(value)) return null

  let best: number = DUMBBELL_WEIGHTS_KG[0]
  for (const weight of DUMBBELL_WEIGHTS_KG) {
    if (weight > value) break
    best = weight
  }
  return best
}

export function normalizeDumbbellWeightInput(value: string) {
  if (value.trim() === '') return ''
  const normalized = floorToDumbbellWeight(Number(value))
  return normalized == null ? '' : formatWeight(normalized)
}

export function nextDumbbellWeight(value: string, direction: -1 | 1) {
  if (value.trim() === '') {
    return direction > 0 ? formatWeight(DUMBBELL_WEIGHTS_KG[0]) : ''
  }

  const current = Number(value)
  if (!Number.isFinite(current)) return formatWeight(DUMBBELL_WEIGHTS_KG[0])

  const floored = floorToDumbbellWeight(current) ?? DUMBBELL_WEIGHTS_KG[0]
  const idx = DUMBBELL_WEIGHTS_KG.findIndex(weight => weight === floored)
  const nextIdx = Math.min(DUMBBELL_WEIGHTS_KG.length - 1, Math.max(0, idx + direction))
  return formatWeight(DUMBBELL_WEIGHTS_KG[nextIdx])
}

export function toDumbbellWeightOrNull(value: string) {
  const normalized = normalizeDumbbellWeightInput(value)
  return normalized === '' ? null : Number(normalized)
}
