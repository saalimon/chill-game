import { useMemo } from 'react'
import { Board } from '@/features/board/Board'
import { generate } from '@/game/grid/generate'
import { emptyGrid } from '@/game/grid/rules'
import { CellState } from '@/game/grid/types'
import type { GameId } from '@/game/games'

/**
 * A small, genuinely solved board.
 *
 * Generated and solved by the real engine rather than drawn by hand, so the
 * example can never contradict the rules it is illustrating — and it is shown
 * through the same board component, so it looks exactly like the thing the
 * player is about to play.
 */
export function WorkedBoard({ game }: { game: Extract<GameId, 'queens' | 'twoNotTouch'> }) {
  const { puzzle, grid } = useMemo(() => {
    const size = game === 'queens' ? 5 : 8
    const built = generate(20260911, size, game)
    const solved = emptyGrid(size)
    for (const { r, c } of built.solution) solved[r][c] = CellState.Placed
    return { puzzle: built, grid: solved }
  }, [game])

  return (
    <Board
      puzzle={puzzle}
      grid={grid}
      solved={false}
      origin={null}
      onTapCell={() => {}}
      previewSide={game === 'queens' ? 170 : 210}
      label="a solved example board"
    />
  )
}
