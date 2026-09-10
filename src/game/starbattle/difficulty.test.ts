import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, difficultyOf } from './difficulty'
import { generate, SIZES } from './generate'

describe('difficultyOf', () => {
  it('calls a board with few solver branches easy', () => {
    expect(difficultyOf(9, 200)).toBe('easy')
  })

  it('calls a board with many solver branches hard', () => {
    expect(difficultyOf(9, 15000)).toBe('hard')
  })

  it('scales thresholds with board size, so the same node count means different things', () => {
    // 400 branches is a hard 7x7 but an easy 9x9.
    expect(difficultyOf(7, 400)).toBe('hard')
    expect(difficultyOf(9, 400)).toBe('easy')
  })

  it('returns a known difficulty for every size on the ladder', () => {
    for (const size of SIZES) {
      for (const nodes of [0, 50, 500, 5000, 100000]) {
        expect(DIFFICULTIES).toContain(difficultyOf(size, nodes))
      }
    }
  })

  it('never reports the same size as harder for fewer branches', () => {
    const rank = (d: string) => DIFFICULTIES.indexOf(d as never)
    for (const size of SIZES) {
      let previous = -1
      for (const nodes of [0, 10, 100, 1000, 10000, 100000]) {
        const current = rank(difficultyOf(size, nodes))
        expect(current).toBeGreaterThanOrEqual(previous)
        previous = current
      }
    }
  })

  it('spreads real generated boards across more than one difficulty', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const p = generate(7000 + i, 8)
      seen.add(difficultyOf(p.size, p.nodes))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
