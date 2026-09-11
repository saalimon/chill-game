import { useCallback, useEffect, useRef, useState } from 'react'
import { play } from '@/lib/sound/player'
import { markFor, newRun, playDeal, takeDraft, type Run } from '@/game/tally/run'

const SAVE_KEY = 'chilled:tally:run:v1'

/**
 * A saved run is its seed and the choices made, not its board.
 *
 * Because the run is deterministic, replaying those choices rebuilds the exact
 * state — the same trick the puzzle replays use, and a few dozen bytes rather
 * than a whole deck and grid.
 */
interface SavedRun {
  seed: number
  rounds: number
  /** One entry per deal played and draft taken, in order. */
  moves: ({ deal: true } | { draft: number | null })[]
}

function restore(save: SavedRun): Run {
  let run = newRun(save.seed, save.rounds)
  for (const move of save.moves) {
    run = 'deal' in move ? playDeal(run) : takeDraft(run, move.draft)
  }
  return run
}

function read(): SavedRun | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as SavedRun) : null
  } catch {
    return null
  }
}

function write(save: SavedRun | null): void {
  try {
    if (save) localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    else localStorage.removeItem(SAVE_KEY)
  } catch {
    // Private mode or a full quota; the run just won't survive a reload.
  }
}

const randomSeed = () => Math.floor(Math.random() * 0xffffffff)

export function useTallyRun() {
  const moves = useRef<SavedRun['moves']>([])
  const [run, setRun] = useState<Run>(() => {
    const saved = read()
    if (saved) {
      moves.current = saved.moves
      return restore(saved)
    }
    return newRun(randomSeed())
  })

  // Save after every action: a run lost to a backgrounded tab would be the
  // worst bug this game could have, and determinism makes the save tiny.
  useEffect(() => {
    if (run.status === 'won' || run.status === 'lost') write(null)
    else write({ seed: run.seed, rounds: run.rounds, moves: moves.current })
  }, [run])

  const deal = useCallback(() => {
    setRun((current) => {
      if (current.status !== 'playing') return current
      const next = playDeal(current)
      moves.current = [...moves.current, { deal: true }]
      if (next.status === 'lost') play('lost')
      else if (next.status === 'won') play('solved')
      else if (next.status === 'drafting') play('solved')
      else play('place')
      return next
    })
  }, [])

  const draft = useCallback((choice: number | null) => {
    setRun((current) => {
      if (current.status !== 'drafting') return current
      moves.current = [...moves.current, { draft: choice }]
      play('tap')
      return takeDraft(current, choice)
    })
  }, [])

  const restart = useCallback(() => {
    moves.current = []
    setRun(newRun(randomSeed()))
  }, [])

  return { run, deal, draft, restart, mark: markFor(run.round) }
}
