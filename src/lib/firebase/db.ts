import { get, ref, set, update } from 'firebase/database'
import { database } from './app'
import { applySolve } from './stats'
import { EMPTY_STATS, type SolveRecord, type Stats } from './types'

const LOCAL_STATS_KEY = 'chilled:stats:v1'

/**
 * Stats kept on the device.
 *
 * Used when the build has no Firebase config, and as the copy the home screen
 * reads instantly on load — the database is the record of truth, this is what
 * makes the numbers appear without waiting for a round trip.
 */
export function readLocalStats(): Stats {
  try {
    const raw = localStorage.getItem(LOCAL_STATS_KEY)
    return raw ? { ...EMPTY_STATS, ...JSON.parse(raw) } : EMPTY_STATS
  } catch {
    return EMPTY_STATS
  }
}

export function writeLocalStats(stats: Stats): void {
  try {
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats))
  } catch {
    // Storage unavailable; the database copy still holds.
  }
}

export async function fetchStats(uid: string): Promise<Stats | null> {
  if (!database) return null
  const snapshot = await get(ref(database, `users/${uid}/stats`))
  return snapshot.exists() ? { ...EMPTY_STATS, ...snapshot.val() } : EMPTY_STATS
}

/**
 * Write one finished puzzle.
 *
 * The summary and the replay go to sibling subtrees, never nested. The Realtime
 * Database hands back whole subtrees, so keeping moves inside `solves` would
 * make "show my history" download every move the player has ever made.
 */
export async function pushSolve(uid: string, record: SolveRecord, today: string): Promise<void> {
  if (!database) throw new Error('database unavailable')

  const { moves, ...summary } = record
  const stats = applySolve((await fetchStats(uid)) ?? EMPTY_STATS, record, today)

  const writes: Record<string, unknown> = {
    [`users/${uid}/solves/${record.id}`]: summary,
    [`users/${uid}/replays/${record.id}`]: {
      seed: record.seed,
      size: record.size,
      genVersion: record.genVersion,
      moves,
    },
    [`users/${uid}/stats`]: stats,
  }
  if (record.mode === 'daily' && record.date) {
    writes[`dailyResults/${record.date}/${uid}`] = {
      timeMs: record.timeMs,
      hintsUsed: record.hintsUsed,
      completedAt: record.completedAt,
    }
  }

  await update(ref(database), writes)
  writeLocalStats(stats)
}

export async function saveProfile(
  uid: string,
  profile: { displayName: string | null; isAnonymous: boolean },
): Promise<void> {
  if (!database) return
  await set(ref(database, `users/${uid}/profile`), {
    displayName: profile.displayName,
    isAnonymous: profile.isAnonymous,
    updatedAt: Date.now(),
  })
}
