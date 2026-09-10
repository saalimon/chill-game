import type { SolveRecord } from './types'

export const OUTBOX_KEY = 'chilled:outbox:v1'

/** Past this, the oldest solves are dropped rather than filling up storage. */
const LIMIT = 50

/**
 * Solves waiting to reach the database.
 *
 * The Realtime Database web SDK queues writes in memory only — close the tab
 * while offline and they are gone. Puzzles are generated locally, so the game
 * works fine on a plane; this is what stops those solves being lost before the
 * connection comes back.
 */
function read(): SolveRecord[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Corrupted or unavailable storage: start over rather than break the game.
    return []
  }
}

function write(records: SolveRecord[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(records))
  } catch {
    // Private mode or a full quota. Losing the queue is survivable; crashing
    // right after the player finished a puzzle is not.
  }
}

export function pending(): SolveRecord[] {
  return read()
}

export function enqueue(record: SolveRecord): void {
  const records = read()
  if (records.some((r) => r.id === record.id)) return
  records.push(record)
  write(records.slice(-LIMIT))
}

export function clear(): void {
  write([])
}

/**
 * Try to send everything queued, oldest first.
 *
 * Anything that fails stays queued for the next attempt, so a connection that
 * drops halfway through doesn't lose the rest.
 */
export async function flush(
  send: (record: SolveRecord) => Promise<void>,
): Promise<{ sent: number; kept: number }> {
  const records = read()
  if (records.length === 0) return { sent: 0, kept: 0 }

  const kept: SolveRecord[] = []
  let sent = 0
  for (const record of records) {
    try {
      await send(record)
      sent++
    } catch {
      kept.push(record)
    }
  }
  write(kept)
  return { sent, kept: kept.length }
}
