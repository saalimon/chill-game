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
 * The cells involved in a broken rule. Both sides of a clash are reported, so
 * the board can highlight them together; placements that break nothing are left
 * out even when other cells are in conflict.
 */
export function conflictingCells(grid: Grid, regions: Regions): Set<string> {
  const placed = placementsOf(grid)
  const bad = new Set<string>()
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]
      const b = placed[j]
      const clash =
        a.r === b.r ||
        a.c === b.c ||
        regions[a.r][a.c] === regions[b.r][b.c] ||
        touches(a, b)
      if (clash) {
        bad.add(key(a))
        bad.add(key(b))
      }
    }
  }
  return bad
}

/** Exactly `size` emojis placed, breaking none of the three rules. */
export function isSolved(grid: Grid, regions: Regions): boolean {
  const placed = placementsOf(grid)
  if (placed.length !== grid.length) return false
  return conflictingCells(grid, regions).size === 0
}

/** The three things a board must satisfy, in the order the UI lists them. */
export const RULES = ['line', 'colour', 'touching'] as const
export type Rule = (typeof RULES)[number]
