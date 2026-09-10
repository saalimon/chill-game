import { describe, expect, it } from 'vitest'
import { CellState, type Regions } from './types'
import { conflictingCells, emptyGrid, isSolved, placementsOf, touches } from './rules'

/**
 * A hand-built, valid 5x5 board.
 *
 *   region ids            solution (*)
 *   0 0 1 1 2             * . . . .
 *   0 0 1 1 2             . . * . .
 *   0 3 3 1 2             . . . . *
 *   3 3 3 4 2             . * . . .
 *   3 3 4 4 4             . . . * .
 */
const REGIONS: Regions = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 1, 2],
  [0, 3, 3, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
]
const SOLUTION = [
  { r: 0, c: 0 },
  { r: 1, c: 2 },
  { r: 2, c: 4 },
  { r: 3, c: 1 },
  { r: 4, c: 3 },
]

function gridWith(cells: { r: number; c: number }[], size = 5) {
  const g = emptyGrid(size)
  for (const { r, c } of cells) g[r][c] = CellState.Placed
  return g
}

describe('touches', () => {
  it('is true for orthogonal neighbours', () => {
    expect(touches({ r: 2, c: 2 }, { r: 2, c: 3 })).toBe(true)
    expect(touches({ r: 2, c: 2 }, { r: 1, c: 2 })).toBe(true)
  })

  it('is true for diagonal neighbours', () => {
    expect(touches({ r: 2, c: 2 }, { r: 1, c: 1 })).toBe(true)
    expect(touches({ r: 2, c: 2 }, { r: 3, c: 3 })).toBe(true)
  })

  it('is false for cells two apart', () => {
    expect(touches({ r: 2, c: 2 }, { r: 2, c: 4 })).toBe(false)
    expect(touches({ r: 2, c: 2 }, { r: 4, c: 4 })).toBe(false)
  })

  it('is false for a cell against itself', () => {
    expect(touches({ r: 2, c: 2 }, { r: 2, c: 2 })).toBe(false)
  })
})

describe('placementsOf', () => {
  it('finds only Placed cells, ignoring pencil marks', () => {
    const g = emptyGrid(5)
    g[0][0] = CellState.Placed
    g[1][1] = CellState.Marked
    g[4][4] = CellState.Placed
    expect(placementsOf(g)).toEqual([
      { r: 0, c: 0 },
      { r: 4, c: 4 },
    ])
  })
})

describe('isSolved', () => {
  it('accepts the correct solution', () => {
    expect(isSolved(gridWith(SOLUTION), REGIONS)).toBe(true)
  })

  it('rejects an incomplete board', () => {
    expect(isSolved(gridWith(SOLUTION.slice(0, 4)), REGIONS)).toBe(false)
  })

  it('rejects a board with the right count but a repeated column', () => {
    const bad = [
      { r: 0, c: 0 },
      { r: 1, c: 2 },
      { r: 2, c: 4 },
      { r: 3, c: 0 },
      { r: 4, c: 3 },
    ]
    expect(isSolved(gridWith(bad), REGIONS)).toBe(false)
  })

  it('ignores pencil marks when deciding whether the board is solved', () => {
    const g = gridWith(SOLUTION)
    g[0][3] = CellState.Marked
    expect(isSolved(g, REGIONS)).toBe(true)
  })
})

describe('conflictingCells', () => {
  it('reports nothing for the correct solution', () => {
    expect(conflictingCells(gridWith(SOLUTION), REGIONS).size).toBe(0)
  })

  it('reports nothing for a partial board that breaks no rule', () => {
    const g = gridWith([{ r: 0, c: 0 }])
    expect(conflictingCells(g, REGIONS).size).toBe(0)
  })

  it('flags both cells sharing a row', () => {
    const g = gridWith([
      { r: 0, c: 0 },
      { r: 0, c: 2 },
    ])
    expect(conflictingCells(g, REGIONS)).toEqual(new Set(['0,0', '0,2']))
  })

  it('flags both cells sharing a column', () => {
    const g = gridWith([
      { r: 0, c: 0 },
      { r: 2, c: 0 },
    ])
    expect(conflictingCells(g, REGIONS)).toEqual(new Set(['0,0', '2,0']))
  })

  it('flags both cells sharing a region', () => {
    // (0,0) and (1,1) are both region 0 — but they also touch, so use (0,0) and (2,0).
    // (2,0) is region 0 and shares column 0, so pick a region-only clash:
    // (0,2) and (2,3) are both region 1, different row, different column, not touching.
    const g = gridWith([
      { r: 0, c: 2 },
      { r: 2, c: 3 },
    ])
    expect(conflictingCells(g, REGIONS)).toEqual(new Set(['0,2', '2,3']))
  })

  it('flags both cells when they touch diagonally', () => {
    // (0,0) region 0, (1,1) region 0 — touching AND same region.
    const g = gridWith([
      { r: 0, c: 0 },
      { r: 1, c: 1 },
    ])
    expect(conflictingCells(g, REGIONS)).toEqual(new Set(['0,0', '1,1']))
  })

  it('leaves an innocent third placement out of the report', () => {
    const g = gridWith([
      { r: 0, c: 0 },
      { r: 0, c: 2 },
      { r: 4, c: 3 },
    ])
    expect(conflictingCells(g, REGIONS)).toEqual(new Set(['0,0', '0,2']))
  })
})
