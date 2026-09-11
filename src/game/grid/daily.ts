import { generate } from './generate'
import { gridGames, type GameId } from '../games'
import type { Puzzle } from './types'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/** The player's local calendar date as `YYYY-MM-DD`. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** FNV-1a over the date key — a stable spread of days across seeds. */
function hash(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface DailySpec {
  date: string
  game: GameId
  seed: number
  size: number
}

/**
 * The board everyone gets on a given day.
 *
 * Derived from the date alone, so no server has to hand it out and it still
 * works offline. Both the game and its size rotate with the day, taken from
 * different parts of the hash so they don't move in lockstep.
 */
export function dailySpec(date: string = dateKey()): DailySpec {
  if (!DATE_KEY.test(date)) {
    throw new Error(`expected a YYYY-MM-DD date key, got "${date}"`)
  }
  const seed = hash(date)
  // Only the grid puzzles for now: a run has no single board to hand out.
  const choices = gridGames()
  const chosen = choices[seed % choices.length]
  const sizes = chosen.sizes
  return { date, game: chosen.id, seed, size: sizes[(seed >>> 8) % sizes.length] }
}

export function dailyPuzzle(date: string = dateKey()): Puzzle {
  const { seed, size, game } = dailySpec(date)
  return generate(seed, size, game)
}
