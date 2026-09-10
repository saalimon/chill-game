import type { Difficulty } from '@/game/starbattle/difficulty'
import type { Move } from '@/features/session/session'

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

export interface Stats {
  solved: number
  streak: { current: number; longest: number; lastPlayedDate: string | null }
  bySize: Record<string, SizeStat>
}

export const EMPTY_STATS: Stats = {
  solved: 0,
  streak: { current: 0, longest: 0, lastPlayedDate: null },
  bySize: {},
}
