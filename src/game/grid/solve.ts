import type { Cell, Regions } from './types'

export interface SolveOptions {
  /** Stop after this many solutions. Generation only needs to know "is it 1?". */
  cap?: number
  /** Stars per row, per column and per region. Queens is 1; Two Not Touch is 2. */
  stars?: number
}

export interface SolveResult {
  solutions: Cell[][]
  /** Branches explored — a cheap, useful proxy for how hard the board is. */
  nodes: number
}

/**
 * Exhaustive search for star placements.
 *
 * Every row holds exactly `stars` of them, so the search walks row by row and
 * only has to choose that row's columns. Because each row is exact and the
 * per-column and per-region counts are capped at `stars`, a complete board is
 * forced to be exact everywhere by pigeonhole — there are `size * stars` stars
 * to place across `size` columns that can hold `stars` apiece.
 *
 * Pruning comes from four rules: a column may not be over its quota, nor a
 * region; two stars in one row must sit at least two columns apart; and no star
 * may touch one in the row above. Rows further back cannot touch, being two or
 * more rows away.
 */
export function solve(regions: Regions, options: SolveOptions = {}): SolveResult {
  const cap = options.cap ?? Infinity
  const stars = options.stars ?? 1
  const size = regions.length

  /**
   * How many cells each region still has available from row `r` downward.
   *
   * A region that needs two more stars but has only one cell left in the rows
   * ahead is already lost, and without this the search discovers that only after
   * exploring every arrangement below it. Cheap to precompute, and it prunes
   * hard on the two-star game where regions are large.
   */
  const availableFrom: number[][] = Array.from({ length: size + 1 }, () =>
    new Array<number>(size).fill(0),
  )
  for (let r = size - 1; r >= 0; r--) {
    for (let i = 0; i < size; i++) availableFrom[r][i] = availableFrom[r + 1][i]
    for (let c = 0; c < size; c++) availableFrom[r][regions[r][c]]++
  }

  const solutions: Cell[][] = []
  const colCount = new Array<number>(size).fill(0)
  const regionCount = new Array<number>(size).fill(0)
  const chosen: Cell[] = []
  /** Columns used by the row above, for the no-touching rule. */
  let previousRow: number[] = []
  let nodes = 0

  function stillReachable(row: number): boolean {
    const rowsLeft = size - row
    for (let i = 0; i < size; i++) {
      // A column takes at most one star per row, so it needs at least as many
      // rows left as it still has quota.
      if (stars - colCount[i] > rowsLeft) return false
      if (stars - regionCount[i] > availableFrom[row][i]) return false
    }
    return true
  }

  function walk(r: number): void {
    if (solutions.length >= cap) return
    if (r === size) {
      solutions.push(chosen.map((cell) => ({ ...cell })))
      return
    }
    if (!stillReachable(r)) return

    const above = previousRow
    const thisRow: number[] = []

    /** Choose this row's columns, left to right, keeping them two apart. */
    function pick(from: number): void {
      if (solutions.length >= cap) return

      if (thisRow.length === stars) {
        const parent = previousRow
        previousRow = [...thisRow]
        walk(r + 1)
        previousRow = parent
        return
      }
      // Not enough columns left to finish the row.
      const needed = stars - thisRow.length
      for (let c = from; c + (needed - 1) * 2 < size; c++) {
        if (colCount[c] >= stars) continue
        const region = regions[r][c]
        if (regionCount[region] >= stars) continue
        if (above.some((prev) => Math.abs(prev - c) <= 1)) continue

        nodes++
        colCount[c]++
        regionCount[region]++
        thisRow.push(c)
        chosen.push({ r, c })

        // The next star in this row must clear this one by two columns.
        pick(c + 2)

        chosen.pop()
        thisRow.pop()
        regionCount[region]--
        colCount[c]--
        if (solutions.length >= cap) return
      }
    }

    pick(0)
  }

  walk(0)
  return { solutions, nodes }
}

/** Convenience for generation: how many solutions, up to `cap`. */
export function countSolutions(
  regions: Regions,
  cap = 2,
  stars = 1,
): { count: number; nodes: number } {
  const { solutions, nodes } = solve(regions, { cap, stars })
  return { count: solutions.length, nodes }
}
