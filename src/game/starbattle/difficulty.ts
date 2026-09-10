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
const CUTOFFS: Record<number, readonly [number, number]> = {
  5: [25, 35],
  6: [58, 107],
  7: [141, 306],
  8: [338, 923],
  9: [891, 3237],
}

/** How hard a board turned out, judged by how much work the solver needed. */
export function difficultyOf(size: number, nodes: number): Difficulty {
  const cutoffs = CUTOFFS[size]
  if (!cutoffs) return 'medium'
  const [easy, hard] = cutoffs
  if (nodes < easy) return 'easy'
  if (nodes <= hard) return 'medium'
  return 'hard'
}
