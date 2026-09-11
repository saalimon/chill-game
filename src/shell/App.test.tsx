import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PlayRoute } from './PlayRoute'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<h1>Games</h1>} />
        <Route path="/play/:game/:size" element={<PlayRoute onSolved={() => {}} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('routing', () => {
  it('opens a Queens board', () => {
    renderAt('/play/queens/5')
    expect(screen.getByRole('grid', { name: /5 by 5/ })).toBeInTheDocument()
  })

  it('opens a Two Not Touch board', () => {
    renderAt('/play/twoNotTouch/8')
    expect(screen.getByRole('grid', { name: /8 by 8/ })).toBeInTheDocument()
    expect(screen.getByText('two per colour')).toBeInTheDocument()
  })

  it('sends a size the game does not offer back to the list', () => {
    // Two Not Touch has no legal 5x5 board.
    renderAt('/play/twoNotTouch/5')
    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument()
  })

  it('sends an unknown game back to the list', () => {
    renderAt('/play/sudoku/9')
    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument()
  })

  it('sends the old single-game play URL back to the list', () => {
    renderAt('/play/7')
    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument()
  })
})
