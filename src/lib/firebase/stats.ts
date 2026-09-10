import type { SolveRecord, Stats } from './types'

/** Days between two `YYYY-MM-DD` keys, read as calendar dates. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Fold a finished puzzle into the running totals.
 *
 * Pure, so the same call updates the local view and the copy written to the
 * database, and so the streak rules can be tested without a clock.
 */
export function applySolve(stats: Stats, record: SolveRecord, today: string): Stats {
  const sizeKey = String(record.size)
  const previous = stats.bySize[sizeKey]

  const { current, longest, lastPlayedDate } = stats.streak
  let nextCurrent = current
  if (lastPlayedDate !== today) {
    // A gap of exactly one day continues the run; anything else starts a new one.
    nextCurrent = lastPlayedDate && daysBetween(lastPlayedDate, today) === 1 ? current + 1 : 1
  }

  return {
    solved: stats.solved + 1,
    streak: {
      current: nextCurrent,
      longest: Math.max(longest, nextCurrent),
      lastPlayedDate: today,
    },
    bySize: {
      ...stats.bySize,
      [sizeKey]: {
        solved: (previous?.solved ?? 0) + 1,
        bestMs: previous ? Math.min(previous.bestMs, record.timeMs) : record.timeMs,
      },
    },
  }
}
