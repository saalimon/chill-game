import type { GameId } from './games'
import type { Token } from './tokens'

/** A coordinate on the board. */
export interface Cell {
  r: number
  c: number
}

/** What the player has put in a square. */
export const CellState = {
  /** Untouched. */
  Empty: 0,
  /** Pencil mark — "the emoji definitely isn't here". */
  Marked: 1,
  /** The emoji. */
  Placed: 2,
  /** A guess that turned out to be wrong. Costs a life, and stays on the board. */
  Wrong: 3,
} as const
export type CellState = (typeof CellState)[keyof typeof CellState]

/** The player's board, `grid[row][col]`. */
export type Grid = CellState[][]

/** Region (colour) id per square, `regions[row][col]`, ids `0..size-1`. */
export type Regions = number[][]

/**
 * Bumped whenever a change to generation would produce a different board for
 * the same seed. Stored alongside every solve so old replays stay replayable.
 *
 * v2 swapped emoji for drawn doodles. The token is taken from the rng after the
 * regions and solution are settled, so a v1 replay still reproduces the same
 * board — only the symbol on it changed.
 */
export const GEN_VERSION = 2

export interface Puzzle {
  game: GameId
  size: number
  /** Stars per row, column and region. */
  stars: number
  seed: number
  genVersion: number
  regions: Regions
  solution: Cell[]
  token: Token
  /** Solver branches explored — the difficulty signal. */
  nodes: number
}
