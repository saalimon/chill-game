import { CellState, type Cell, type Grid, type Regions } from './types'

export const key = (cell: Cell): string => `${cell.r},${cell.c}`

export function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array<CellState>(size).fill(CellState.Empty))
}

/** Adjacent in any of the 8 directions. A cell does not touch itself. */
export function touches(a: Cell, b: Cell): boolean {
  if (a.r === b.r && a.c === b.c) return false
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1
}

/** Every placed emoji, in row-major order. Pencil marks are not placements. */
export function placementsOf(grid: Grid): Cell[] {
  const out: Cell[] = []
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c] === CellState.Placed) out.push({ r, c })
    }
  }
  return out
}

/**
 * Whether the board is finished.
 *
 * Every row, column and region must hold exactly `stars` of them, and no two may
 * touch. Counting rather than comparing pairs is what makes this work for both
 * games: Queens wants one per line, Two Not Touch wants two, and "two in a row"
 * is a mistake in one and the goal in the other.
 */
export function isSolved(grid: Grid, regions: Regions, stars = 1): boolean {
  const size = grid.length
  const placed = placementsOf(grid)
  if (placed.length !== size * stars) return false

  const rows = new Array<number>(size).fill(0)
  const columns = new Array<number>(size).fill(0)
  const areas = new Array<number>(size).fill(0)
  for (const { r, c } of placed) {
    rows[r]++
    columns[c]++
    areas[regions[r][c]]++
  }
  for (let i = 0; i < size; i++) {
    if (rows[i] !== stars || columns[i] !== stars || areas[i] !== stars) return false
  }

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (touches(placed[i], placed[j])) return false
    }
  }
  return true
}

/** The three things a board must satisfy, in the order the UI lists them. */
export const RULES = ['line', 'colour', 'touching'] as const
export type Rule = (typeof RULES)[number]
