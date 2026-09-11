import { describe, expect, it } from 'vitest'
import { CellState, type Regions } from './types'
import { generate } from './generate'
import { emptyGrid, isSolved, placementsOf, touches } from './rules'

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

describe('isSolved with two stars per line', () => {
  // Hand-building a valid two-star board is exactly the kind of fixture that
  // ends up subtly wrong, so take a real one from the generator.
  const puzzle = generate(2026, 8, 'twoNotTouch')

  const gridOf = (cells: { r: number; c: number }[], size: number) => {
    const g = emptyGrid(size)
    for (const { r, c } of cells) g[r][c] = CellState.Placed
    return g
  }

  it('accepts the answer', () => {
    expect(isSolved(gridOf(puzzle.solution, 8), puzzle.regions, 2)).toBe(true)
  })

  it('rejects that same answer when judged as a one-star board', () => {
    expect(isSolved(gridOf(puzzle.solution, 8), puzzle.regions, 1)).toBe(false)
  })

  it('rejects a board that is not yet full', () => {
    const short = puzzle.solution.slice(0, -1)
    expect(isSolved(gridOf(short, 8), puzzle.regions, 2)).toBe(false)
  })

  it('rejects the right number of stars piled into the wrong rows', () => {
    const piled = [
      { r: 0, c: 0 },
      { r: 0, c: 2 },
      { r: 0, c: 4 },
      { r: 0, c: 6 },
    ]
    expect(isSolved(gridOf(piled, 8), puzzle.regions, 2)).toBe(false)
  })

  it('rejects two stars that touch inside one row', () => {
    const touching = puzzle.solution.filter((c) => c.r !== 0)
    touching.push({ r: 0, c: 0 }, { r: 0, c: 1 })
    expect(isSolved(gridOf(touching, 8), puzzle.regions, 2)).toBe(false)
  })

  it('defaults to one star per line when not told otherwise', () => {
    expect(isSolved(gridOf(puzzle.solution, 8), puzzle.regions)).toBe(false)
  })
})
