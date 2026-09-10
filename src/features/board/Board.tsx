import { useMemo } from 'react'
import { CellState, type Grid, type Puzzle } from '@/game/starbattle/types'
import { key } from '@/game/starbattle/rules'
import styles from './Board.module.css'

interface BoardProps {
  puzzle: Puzzle
  grid: Grid
  solved: boolean
  /** The last emoji placed — the solve ripple spreads out from here. */
  origin: { r: number; c: number } | null
  onTapCell: (r: number, c: number) => void
}

const THICK = '2.5px'
const HAIR = '1px'

export function Board({ puzzle, grid, solved, origin, onTapCell }: BoardProps) {
  const { size, regions, emoji } = puzzle

  /** Edges are drawn per cell on its top and left only, so no edge is doubled. */
  const edges = useMemo(() => {
    return regions.map((row, r) =>
      row.map((region, c) => {
        const boundaryTop = r === 0 || regions[r - 1][c] !== region
        const boundaryLeft = c === 0 || regions[r][c - 1] !== region
        return {
          '--edge-top': boundaryTop ? THICK : HAIR,
          '--edge-left': boundaryLeft ? THICK : HAIR,
          '--edge-top-color': boundaryTop ? 'var(--region-border)' : 'var(--region-hairline)',
          '--edge-left-color': boundaryLeft ? 'var(--region-border)' : 'var(--region-hairline)',
        } as React.CSSProperties
      }),
    )
  }, [regions])

  return (
    <div
      className={`${styles.board} ${solved ? styles.solved : ''}`}
      style={{ '--size': size } as React.CSSProperties}
      role="grid"
      aria-label={`${size} by ${size} puzzle board`}
    >
      {grid.map((row, r) =>
        row.map((state, c) => {
          const cellKey = key({ r, c })
          const ripple = origin ? Math.max(Math.abs(r - origin.r), Math.abs(c - origin.c)) : 0
          return (
            <button
              key={cellKey}
              type="button"
              role="gridcell"
              className={styles.cell}
              style={
                {
                  ...edges[r][c],
                  '--fill': `var(--region-${regions[r][c] % 9})`,
                  '--ripple': ripple,
                } as React.CSSProperties
              }
              onClick={() => onTapCell(r, c)}
              aria-label={describe(r, c, state, regions[r][c], emoji)}
            >
              {state === CellState.Placed && <span className={styles.emoji}>{emoji}</span>}
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
  )
}

function describe(r: number, c: number, state: CellState, region: number, emoji: string): string {
  const where = `row ${r + 1}, column ${c + 1}, colour ${region + 1}`
  if (state === CellState.Placed) return `${where}: ${emoji}`
  if (state === CellState.Marked) return `${where}: ruled out`
  if (state === CellState.Wrong) return `${where}: wrong guess`
  return `${where}: empty`
}
