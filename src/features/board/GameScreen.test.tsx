import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { generate } from '@/game/grid/generate'
import { GameScreen } from './GameScreen'
import { glyphLabel } from './doodles/Doodle'
import { setMuted } from '@/lib/sound/player'

const puzzle = generate(2026, 5)

const setup = () => userEvent.setup()

// The mute setting is remembered for the life of the page, so reset it rather
// than letting one test inherit another's choice.
beforeEach(() => {
  localStorage.clear()
  setMuted(false)
})

function renderBoard(onSolved?: Parameters<typeof GameScreen>[0]['onSolved']) {
  return render(
    <MemoryRouter>
      <GameScreen puzzle={puzzle} label="5 × 5" onSolved={onSolved} />
    </MemoryRouter>,
  )
}

const cellAt = (r: number, c: number) =>
  screen.getByLabelText(new RegExp(`^row ${r + 1}, column ${c + 1},`))

/** Long enough that the next tap is a fresh single tap, not a double. */
const separateTaps = () => new Promise((resolve) => setTimeout(resolve, 360))

describe('tapping a square', () => {
  it('rules it out on a single tap', async () => {
    const user = setup()
    renderBoard()
    await user.click(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveAccessibleName(/ruled out/)
  })

  it('clears a ruled-out square when tapped again', async () => {
    const user = setup()
    renderBoard()
    await user.click(cellAt(0, 0))
    await separateTaps()
    await user.click(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveAccessibleName(/empty/)
  })

  it('places the emoji on a double tap', async () => {
    const user = setup()
    renderBoard()
    await user.dblClick(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveAccessibleName(new RegExp(glyphLabel(puzzle.token.id)))
  })

  it('leaves a double tap as one step, so a single undo clears it', async () => {
    const user = setup()
    renderBoard()
    await user.dblClick(cellAt(0, 0))
    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(cellAt(0, 0)).toHaveAccessibleName(/empty/)
  })

  it('takes the doodle away when the square is double tapped again', async () => {
    const user = setup()
    renderBoard()
    await user.dblClick(cellAt(0, 0))
    await separateTaps()
    await user.dblClick(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveAccessibleName(/empty/)
  })
})

describe('the controls', () => {
  it('keeps Undo disabled until something changes', async () => {
    const user = setup()
    renderBoard()
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
    await user.click(cellAt(0, 0))
    expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled()
  })

  it('undoes the last tap', async () => {
    const user = setup()
    renderBoard()
    await user.click(cellAt(0, 0))
    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(cellAt(0, 0)).toHaveAccessibleName(/empty/)
  })

  it('places a correct emoji when Hint is used', async () => {
    const user = setup()
    renderBoard()
    await user.click(screen.getByRole('button', { name: /hint/i }))
    const placed = puzzle.solution.filter((cell) =>
      cellAt(cell.r, cell.c).getAttribute('aria-label')?.includes(glyphLabel(puzzle.token.id)),
    )
    expect(placed).toHaveLength(1)
  })

  it('clears the board when Restart is used', async () => {
    const user = setup()
    renderBoard()
    await user.click(cellAt(0, 0))
    await user.click(screen.getByRole('button', { name: /restart/i }))
    expect(cellAt(0, 0)).toHaveAccessibleName(/empty/)
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
  })
})

describe('guessing wrong', () => {
  /** A square the answer does not use. */
  const wrong = (() => {
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.solution[r].c !== c) return { r, c }
      }
    }
    throw new Error('every square is part of the answer')
  })()

  it('marks the square wrong and spends a guess', async () => {
    const user = setup()
    renderBoard()
    expect(screen.getByLabelText(/3 of 3 guesses left/)).toBeInTheDocument()

    await user.dblClick(cellAt(wrong.r, wrong.c))

    expect(cellAt(wrong.r, wrong.c)).toHaveAccessibleName(/wrong guess/)
    expect(screen.getByLabelText(/2 of 3 guesses left/)).toBeInTheDocument()
  })

  it('ends the game after the third wrong guess', async () => {
    const user = setup()
    renderBoard()

    let spent = 0
    for (let r = 0; r < puzzle.size && spent < 3; r++) {
      for (let c = 0; c < puzzle.size && spent < 3; c++) {
        if (puzzle.solution[r].c === c) continue
        await user.dblClick(cellAt(r, c))
        await separateTaps()
        spent++
      }
    }

    expect(screen.getByText('Out of guesses')).toBeInTheDocument()
  })

  it('brings the board back with a full set of guesses', async () => {
    const user = setup()
    renderBoard()
    await user.dblClick(cellAt(wrong.r, wrong.c))
    await user.click(screen.getByRole('button', { name: /restart/i }))
    expect(screen.getByLabelText(/3 of 3 guesses left/)).toBeInTheDocument()
    expect(cellAt(wrong.r, wrong.c)).toHaveAccessibleName(/empty/)
  })
})

describe('finishing', () => {
  it('announces the solve and reports it once', async () => {
    const user = setup()
    const solves: unknown[] = []
    renderBoard((timeMs, hintsUsed, moves) => solves.push({ timeMs, hintsUsed, moves }))

    for (const cell of puzzle.solution) {
      await user.dblClick(cellAt(cell.r, cell.c))
      await separateTaps()
    }

    expect(screen.getByText('Solved')).toBeInTheDocument()
    expect(solves).toHaveLength(1)
  })
})

describe('sound', () => {
  it('offers a way to turn it off while playing', async () => {
    const user = setup()
    renderBoard()
    const button = screen.getByRole('button', { name: /turn sound off/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)

    expect(screen.getByRole('button', { name: /turn sound on/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('remembers being muted, so it stays off next time', async () => {
    const user = setup()
    const first = renderBoard()
    await user.click(screen.getByRole('button', { name: /turn sound off/i }))
    first.unmount()

    renderBoard()
    expect(screen.getByRole('button', { name: /turn sound on/i })).toBeInTheDocument()
  })

  it('plays without an audio engine, as jsdom has none', async () => {
    const user = setup()
    renderBoard()
    // Would throw if a missing AudioContext were not handled.
    await user.click(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveAccessibleName(/ruled out/)
  })
})
