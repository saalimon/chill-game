import type { Cell, Regions } from './types'

export interface SolveOptions {
  /** Stop after this many solutions. Generation only needs to know "is it 1?". */
  cap?: number
}

export interface SolveResult {
  solutions: Cell[][]
  /** Branches explored — a cheap, useful proxy for how hard the board is. */
  nodes: number
}

/**
 * Exhaustive search for Star Battle (1 star) solutions.
 *
 * Exactly one emoji per row, so the search walks row by row and only has to
 * choose a column. Three constraints prune it: the column must be unused, the
 * region must be unused, and the cell must not touch the previous row's
 * placement (rows further back can't touch, being two or more rows away).
 */
export function solve(regions: Regions, options: SolveOptions = {}): SolveResult {
  const cap = options.cap ?? Infinity
  const size = regions.length
  const solutions: Cell[][] = []
  const usedCol = new Array<boolean>(size).fill(false)
  const usedRegion = new Array<boolean>(size).fill(false)
  const chosen: Cell[] = []
  let nodes = 0

  function walk(r: number): void {
    if (solutions.length >= cap) return
    if (r === size) {
      solutions.push(chosen.map((cell) => ({ ...cell })))
      return
    }
    const prevCol = r > 0 ? chosen[r - 1].c : -2
    for (let c = 0; c < size; c++) {
      if (usedCol[c]) continue
      const region = regions[r][c]
      if (usedRegion[region]) continue
      if (Math.abs(c - prevCol) <= 1) continue
      nodes++
      usedCol[c] = true
      usedRegion[region] = true
      chosen.push({ r, c })
      walk(r + 1)
      chosen.pop()
      usedRegion[region] = false
      usedCol[c] = false
      if (solutions.length >= cap) return
    }
  }

  walk(0)
  return { solutions, nodes }
}

/** Convenience for generation: how many solutions, up to `cap`. */
export function countSolutions(regions: Regions, cap = 2): { count: number; nodes: number } {
  const { solutions, nodes } = solve(regions, { cap })
  return { count: solutions.length, nodes }
}
