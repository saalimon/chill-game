import type { RunRecord, SolveRecord, Stats } from './types'

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
/** The streak rule, shared by everything that counts as having played today. */
function nextStreak(stats: Stats, today: string): Stats['streak'] {
  const { current, longest, lastPlayedDate } = stats.streak
  if (lastPlayedDate === today) return stats.streak
  // A gap of exactly one day continues the run; anything else starts a new one.
  const next = lastPlayedDate && daysBetween(lastPlayedDate, today) === 1 ? current + 1 : 1
  return { current: next, longest: Math.max(longest, next), lastPlayedDate: today }
}

export function applySolve(stats: Stats, record: SolveRecord, today: string): Stats {
  // Keyed by game as well as size: an 8x8 Queens and an 8x8 Two Not Touch are
  // not the same achievement and should not share a best time.
  const sizeKey = `${record.game ?? 'queens'}:${record.size}`
  const previous = stats.bySize[sizeKey]

  return {
    ...stats,
    solved: stats.solved + 1,
    streak: nextStreak(stats, today),
    bySize: {
      ...stats.bySize,
      [sizeKey]: {
        solved: (previous?.solved ?? 0) + 1,
        bestMs: previous ? Math.min(previous.bestMs, record.timeMs) : record.timeMs,
      },
    },
  }
}

/**
 * Fold a finished run into the running totals.
 *
 * Runs keep their own record: there is no board size to key on and no solve
 * time to beat, only how far you got and how much you banked. The daily streak
 * is shared, because playing anything should count as having played.
 */
export function applyRun(stats: Stats, record: RunRecord, today: string): Stats {
  const previous = stats.runs[record.game]
  return {
    ...stats,
    streak: nextStreak(stats, today),
    runs: {
      ...stats.runs,
      [record.game]: {
        played: (previous?.played ?? 0) + 1,
        won: (previous?.won ?? 0) + (record.won ? 1 : 0),
        bestScore: Math.max(previous?.bestScore ?? 0, record.totalScored),
        furthestRound: Math.max(previous?.furthestRound ?? 0, record.round),
      },
    },
  }
}
