import { CellState, type Grid, type Puzzle } from '@/game/starbattle/types'
import { key } from '@/game/starbattle/rules'
import { Doodle, glyphLabel } from './doodles/Doodle'
import { BoardInk } from './paper/BoardInk'
import styles from './Board.module.css'

interface BoardProps {
  puzzle: Puzzle
  grid: Grid
  solved: boolean
  /** The last doodle placed — the solve ripple spreads out from here. */
  origin: { r: number; c: number } | null
  onTapCell: (r: number, c: number) => void
}

export function Board({ puzzle, grid, solved, origin, onTapCell }: BoardProps) {
  const { size, regions, token } = puzzle

  return (
    <div
      className={`${styles.board} ${solved ? styles.solved : ''}`}
      style={{ '--size': size, '--token-ink': `var(--pen-${token.ink})` } as React.CSSProperties}
    >
      <BoardInk regions={regions} seed={puzzle.seed} />

      <div className={styles.cells} role="grid" aria-label={`${size} by ${size} puzzle board`}>
        {grid.map((row, r) =>
          row.map((state, c) => {
            const ripple = origin ? Math.max(Math.abs(r - origin.r), Math.abs(c - origin.c)) : 0
            return (
              <button
                key={key({ r, c })}
                type="button"
                role="gridcell"
                className={styles.cell}
                style={{ '--ripple': ripple } as React.CSSProperties}
                onClick={() => onTapCell(r, c)}
                aria-label={describe(r, c, state, regions[r][c], token.id)}
              >
                {state === CellState.Placed && (
                  <Doodle id={token.id} className={styles.doodle} />
                )}
                {state === CellState.Marked && (
                  <span className={styles.mark} aria-hidden="true">
                    ✕
                  </span>
                )}
                {state === CellState.Wrong && (
                  <span className={styles.wrong} aria-hidden="true">
                    ✕
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

function describe(
  r: number,
  c: number,
  state: CellState,
  region: number,
  token: Puzzle['token']['id'],
): string {
  const where = `row ${r + 1}, column ${c + 1}, colour ${region + 1}`
  if (state === CellState.Placed) return `${where}: ${glyphLabel(token)}`
  if (state === CellState.Marked) return `${where}: ruled out`
  if (state === CellState.Wrong) return `${where}: wrong guess`
  return `${where}: empty`
}
