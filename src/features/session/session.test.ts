import { describe, expect, it } from 'vitest'
import { generate } from '@/game/grid/generate'
import { CellState } from '@/game/grid/types'
import {
  markCell,
  placeCell,
  newSession,
  redo,
  replayLog,
  reset,
  revealHint,
  undo,
  type Session,
} from './session'

const puzzle = generate(2026, 5)
const start = () => newSession(puzzle, 1_000)
const at = (s: Session, r: number, c: number) => s.grid[r][c]

/** Place every emoji of the real solution, in order. */
function solveIt(session: Session): Session {
  let s = session
  puzzle.solution.forEach((cell, i) => {
    s = placeCell(s, cell.r, cell.c, 2_000 + i * 10)
  })
  return s
}

describe('newSession', () => {
  it('starts with an empty grid and a clean history', () => {
    const s = start()
    expect(s.grid.flat().every((cell) => cell === CellState.Empty)).toBe(true)
    expect(s.history).toEqual([])
    expect(s.cursor).toBe(0)
    expect(s.hintsUsed).toBe(0)
    expect(s.status).toBe('playing')
  })
})

describe('markCell', () => {
  it('rules an empty square out', () => {
    expect(at(markCell(start(), 0, 0, 1_100), 0, 0)).toBe(CellState.Marked)
  })

  it('clears a square that was already ruled out', () => {
    let s = markCell(start(), 0, 0, 1_100)
    s = markCell(s, 0, 0, 1_200)
    expect(at(s, 0, 0)).toBe(CellState.Empty)
  })

  it('clears a square that holds an emoji', () => {
    let s = placeCell(start(), 0, 0, 1_100)
    s = markCell(s, 0, 0, 1_200)
    expect(at(s, 0, 0)).toBe(CellState.Empty)
  })

  it('records the change with the time it happened', () => {
    const s = markCell(start(), 2, 3, 1_500)
    expect(s.history).toEqual([
      { t: 500, r: 2, c: 3, from: CellState.Empty, to: CellState.Marked },
    ])
  })

  it('does not mutate the session it was given', () => {
    const before = start()
    markCell(before, 0, 0, 1_100)
    expect(at(before, 0, 0)).toBe(CellState.Empty)
    expect(before.history).toEqual([])
  })

  it('ignores taps once the puzzle is solved', () => {
    const solved = solveIt(start())
    expect(markCell(solved, 0, 0, 9_999)).toBe(solved)
  })
})

describe('placeCell', () => {
  const right = puzzle.solution[1]

  it('puts an emoji on a correct empty square', () => {
    expect(at(placeCell(start(), right.r, right.c, 1_100), right.r, right.c)).toBe(CellState.Placed)
  })

  it('puts an emoji on a correct square that was ruled out', () => {
    const s = placeCell(markCell(start(), right.r, right.c, 1_100), right.r, right.c, 1_200)
    expect(at(s, right.r, right.c)).toBe(CellState.Placed)
  })

  it('takes the emoji away when the square already holds one', () => {
    let s = placeCell(start(), right.r, right.c, 1_100)
    s = placeCell(s, right.r, right.c, 1_200)
    expect(at(s, right.r, right.c)).toBe(CellState.Empty)
  })

  it('ignores taps once the puzzle is solved', () => {
    const solved = solveIt(start())
    expect(placeCell(solved, 0, 0, 9_999)).toBe(solved)
  })
})

describe('undo and redo', () => {
  it('undo steps the cell back to its previous state', () => {
    let s = markCell(start(), 1, 1, 1_100)
    s = undo(s)
    expect(at(s, 1, 1)).toBe(CellState.Empty)
    expect(s.cursor).toBe(0)
  })

  it('redo re-applies what undo took back', () => {
    let s = markCell(start(), 1, 1, 1_100)
    s = redo(undo(s))
    expect(at(s, 1, 1)).toBe(CellState.Marked)
    expect(s.cursor).toBe(1)
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const s = start()
    expect(undo(s)).toBe(s)
    expect(redo(s)).toBe(s)
  })

  it('drops the redone-away future once a new move is made', () => {
    let s = markCell(start(), 1, 1, 1_100)
    s = undo(s)
    s = markCell(s, 4, 4, 1_200)
    expect(s.history).toHaveLength(1)
    expect(redo(s)).toBe(s)
    expect(at(s, 1, 1)).toBe(CellState.Empty)
  })
})

