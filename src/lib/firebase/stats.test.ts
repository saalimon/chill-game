import { describe, expect, it } from 'vitest'
import { applySolve } from './stats'
import { EMPTY_STATS, type SolveRecord, type Stats } from './types'

const solve = (over: Partial<SolveRecord> = {}): SolveRecord => ({
  id: 'x',
  game: 'queens',
  size: 7,
  seed: 1,
  genVersion: 1,
  difficulty: 'medium',
  timeMs: 90_000,
  hintsUsed: 0,
  completedAt: 0,
  mode: 'free',
  moves: [],
  ...over,
})

describe('applySolve', () => {
  it('counts the first solve', () => {
    const s = applySolve(EMPTY_STATS, solve(), '2026-09-10')
    expect(s.solved).toBe(1)
    expect(s.bySize['queens:7']).toEqual({ solved: 1, bestMs: 90_000 })
  })

  it('keeps the fastest time for a size', () => {
    let s = applySolve(EMPTY_STATS, solve({ timeMs: 90_000 }), '2026-09-10')
    s = applySolve(s, solve({ timeMs: 120_000 }), '2026-09-10')
    expect(s.bySize['queens:7']).toEqual({ solved: 2, bestMs: 90_000 })
  })

  it('records a faster time when one is set', () => {
    let s = applySolve(EMPTY_STATS, solve({ timeMs: 90_000 }), '2026-09-10')
    s = applySolve(s, solve({ timeMs: 40_000 }), '2026-09-10')
    expect(s.bySize['queens:7'].bestMs).toBe(40_000)
  })

  it('tracks sizes separately', () => {
    let s = applySolve(EMPTY_STATS, solve({ size: 5 }), '2026-09-10')
    s = applySolve(s, solve({ size: 9 }), '2026-09-10')
    expect(Object.keys(s.bySize).sort()).toEqual(['queens:5', 'queens:9'])
  })

  it('starts a streak at one', () => {
    const s = applySolve(EMPTY_STATS, solve(), '2026-09-10')
    expect(s.streak).toEqual({ current: 1, longest: 1, lastPlayedDate: '2026-09-10' })
  })

  it('extends the streak when yesterday was played', () => {
    let s = applySolve(EMPTY_STATS, solve(), '2026-09-10')
    s = applySolve(s, solve(), '2026-09-11')
    expect(s.streak.current).toBe(2)
    expect(s.streak.longest).toBe(2)
  })

  it('does not extend the streak for a second solve on the same day', () => {
    let s = applySolve(EMPTY_STATS, solve(), '2026-09-10')
    s = applySolve(s, solve(), '2026-09-10')
    expect(s.streak.current).toBe(1)
    expect(s.solved).toBe(2)
  })

  it('restarts the streak after a missed day', () => {
    let s = applySolve(EMPTY_STATS, solve(), '2026-09-10')
    s = applySolve(s, solve(), '2026-09-12')
    expect(s.streak.current).toBe(1)
  })

  it('remembers the longest streak even after it is broken', () => {
    let s: Stats = EMPTY_STATS
    for (const d of ['2026-09-01', '2026-09-02', '2026-09-03']) s = applySolve(s, solve(), d)
    s = applySolve(s, solve(), '2026-09-20')
    expect(s.streak).toEqual({ current: 1, longest: 3, lastPlayedDate: '2026-09-20' })
  })

  it('extends a streak across a month boundary', () => {
    let s = applySolve(EMPTY_STATS, solve(), '2026-01-31')
    s = applySolve(s, solve(), '2026-02-01')
    expect(s.streak.current).toBe(2)
  })

  it('extends a streak across a leap day', () => {
    let s = applySolve(EMPTY_STATS, solve(), '2028-02-28')
    s = applySolve(s, solve(), '2028-02-29')
    s = applySolve(s, solve(), '2028-03-01')
    expect(s.streak.current).toBe(3)
  })

  it('does not mutate the stats it was given', () => {
    const before = applySolve(EMPTY_STATS, solve(), '2026-09-10')
    applySolve(before, solve(), '2026-09-11')
    expect(before.streak.current).toBe(1)
    expect(before.solved).toBe(1)
  })
})

describe('the two games', () => {
  it('keeps a separate best time for each, even at the same size', () => {
    let s = applySolve(EMPTY_STATS, solve({ game: 'queens', size: 8, timeMs: 30_000 }), '2026-09-10')
    s = applySolve(s, solve({ game: 'twoNotTouch', size: 8, timeMs: 200_000 }), '2026-09-10')

    expect(s.bySize['queens:8'].bestMs).toBe(30_000)
    expect(s.bySize['twoNotTouch:8'].bestMs).toBe(200_000)
    expect(s.solved).toBe(2)
  })

  it('files a record with no game recorded under the original game', () => {
    const legacy = { ...solve({ size: 6 }), game: undefined as unknown as 'queens' }
    expect(applySolve(EMPTY_STATS, legacy, '2026-09-10').bySize['queens:6']).toBeDefined()
  })
})
