import { describe, expect, it } from 'vitest'
import type { Cell, Regions } from './types'
import { solve } from './solve'
import { touches } from './rules'

/** A board split into column stripes — every column its own region. */
const stripes = (n: number): Regions =>
  Array.from({ length: n }, () => Array.from({ length: n }, (_, c) => c))

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

describe('solve with two stars per line', () => {
  it('finds nothing on a board too small to hold them', () => {
    // Two stars per row need columns two apart, so a 3-wide row can hold at
    // most two — but then every row is forced into the same two columns.
    const tiny: Regions = [
      [0, 0, 1],
      [0, 1, 1],
      [2, 2, 2],
    ]
    expect(solve(tiny, { stars: 2 }).solutions).toEqual([])
  })

  it('puts two stars in every row', () => {
    const regions = stripes(10)
    for (const s of solve(regions, { stars: 2, cap: 3 }).solutions) {
      const perRow = new Map<number, number>()
      for (const cell of s) perRow.set(cell.r, (perRow.get(cell.r) ?? 0) + 1)
      expect([...perRow.values()]).toEqual(Array(10).fill(2))
    }
  })

  it('puts two stars in every column', () => {
    for (const s of solve(stripes(10), { stars: 2, cap: 3 }).solutions) {
      const perCol = new Map<number, number>()
      for (const cell of s) perCol.set(cell.c, (perCol.get(cell.c) ?? 0) + 1)
      expect([...perCol.values()].sort()).toEqual(Array(10).fill(2))
    }
  })

  it('puts two stars in every region', () => {
    const regions = stripes(10)
    for (const s of solve(regions, { stars: 2, cap: 3 }).solutions) {
      const perRegion = new Map<number, number>()
      for (const cell of s) {
        const id = regions[cell.r][cell.c]
        perRegion.set(id, (perRegion.get(id) ?? 0) + 1)
      }
      expect([...perRegion.values()]).toEqual(Array(10).fill(2))
    }
  })

  it('never lets two stars touch, including the pair inside one row', () => {
    for (const s of solve(stripes(10), { stars: 2, cap: 3 }).solutions) {
      for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j < s.length; j++) {
          expect(touches(s[i], s[j])).toBe(false)
        }
      }
    }
  })

  it('still solves the one-star game exactly as before', () => {
    expect(solve(FIVE, { stars: 1 })).toEqual(solve(FIVE))
  })

  it('honours the cap', () => {
    expect(solve(stripes(10), { stars: 2, cap: 2 }).solutions.length).toBe(2)
  })
})
