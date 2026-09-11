import type { GameId } from './games'

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/**
 * Branch-count cutoffs per board size, `[easy/medium, medium/hard]`.
 *
 * Taken from the quartiles of 300 generated boards per size: a board in the
 * bottom quarter of solver work reads as easy, the top quarter as hard. The
 * numbers grow steeply with size, which is why a fixed cutoff would be useless —
 * 400 branches is a hard 7x7 and an easy 9x9.
 */
const CUTOFFS: Record<GameId, Record<number, readonly [number, number]>> = {
  queens: {
    5: [25, 35],
    6: [58, 107],
    7: [141, 306],
    8: [338, 923],
    9: [891, 3237],
  },
  // Two stars per line makes the solver work far harder at the same size, so
  // the two games cannot share a table: 400 branches is a hard 7x7 Queens and an
  // easy 8x8 Two Not Touch.
  twoNotTouch: {
    8: [310, 419],
    9: [2319, 4010],
    10: [9838, 33115],
  },
}

/** How hard a board turned out, judged by how much work the solver needed. */
export function difficultyOf(size: number, nodes: number, game: GameId = 'queens'): Difficulty {
  const cutoffs = CUTOFFS[game]?.[size]
  if (!cutoffs) return 'medium'
  const [easy, hard] = cutoffs
  if (nodes < easy) return 'easy'
  if (nodes <= hard) return 'medium'
  return 'hard'
}
