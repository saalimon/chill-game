import { describe, expect, it } from 'vitest'
import { dateKey, dailyPuzzle, dailySpec } from './daily'
import { GAME_IDS, GAMES } from './games'

describe('dateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 8, 10))).toBe('2026-09-10')
  })

  it('zero-pads single-digit months and days', () => {
    expect(dateKey(new Date(2026, 0, 3))).toBe('2026-01-03')
  })

  it('uses local calendar date, not UTC', () => {
    // 23:30 local on the 10th is already the 11th in UTC for positive offsets,
    // but the player's "today" is still the 10th.
    const late = new Date(2026, 8, 10, 23, 30)
    expect(dateKey(late)).toBe('2026-09-10')
  })
})

describe('dailySpec', () => {
  it('gives the same seed and size for the same day', () => {
    expect(dailySpec('2026-09-10')).toEqual(dailySpec('2026-09-10'))
  })

  it('gives different seeds on different days', () => {
    expect(dailySpec('2026-09-10').seed).not.toBe(dailySpec('2026-09-11').seed)
  })

  it('always picks a size the chosen game actually offers', () => {
    for (let day = 1; day <= 28; day++) {
      const key = `2026-02-${String(day).padStart(2, '0')}`
      const spec = dailySpec(key)
      expect(GAME_IDS).toContain(spec.game)
      expect(GAMES[spec.game].sizes).toContain(spec.size)
    }
  })

  it('rotates through both games across a month', () => {
    const games = new Set(
      Array.from({ length: 28 }, (_, i) =>
        dailySpec(`2026-02-${String(i + 1).padStart(2, '0')}`).game,
      ),
    )
    expect(games.size).toBe(GAME_IDS.length)
  })

  it('varies the size across a month rather than always serving one board', () => {
    const sizes = new Set<number>()
    for (let day = 1; day <= 28; day++) {
      sizes.add(dailySpec(`2026-02-${String(day).padStart(2, '0')}`).size)
    }
    expect(sizes.size).toBeGreaterThan(1)
  })

  it('rejects a malformed date key', () => {
    expect(() => dailySpec('10-09-2026')).toThrow()
  })
})

describe('dailyPuzzle', () => {
  it('builds the same board for everyone on a given day', () => {
    expect(dailyPuzzle('2026-09-10')).toEqual(dailyPuzzle('2026-09-10'))
  })

  it('builds a board matching that day’s spec', () => {
    const spec = dailySpec('2026-09-10')
    const puzzle = dailyPuzzle('2026-09-10')
    expect(puzzle.seed).toBe(spec.seed)
    expect(puzzle.size).toBe(spec.size)
    expect(puzzle.game).toBe(spec.game)
  })
})
