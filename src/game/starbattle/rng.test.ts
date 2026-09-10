import { describe, expect, it } from 'vitest'
import { mulberry32, randInt, shuffled } from './rng'

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = [a(), a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 500; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randInt', () => {
  it('stays within [0, max)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('eventually covers every value in range', () => {
    const rng = mulberry32(7)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(randInt(rng, 4))
    expect([...seen].sort()).toEqual([0, 1, 2, 3])
  })
})

describe('shuffled', () => {
  it('returns a permutation of the input', () => {
    const rng = mulberry32(42)
    const out = shuffled(rng, [1, 2, 3, 4, 5, 6])
    expect([...out].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('does not mutate the input array', () => {
    const rng = mulberry32(42)
    const input = [1, 2, 3, 4, 5]
    shuffled(rng, input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic for a given seed', () => {
    const one = shuffled(mulberry32(5), [1, 2, 3, 4, 5, 6, 7, 8])
    const two = shuffled(mulberry32(5), [1, 2, 3, 4, 5, 6, 7, 8])
    expect(one).toEqual(two)
  })
})
