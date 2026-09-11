import { describe, expect, it } from 'vitest'
import { classify, HAND_TYPES } from './hands'
import { describeHand } from './describe'
import { EXAMPLE_HANDS } from '@/features/help/exampleHands'
import type { Card } from './cards'

const hand = (spec: string): Card[] =>
  spec.split(' ').map((token) => ({
    rank: Number(token.slice(0, -1)),
    suit: { s: 'star', f: 'flower', l: 'cloud', m: 'moon' }[token.slice(-1)] as Card['suit'],
  }))

const describeOf = (spec: string) => describeHand(classify(hand(spec)))

describe('describeHand', () => {
  it('names the pair', () => {
    expect(describeOf('4s 4f 7l 9m 2s')).toBe('4s')
  })

  it('names both pairs, lowest first', () => {
    expect(describeOf('8s 8f 3l 3m 1s')).toBe('3s and 8s')
  })

  it('names the rank of a three of a kind', () => {
    expect(describeOf('6s 6f 6l 2m 8s')).toBe('6s')
  })

  it('says which way round a full house sits', () => {
    // Three 4s and two 9s, not the other way about.
    expect(describeOf('4s 4f 4l 9m 9s')).toBe('4s over 9s')
  })

  it('gives a straight its span', () => {
    expect(describeOf('3s 4f 5l 6m 7s')).toBe('3 to 7')
  })

  it('names the suit of a flush', () => {
    expect(describeOf('1f 4f 5f 7f 9f')).toBe('Flowers')
  })

  it('gives a straight flush both its span and its suit', () => {
    expect(describeOf('5s 6s 7s 8s 9s')).toBe('5 to 9, Stars')
  })

  it('names the card carrying a high card', () => {
    expect(describeOf('2s 5f 7l 9m 3s')).toBe('9 high')
  })

  it('has something to say about every hand type', () => {
    for (const type of HAND_TYPES) {
      const described = describeHand(classify(EXAMPLE_HANDS[type]))
      expect(described, type).toBeTruthy()
      expect(described.length, type).toBeGreaterThan(0)
    }
  })

  it('only ever names cards that are actually in the hand', () => {
    const cards = hand('4s 4f 7l 9m 2s')
    const described = describeOf('4s 4f 7l 9m 2s')
    // The bystanders 7, 9 and 2 take no part and must not be named.
    expect(described).not.toMatch(/7|9/)
    expect(cards.some((c) => described.includes(String(c.rank)))).toBe(true)
  })
})
