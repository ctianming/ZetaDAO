// XP level configuration and helpers
//
// Configure thresholds via env: NEXT_PUBLIC_XP_LEVEL_THRESHOLDS
// - CSV example: "0,100,300,600,1000,INF"
// - JSON example: "[0,100,300,600,1000,\"INF\"]"
// Notes:
// - Must be ascending and contain at least two entries
// - Last value can be INF/Infinity to denote open-ended top level

export type Threshold = number | typeof Infinity
export const DEFAULT_THRESHOLDS: Threshold[] = [0, 100, 300, 600, 1000, Infinity]

function normalizeInfinityToken(v: any): Threshold | null {
  if (v === Infinity) return Infinity
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'inf' || s === 'infinity' || s === '+inf' || s === '+infinity') return Infinity
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  return null
}

function parseThresholdsFromEnv(raw?: string | undefined): Threshold[] | null {
  if (!raw) return null
  try {
    // try JSON first
    const maybe = JSON.parse(raw)
    if (Array.isArray(maybe)) {
      const arr: Threshold[] = []
      for (const it of maybe) {
        const val = normalizeInfinityToken(it)
        if (val === null) return null
        arr.push(val)
      }
      return arr
    }
  } catch {
    // not JSON; fall through to CSV
  }
  // CSV fallback
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!parts.length) return null
  const arr: Threshold[] = []
  for (const p of parts) {
    const val = normalizeInfinityToken(p)
    if (val === null) return null
    arr.push(val)
  }
  return arr
}

function isValidAscending(arr: Threshold[]): boolean {
  if (!Array.isArray(arr) || arr.length < 2) return false
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1]
    const cur = arr[i]
    const prevNum = prev === Infinity ? Number.POSITIVE_INFINITY : prev
    const curNum = cur === Infinity ? Number.POSITIVE_INFINITY : cur
    if (!(prevNum <= curNum)) return false
  }
  return true
}

let CACHED_THRESHOLDS: Threshold[] | null = null

export function getLevelThresholds(): Threshold[] {
  if (CACHED_THRESHOLDS) return CACHED_THRESHOLDS
  const raw = process.env.NEXT_PUBLIC_XP_LEVEL_THRESHOLDS
  const parsed = parseThresholdsFromEnv(raw)
  if (parsed && isValidAscending(parsed)) {
    CACHED_THRESHOLDS = parsed
  } else {
    CACHED_THRESHOLDS = DEFAULT_THRESHOLDS
  }
  return CACHED_THRESHOLDS
}

export type LevelInfo = {
  level: number
  nextLevelAt: number | typeof Infinity
  progressPct: number
  base: number
  cap: number | typeof Infinity
}

export function computeLevel(xpTotal = 0, thresholds: Threshold[] = getLevelThresholds()): LevelInfo {
  let lvl = 1
  for (let i = 1; i < thresholds.length; i++) {
    const t = thresholds[i]
    const bound = t === Infinity ? Number.POSITIVE_INFINITY : t
    if (xpTotal >= bound) lvl = i + 1
  }
  const idx = Math.min(lvl - 1, thresholds.length - 2)
  const base = thresholds[idx] === Infinity ? Number.POSITIVE_INFINITY : (thresholds[idx] as number)
  const cap = thresholds[idx + 1]
  const capNum = cap === Infinity ? Number.POSITIVE_INFINITY : (cap as number)
  const progressPct = cap === Infinity ? 100 : Math.min(100, Math.round(((xpTotal - base) / (capNum - base)) * 100))
  return { level: lvl, nextLevelAt: cap, progressPct, base, cap }
}
