import { describe, expect, it } from 'vitest'
import { HAND_TYPES } from './hands'
import { HAND_VALUES, scoreGrid, scoreHand } from './score'
import type { Card } from './cards'

const hand = (spec: string): Card[] =>
  spec.split(' ').map((token) => ({
    rank: Number(token.slice(0, -1)),
    suit: { s: 'star', f: 'flower', l: 'cloud', m: 'moon' }[token.slice(-1)] as Card['suit'],
  }))

describe('the value table', () => {
  it('prices every hand type', () => {
    for (const type of HAND_TYPES) {
      expect(HAND_VALUES[type], type).toBeDefined()
      expect(HAND_VALUES[type].chips, type).toBeGreaterThan(0)
      expect(HAND_VALUES[type].mult, type).toBeGreaterThan(0)
    }
  })

  it('never pays less for a better hand', () => {
    for (let i = 1; i < HAND_TYPES.length; i++) {
      const better = HAND_VALUES[HAND_TYPES[i]]
      const worse = HAND_VALUES[HAND_TYPES[i - 1]]
      expect(better.chips * better.mult, HAND_TYPES[i]).toBeGreaterThan(worse.chips * worse.mult)
    }
  })
})

describe('scoreHand', () => {
  it('multiplies chips by mult', () => {
    const result = scoreHand(hand('4s 4f 7l 9m 2s'))
    expect(result.total).toBe(result.chips * result.mult)
  })

  it('adds the rank of every card that makes the hand', () => {
    // A pair of fours: the base plus 4 + 4.
    const result = scoreHand(hand('4s 4f 7l 9m 2s'))
    expect(result.chips).toBe(HAND_VALUES.pair.chips + 8)
  })

  it('leaves out cards that take no part', () => {
    // The 7, 9 and 2 are bystanders and must not be counted.
    const withJunk = scoreHand(hand('4s 4f 7l 9m 2s'))
    const withLess = scoreHand(hand('4s 4f 1l 2m 3s'))
    expect(withJunk.chips).toBe(withLess.chips)
  })

  it('pays more for a higher pair, without needing a kicker rule', () => {
    expect(scoreHand(hand('9s 9f 2l 3m 5s')).total).toBeGreaterThan(
      scoreHand(hand('2s 2f 3l 4m 6s')).total,
    )
  })

  it('reports which hand it read', () => {
    expect(scoreHand(hand('3s 4s 5s 6s 7s')).hand.type).toBe('straightFlush')
  })
})

describe('scoreGrid', () => {
  const grid = [hand('4s 4f 7l 9m 2s'), hand('3s 4f 5l 6m 7s'), hand('2s 5s 7s 9s 3s')]

  it('scores each row and totals them', () => {
    const result = scoreGrid(grid)
    expect(result.rows).toHaveLength(3)
    expect(result.total).toBe(result.rows.reduce((sum, row) => sum + row.total, 0))
  })

  it('reads each row on its own', () => {
    const result = scoreGrid(grid)
    expect(result.rows.map((r) => r.hand.type)).toEqual(['pair', 'straight', 'flush'])
  })

  it('scores nothing for no rows', () => {
    expect(scoreGrid([]).total).toBe(0)
  })
})
