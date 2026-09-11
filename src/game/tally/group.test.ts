import { describe, expect, it } from 'vitest'
import { groupByRank } from './group'
import type { Card } from './cards'

const hand = (spec: string): Card[] =>
  spec.split(' ').map((token) => ({
    rank: Number(token.slice(0, -1)),
    suit: { s: 'star', f: 'flower', l: 'cloud', m: 'moon' }[token.slice(-1)] as Card['suit'],
  }))

describe('groupByRank', () => {
  it('puts each rank in its own run', () => {
    const groups = groupByRank(hand('2s 4f 2l 4m 7s'))
    expect(groups.map((g) => g.rank)).toEqual([2, 4, 7])
    expect(groups.map((g) => g.cards.length)).toEqual([2, 2, 1])
  })

  it('orders the runs low to high', () => {
    expect(groupByRank(hand('9s 1f 5l')).map((g) => g.rank)).toEqual([1, 5, 9])
  })

  it('gathers cards of one rank even when they were far apart', () => {
    const groups = groupByRank(hand('3s 8f 3l 9m 3c'.replace('c', 's')))
    expect(groups[0].rank).toBe(3)
    expect(groups[0].cards).toHaveLength(3)
  })

  it('remembers where each card sat, so a strip can still mark one', () => {
    const groups = groupByRank(hand('5s 1f 5l'))
    expect(groups[0].cards[0].at).toBe(1)
  })

  it('keeps every card exactly once', () => {
    const cards = hand('2s 4f 2l 4m 7s')
    const flat = groupByRank(cards).flatMap((g) => g.cards)
    expect(flat).toHaveLength(cards.length)
  })

  it('has nothing to group for an empty hand', () => {
    expect(groupByRank([])).toEqual([])
  })
})
