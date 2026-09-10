import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Puzzle } from '@/game/starbattle/types'
import { CellState } from '@/game/starbattle/types'
import { play } from '@/lib/sound/player'
import {
  markCell,
  placeCell,
  newSession,
  redo as redoSession,
  reset as resetSession,
  revealHint,
  undo as undoSession,
  type Session,
} from './session'

/**
 * A clock that only runs while the player can see the board.
 *
 * Everything the session records — move timestamps and the final time — is
 * measured against this, so a puzzle left open in a background tab overnight
 * still reports the minutes actually spent on it.
 */
function usePlayClock() {
  const state = useRef({ banked: 0, since: performance.now(), running: true })

  const read = useCallback(() => {
    const { banked, since, running } = state.current
    return running ? banked + (performance.now() - since) : banked
  }, [])

  const restart = useCallback(() => {
    state.current = { banked: 0, since: performance.now(), running: true }
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      const clock = state.current
      const visible = document.visibilityState === 'visible'
      if (visible === clock.running) return
      if (visible) {
        clock.since = performance.now()
        clock.running = true
      } else {
        clock.banked += performance.now() - clock.since
        clock.running = false
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Memoised: an object rebuilt each render would retrigger every effect that
  // depends on the clock — including the one that resets the board.
  return useMemo(() => ({ read, restart }), [read, restart])
}

/** How close two taps on one square must be to count as a double tap. */
const DOUBLE_TAP_MS = 320

export function useGameSession(puzzle: Puzzle) {
  const clock = usePlayClock()
  const [session, setSession] = useState<Session>(() => newSession(puzzle, 0))

  // A different puzzle means a fresh board and a fresh clock.
  useEffect(() => {
    clock.restart()
    setSession(newSession(puzzle, 0))
  }, [puzzle, clock])

  /**
   * One tap rules a square out; two quick taps put the emoji there.
   *
   * The first tap applies immediately rather than waiting to see whether a
   * second is coming, so ruling squares out never feels laggy. If a second tap
   * does arrive, the first one is undone before the emoji is placed, which
   * keeps the pair as a single step in the history.
   */
  const lastTap = useRef<{ r: number; c: number; at: number } | null>(null)
  const tapCell = useCallback(
    (r: number, c: number) => {
      const now = clock.read()
      const previous = lastTap.current
      const isDouble =
        previous !== null &&
        previous.r === r &&
        previous.c === c &&
        now - previous.at < DOUBLE_TAP_MS

      if (isDouble) {
        lastTap.current = null
        setSession((s) => {
          const last = s.cursor > 0 ? s.history[s.cursor - 1] : null
          const withoutFirstTap = last && last.r === r && last.c === c ? undoSession(s, now) : s
          return placeCell(withoutFirstTap, r, c, now)
        })
        return
      }

      lastTap.current = { r, c, at: now }
      setSession((s) => markCell(s, r, c, now))
    },
    [clock],
  )
  const hint = useCallback(() => setSession((s) => revealHint(s, clock.read())), [clock])
  const undo = useCallback(() => setSession((s) => undoSession(s, clock.read())), [clock])
  const redo = useCallback(() => setSession((s) => redoSession(s, clock.read())), [clock])
  const restart = useCallback(() => {
    clock.restart()
    lastTap.current = null
    setSession((s) => resetSession(s, 0))
  }, [clock])

  /**
   * Give the board its voice.
   *
   * Sound is decided by watching what changed rather than by the actions, which
   * keeps the session reducer pure and means undo, redo and hints all announce
   * themselves without any of them having to remember to.
   */
  const heard = useRef({ cursor: 0, status: session.status })
  useEffect(() => {
    const previous = heard.current
    heard.current = { cursor: session.cursor, status: session.status }

    if (session.status !== previous.status) {
      if (session.status === 'solved') return play('solved')
      if (session.status === 'lost') return play('lost')
    }
    if (session.cursor <= previous.cursor) return

    const change = session.history[session.cursor - 1]
    if (!change) return
    if (change.to === CellState.Wrong) play('wrong')
    else if (change.to === CellState.Placed) play('place')
    else if (change.to === CellState.Marked) play('mark')
    else play('tap')
  }, [session])

  /** The most recently placed doodle — the solve ripple spreads from here. */
  const origin = useMemo(() => {
    for (let i = session.cursor - 1; i >= 0; i--) {
      const change = session.history[i]
      if (change.to === CellState.Placed) return { r: change.r, c: change.c }
    }
    return null
  }, [session.history, session.cursor])

  return {
    session,
    origin,
    readClock: clock.read,
    canUndo: session.cursor > 0,
    canRedo: session.cursor < session.history.length,
    tapCell,
    hint,
    undo,
    redo,
    restart,
  }
}
