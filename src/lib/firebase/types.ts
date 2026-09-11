import type { Difficulty } from '@/game/grid/difficulty'
import type { Move } from '@/features/session/session'
import type { GameId } from '@/game/games'

export type PlayMode = 'free' | 'daily'

/**
 * One finished puzzle.
 *
 * The board itself is never stored — `seed` plus `size` regenerates it exactly,
 * so a full replay is this record's move list and nothing more. `genVersion`
 * records which generator built it, so a future change to generation can't
 * silently turn an old replay into a different puzzle.
 */
export interface SolveRecord {
  id: string
  /** Which puzzle this was. Records written before the second game lack it. */
  game: GameId
  size: number
  seed: number
  genVersion: number
  difficulty: Difficulty
  timeMs: number
  hintsUsed: number
  completedAt: number
  mode: PlayMode
  /** The daily's date key, when this was a daily. */
  date?: string
  moves: Move[]
}

export interface SizeStat {
  solved: number
  bestMs: number
}

/**
 * One finished run.
 *
 * A run has no board and no solve time, so it is recorded separately rather
 * than bent into the puzzle shape. The seed is kept because a run, like a
 * puzzle, replays from it.
 */
export interface RunRecord {
  id: string
  game: GameId
  seed: number
  rounds: number
  won: boolean
  /** The round it ended on — how far the player got. */
  round: number
  deals: number
  totalScored: number
  bestDeal: number
  completedAt: number
}

export interface RunStat {
  played: number
  won: number
  bestScore: number
  furthestRound: number
}

export interface Stats {
  solved: number
  streak: { current: number; longest: number; lastPlayedDate: string | null }
  /** Keyed `<game>:<size>`, so the grid puzzles keep their own best times. */
  bySize: Record<string, SizeStat>
  /** Keyed by game id. Runs have no size to key on. */
  runs: Record<string, RunStat>
}

export const EMPTY_STATS: Stats = {
  solved: 0,
  streak: { current: 0, longest: 0, lastPlayedDate: null },
  bySize: {},
  runs: {},
}
