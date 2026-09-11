import { emptyGrid, isSolved } from '@/game/grid/rules'
import { CellState, type Grid, type Puzzle } from '@/game/grid/types'

/** One committed change to a square. `t` is milliseconds since the session began. */
export interface Change {
  t: number
  r: number
  c: number
  from: CellState
  to: CellState
}

/** The compact form written to the database: where it landed, and when. */
export interface Move {
  t: number
  r: number
  c: number
  s: CellState
}

/** Wrong guesses allowed before the game ends. */
export const MAX_LIVES = 3

export interface Session {
  puzzle: Puzzle
  grid: Grid
  /** Every change, including ones currently undone. */
  history: Change[]
  /** How many entries of `history` are applied. Undo walks this back. */
  cursor: number
  hintsUsed: number
  /** Wrong guesses still available. At zero the game is over. */
  lives: number
  startedAt: number
  solvedAt: number | null
  status: 'playing' | 'solved' | 'lost'
}

export function newSession(puzzle: Puzzle, startedAt: number = Date.now()): Session {
  return {
    puzzle,
    grid: emptyGrid(puzzle.size),
    history: [],
    cursor: 0,
    hintsUsed: 0,
    lives: MAX_LIVES,
    startedAt,
    solvedAt: null,
    status: 'playing',
  }
}

const cloneGrid = (grid: Grid): Grid => grid.map((row) => [...row])

/**
 * Recompute what the change implies.
 *
 * Only correct guesses ever land as placements, so a placed board can never
 * break a rule — finishing is simply a matter of every emoji being down.
 */
function settle(session: Session, grid: Grid, now: number): Session {
  if (session.lives <= 0) {
    return { ...session, grid, solvedAt: null, status: 'lost' }
  }
  const solved = isSolved(grid, session.puzzle.regions, session.puzzle.stars)
  return { ...session, grid, solvedAt: solved ? now : null, status: solved ? 'solved' : 'playing' }
}

/** Apply a change, discarding anything that had been undone. */
function commit(session: Session, change: Change, now: number): Session {
  const grid = cloneGrid(session.grid)
  grid[change.r][change.c] = change.to
  const history = [...session.history.slice(0, session.cursor), change]
  return settle({ ...session, history, cursor: history.length }, grid, now)
}

/** Change one square, unless the game is already over. */
function change(session: Session, r: number, c: number, to: CellState, now: number): Session {
  if (session.status !== 'playing') return session
  const from = session.grid[r][c]
  return commit(session, { t: now - session.startedAt, r, c, from, to }, now)
}

/**
 * Whether this square is one of the answer's star positions.
 *
 * A row holds several stars in the two-star game, so this is a membership test
 * rather than a lookup by row.
 */
const isCorrect = (session: Session, r: number, c: number): boolean =>
  session.puzzle.solution.some((cell) => cell.r === r && cell.c === c)

/**
 * A single tap: rule the square out, or clear it if it already carries
 * something. Ruling squares out is the move players make most, so it is the one
 * that costs a single tap.
 */
export function markCell(session: Session, r: number, c: number, now: number): Session {
  const to = session.grid[r][c] === CellState.Empty ? CellState.Marked : CellState.Empty
  return change(session, r, c, to, now)
}

/**
 * A double tap: guess that the emoji belongs here.
 *
 * The guess is checked against the answer straight away. A right one stays on
 * the board; a wrong one is stamped with a red cross and costs a life, and the
 * game ends when the third is spent.
 */
export function placeCell(session: Session, r: number, c: number, now: number): Session {
  if (session.status !== 'playing') return session
  const from = session.grid[r][c]

  // A square already known to be wrong can't cost a second life.
  if (from === CellState.Wrong) return session
  // Double tapping an emoji lifts it back off.
  if (from === CellState.Placed) return change(session, r, c, CellState.Empty, now)

  if (isCorrect(session, r, c)) return change(session, r, c, CellState.Placed, now)

  const spent = { ...session, lives: session.lives - 1 }
  return change(spent, r, c, CellState.Wrong, now)
}

/** Put one correct emoji on the board. */
export function revealHint(session: Session, now: number): Session {
  if (session.status !== 'playing') return session
  const missing = session.puzzle.solution.find(
    ({ r, c }) => session.grid[r][c] !== CellState.Placed,
  )
  if (!missing) return session
  const change = {
    t: now - session.startedAt,
    r: missing.r,
    c: missing.c,
    from: session.grid[missing.r][missing.c],
    to: CellState.Placed,
  }
  return { ...commit(session, change, now), hintsUsed: session.hintsUsed + 1 }
}

export function undo(session: Session, now: number = Date.now()): Session {
  if (session.cursor === 0) return session
  const change = session.history[session.cursor - 1]
  const grid = cloneGrid(session.grid)
  grid[change.r][change.c] = change.from
  return settle({ ...session, cursor: session.cursor - 1 }, grid, now)
}

export function redo(session: Session, now: number = Date.now()): Session {
  if (session.cursor >= session.history.length) return session
  const change = session.history[session.cursor]
  const grid = cloneGrid(session.grid)
  grid[change.r][change.c] = change.to
  return settle({ ...session, cursor: session.cursor + 1 }, grid, now)
}

/** Clear the board, keeping the same puzzle. */
export function reset(session: Session, now: number = Date.now()): Session {
  return newSession(session.puzzle, now)
}

/**
 * The path the player actually took, ready to store.
 *
 * Undone moves are left out — what's kept is the route to the board as it
 * stands, which is what a replay should show.
 */
export function replayLog(session: Session): Move[] {
  return session.history
    .slice(0, session.cursor)
    .map(({ t, r, c, to }) => ({ t, r, c, s: to }))
}

/** Milliseconds on the clock. */
export function elapsed(session: Session, now: number): number {
  return (session.solvedAt ?? now) - session.startedAt
}
