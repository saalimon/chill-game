import { describe, expect, it } from 'vitest'
import type { Cell, Regions } from './types'
import { solve } from './solve'

const FIVE: Regions = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 1, 2],
  [0, 3, 3, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
]
const FIVE_SOLUTION: Cell[] = [
  { r: 0, c: 0 },
  { r: 1, c: 2 },
  { r: 2, c: 4 },
  { r: 3, c: 1 },
  { r: 4, c: 3 },
]

describe('solve', () => {
  it('finds the single placement on a 1x1 board', () => {
    expect(solve([[0]]).solutions).toEqual([[{ r: 0, c: 0 }]])
  })

  it('finds nothing on a 2x2 board, where every pair of cells touches', () => {
    expect(solve([
      [0, 0],
      [1, 1],
    ]).solutions).toEqual([])
  })

  it('finds nothing when two regions are stacked in touching rows', () => {
    // Region 0 owns row 0, region 1 owns row 1: their stars are forced into
    // adjacent rows and no column pair is far enough apart on a 2-wide board.
    expect(solve([
      [0, 0],
      [1, 1],
    ]).solutions.length).toBe(0)
  })

  it('finds the known solution of the 5x5 fixture', () => {
    const { solutions } = solve(FIVE)
    expect(solutions).toContainEqual(FIVE_SOLUTION)
  })

  it('returns solutions with one cell per row, in row order', () => {
    for (const s of solve(FIVE).solutions) {
      expect(s.map((cell) => cell.r)).toEqual([0, 1, 2, 3, 4])
    }
  })

  it('stops once it has found `cap` solutions', () => {
    // A board split into 5 column-stripes has many solutions; the cap must bite.
    const stripes: Regions = Array.from({ length: 5 }, () => [0, 1, 2, 3, 4])
    expect(solve(stripes, { cap: 2 }).solutions.length).toBe(2)
    expect(solve(stripes, { cap: 1 }).solutions.length).toBe(1)
  })

  it('counts the branches it explored', () => {
    expect(solve(FIVE).nodes).toBeGreaterThan(0)
  })

  it('is deterministic — same regions, same result', () => {
    expect(solve(FIVE)).toEqual(solve(FIVE))
  })
})