describe('revealHint', () => {
  it('places a correct emoji and counts the hint', () => {
    const s = revealHint(start(), 1_400)
    const placed = puzzle.solution.filter((cell) => s.grid[cell.r][cell.c] === CellState.Placed)
    expect(placed).toHaveLength(1)
    expect(s.hintsUsed).toBe(1)
  })

  it('can be undone like any other move', () => {
    const s = undo(revealHint(start(), 1_400))
    expect(s.grid.flat().every((cell) => cell === CellState.Empty)).toBe(true)
  })

  it('does nothing once every emoji is already placed', () => {
    const solved = solveIt(start())
    expect(revealHint(solved, 9_999)).toBe(solved)
  })
})

describe('solving', () => {
  it('marks the session solved and records how long it took', () => {
    const s = solveIt(newSession(puzzle, 1_000))
    expect(s.status).toBe('solved')
    expect(s.solvedAt).toBeGreaterThan(0)
  })

  it('is not solved while emojis are still missing', () => {
    let s = start()
    for (const cell of puzzle.solution.slice(0, 4)) s = placeCell(s, cell.r, cell.c, 1_000)
    expect(s.status).toBe('playing')
  })
})

describe('reset', () => {
  it('clears the board but keeps the same puzzle', () => {
    const s = reset(solveIt(start()), 5_000)
    expect(s.puzzle).toBe(puzzle)
    expect(s.grid.flat().every((cell) => cell === CellState.Empty)).toBe(true)
    expect(s.status).toBe('playing')
    expect(s.history).toEqual([])
  })
})

describe('replayLog', () => {
  it('records the path actually taken, not the moves undone', () => {
    let s = markCell(start(), 1, 1, 1_100)
    s = undo(s)
    s = markCell(s, 2, 2, 1_300)
    expect(replayLog(s)).toEqual([{ t: 300, r: 2, c: 2, s: CellState.Marked }])
  })

  it('is compact enough to store — one small object per change', () => {
    const log = replayLog(solveIt(start()))
    expect(log).toHaveLength(5)
    expect(Object.keys(log[0]).sort()).toEqual(['c', 'r', 's', 't'])
  })
})

describe('lives', () => {
  const wrongCell = () => {
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.solution[r].c !== c) return { r, c }
      }
    }
    throw new Error('every square is part of the solution')
  }

  it('starts with three', () => {
    expect(start().lives).toBe(3)
  })

  it('leaves them alone for a correct emoji', () => {
    const cell = puzzle.solution[0]
    expect(placeCell(start(), cell.r, cell.c, 1_100).lives).toBe(3)
  })

  it('costs one for a wrong guess, and marks the square wrong', () => {
    const { r, c } = wrongCell()
    const s = placeCell(start(), r, c, 1_100)
    expect(s.lives).toBe(2)
    expect(at(s, r, c)).toBe(CellState.Wrong)
  })

  it('does not charge twice for the same square', () => {
    const { r, c } = wrongCell()
    let s = placeCell(start(), r, c, 1_100)
    s = placeCell(s, r, c, 1_200)
    expect(s.lives).toBe(2)
  })

  it('ends the game when the third guess is wrong', () => {
    let s = start()
    let spent = 0
    for (let r = 0; r < puzzle.size && spent < 3; r++) {
      for (let c = 0; c < puzzle.size && spent < 3; c++) {
        if (puzzle.solution[r].c === c) continue
        s = placeCell(s, r, c, 1_100 + spent)
        spent++
      }
    }
    expect(s.lives).toBe(0)
    expect(s.status).toBe('lost')
  })

  it('ignores taps once the game is lost', () => {
    let s = start()
    let spent = 0
    for (let r = 0; r < puzzle.size && spent < 3; r++) {
      for (let c = 0; c < puzzle.size && spent < 3; c++) {
        if (puzzle.solution[r].c === c) continue
        s = placeCell(s, r, c, 1_100 + spent)
        spent++
      }
    }
    const cell = puzzle.solution[0]
    expect(placeCell(s, cell.r, cell.c, 9_999)).toBe(s)
    expect(markCell(s, 4, 4, 9_999)).toBe(s)
  })

  it('clears a wrong square on a single tap, without refunding the life', () => {
    const { r, c } = wrongCell()
    let s = placeCell(start(), r, c, 1_100)
    s = markCell(s, r, c, 1_200)
    expect(at(s, r, c)).toBe(CellState.Empty)
    expect(s.lives).toBe(2)
  })

  it('gives them all back on restart', () => {
    const { r, c } = wrongCell()
    const s = reset(placeCell(start(), r, c, 1_100), 5_000)
    expect(s.lives).toBe(3)
    expect(s.status).toBe('playing')
  })

  it('costs nothing to take a hint', () => {
    expect(revealHint(start(), 1_400).lives).toBe(3)
  })
})
