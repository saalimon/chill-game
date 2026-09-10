import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import type { Puzzle } from '@/game/starbattle/types'
import { difficultyOf } from '@/game/starbattle/difficulty'
import { formatDuration } from '@/lib/format'
import { useGameSession } from '@/features/session/useGameSession'
import { replayLog, type Move } from '@/features/session/session'
import { Board } from './Board'
import { DoodleSprite } from './doodles/Doodle'
import { Lives } from './Lives'
import { RuleStrip } from './RuleStrip'
import { Timer } from './Timer'
import styles from './GameScreen.module.css'

interface GameScreenProps {
  puzzle: Puzzle
  /** What the bar says this board is — "7 × 7" or "Daily · 10/9". */
  label: string
  /** Fires once, the moment the last emoji lands correctly. */
  onSolved?: (timeMs: number, hintsUsed: number, moves: Move[]) => void
  onNext?: () => void
  nextLabel?: string
}

export function GameScreen({
  puzzle,
  label,
  onSolved,
  onNext,
  nextLabel = 'New puzzle',
}: GameScreenProps) {
  const game = useGameSession(puzzle)
  const { session } = game
  const solved = session.status === 'solved'
  const lost = session.status === 'lost'

  // Report the solve exactly once. Restarting the board arms it again.
  const reported = useRef(false)
  useEffect(() => {
    if (!solved) {
      reported.current = false
      return
    }
    if (reported.current) return
    reported.current = true
    onSolved?.(session.solvedAt ?? 0, session.hintsUsed, replayLog(session))
  }, [solved, session, onSolved])

  return (
    <div className={styles.screen}>
      <DoodleSprite />
      <div className={styles.sheet}>
        <span className={styles.pin} aria-hidden="true" />
        <header className={styles.bar}>
          <Link to="/" className={styles.back}>
            ← Games
          </Link>
          <h1 className={styles.title}>{label}</h1>
          <span className={styles.timer} aria-label="time on this puzzle">
            <Timer read={game.readClock} frozenMs={solved ? (session.solvedAt ?? 0) : null} />
          </span>
        </header>

        {solved ? (
          <div className={styles.done}>
            <h2 className={styles.doneTitle}>Solved</h2>
            <p className={styles.doneMeta}>
              {formatDuration(session.solvedAt ?? 0)}
              {session.hintsUsed > 0 &&
                ` · ${session.hintsUsed} hint${session.hintsUsed > 1 ? 's' : ''}`}
              {` · ${difficultyOf(puzzle.size, puzzle.nodes)}`}
            </p>
            {onNext && (
              <button type="button" className={styles.next} onClick={onNext}>
                {nextLabel}
              </button>
            )}
          </div>
        ) : lost ? (
          <div className={styles.done}>
            <h2 className={styles.doneTitle}>Out of guesses</h2>
            <p className={styles.doneMeta}>Three wrong squares. The board is still here to retry.</p>
            <button type="button" className={styles.next} onClick={game.restart}>
              Try this board again
            </button>
          </div>
        ) : (
          <>
            <div className={styles.status}>
              <Lives left={session.lives} />
              <span className={styles.hint}>Tap to rule out · double tap to place</span>
            </div>
            <RuleStrip />
          </>
        )}

        <div className={styles.boardArea}>
          <Board
            puzzle={puzzle}
            grid={session.grid}
            solved={solved}
            origin={game.origin}
            onTapCell={game.tapCell}
          />
        </div>

        <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          onClick={game.undo}
          disabled={!game.canUndo || lost}
        >
          <span className={styles.glyph}>↶</span>
          Undo
        </button>
        <button
          type="button"
          className={styles.control}
          onClick={game.hint}
          disabled={solved || lost}
        >
          <span className={styles.glyph}>◇</span>
          Hint
        </button>
        <button type="button" className={styles.control} onClick={game.restart}>
          <span className={styles.glyph}>⟲</span>
          Restart
        </button>
        </div>
      </div>
    </div>
  )
}
