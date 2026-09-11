import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HAND_TYPES } from '@/game/tally/hands'
import { HAND_VALUES } from '@/game/tally/score'
import { HowToPlay } from './HowToPlay'

const open = (game: Parameters<typeof HowToPlay>[0]['game'], onClose = vi.fn()) => {
  render(<HowToPlay game={game} onClose={onClose} />)
  return onClose
}

describe('the sheet', () => {
  it('names the game it is explaining', () => {
    open('queens')
    expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Queens' })).toBeInTheDocument()
  })

  it('closes when the player is done', async () => {
    const user = userEvent.setup()
    const onClose = open('queens')
    await user.click(screen.getByRole('button', { name: /got it/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the page behind it is tapped', async () => {
    const user = userEvent.setup()
    const onClose = open('tally')
    await user.click(screen.getByTestId('howto-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when the sheet itself is tapped', async () => {
    const user = userEvent.setup()
    const onClose = open('tally')
    await user.click(screen.getByRole('heading', { name: 'Tally' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the grid puzzles', () => {
  it('states all three rules for Queens', () => {
    open('queens')
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).toMatch(/row/i)
    expect(text).toMatch(/column/i)
    expect(text).toMatch(/colour/i)
    expect(text).toMatch(/touch/i)
  })

  it('says one per line for Queens', () => {
    open('queens')
    expect(screen.getByRole('dialog').textContent).toMatch(/one\b/i)
  })

  it('says two per line for Two Not Touch, not one', () => {
    open('twoNotTouch')
    expect(screen.getByRole('heading', { name: 'Two Not Touch' })).toBeInTheDocument()
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).toMatch(/two doodles in every row/i)
  })

  it('explains the controls', () => {
    open('queens')
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).toMatch(/tap a square to rule it out/i)
    expect(text).toMatch(/double tap/i)
    expect(text).toMatch(/three wrong guesses/i)
  })

  it('shows a real worked board rather than a drawing of one', () => {
    open('queens')
    expect(screen.getByRole('grid', { name: /example/i })).toBeInTheDocument()
  })

  it('has no hand rankings, which belong to Tally', () => {
    open('queens')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('Tally', () => {
  it('lists every hand, strongest first', () => {
    open('tally')
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    // One header row plus one per hand type.
    expect(rows).toHaveLength(HAND_TYPES.length + 1)
  })

  it('quotes the same numbers the game scores with', () => {
    open('tally')
    const table = screen.getByRole('table')
    for (const type of HAND_TYPES) {
      const { chips, mult } = HAND_VALUES[type]
      expect(within(table).getByText(`${chips} × ${mult}`), type).toBeInTheDocument()
    }
  })

  it('puts the strongest hand at the top', () => {
    open('tally')
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent(/straight flush/i)
    expect(rows[rows.length - 1]).toHaveTextContent(/high card/i)
  })

  it('says that a draft swaps rather than adds', () => {
    open('tally')
    expect(screen.getByText(/replaces|swap/i)).toBeInTheDocument()
  })
})
