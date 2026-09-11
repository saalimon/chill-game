import { useCallback, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { generate } from '@/game/starbattle/generate'
import { GAMES, gameOf, type GameId } from '@/game/starbattle/games'
import { dailyPuzzle, dailySpec, dateKey } from '@/game/starbattle/daily'
import { difficultyOf } from '@/game/starbattle/difficulty'
import { GameScreen } from '@/features/board/GameScreen'
import type { SolveRecord } from '@/lib/firebase/types'
import type { Move } from '@/features/session/session'

const randomSeed = () => Math.floor(Math.random() * 0xffffffff)

const isGameId = (value: string | undefined): value is GameId =>
  value !== undefined && value in GAMES

interface RouteProps {
  onSolved: (record: SolveRecord) => void
}

/** A puzzle of the chosen game at the chosen size, rerollable. */
export function PlayRoute({ onSolved }: RouteProps) {
  const { game, size } = useParams()
  const boardSize = Number(size)
  const [seed, setSeed] = useState(randomSeed)

  const valid = isGameId(game) && gameOf(game).sizes.includes(boardSize)
  const puzzle = useMemo(
    () => (valid ? generate(seed, boardSize, game as GameId) : null),
    [seed, boardSize, game, valid],
  )

  const handleSolved = useCallback(
    (timeMs: number, hintsUsed: number, moves: Move[]) => {
      if (!puzzle) return
      onSolved({
        id: `${puzzle.game}-${puzzle.seed}-${Date.now()}`,
        game: puzzle.game,
        size: puzzle.size,
        seed: puzzle.seed,
        genVersion: puzzle.genVersion,
        difficulty: difficultyOf(puzzle.size, puzzle.nodes, puzzle.game),
        timeMs,
        hintsUsed,
        completedAt: Date.now(),
        mode: 'free',
        moves,
      })
    },
    [puzzle, onSolved],
  )

  if (!valid || !puzzle) return <Navigate to="/" replace />

  return (
    <GameScreen
      key={`${puzzle.game}-${seed}`}
      puzzle={puzzle}
      label={`${puzzle.size} × ${puzzle.size}`}
      onSolved={handleSolved}
      onNext={() => setSeed(randomSeed())}
      nextLabel="Another one"
    />
  )
}

/** Today's board — the same one for everyone, derived from the date. */
export function DailyRoute({ onSolved }: RouteProps) {
  const spec = useMemo(() => dailySpec(), [])
  const puzzle = useMemo(() => dailyPuzzle(spec.date), [spec.date])

  const handleSolved = useCallback(
    (timeMs: number, hintsUsed: number, moves: Move[]) => {
      onSolved({
        id: `daily-${spec.date}`,
        game: puzzle.game,
        size: puzzle.size,
        seed: puzzle.seed,
        genVersion: puzzle.genVersion,
        difficulty: difficultyOf(puzzle.size, puzzle.nodes, puzzle.game),
        timeMs,
        hintsUsed,
        completedAt: Date.now(),
        mode: 'daily',
        date: spec.date,
        moves,
      })
    },
    [puzzle, spec.date, onSolved],
  )

  const [, month, day] = dateKey().split('-')
  return (
    <GameScreen
      puzzle={puzzle}
      label={`Daily · ${Number(day)}/${Number(month)}`}
      onSolved={handleSolved}
    />
  )
}
