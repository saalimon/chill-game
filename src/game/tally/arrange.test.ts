import { describe, expect, it } from 'vitest'
import { arrangeRow } from './arrange'
import type { Card } from './cards'

const hand = (spec: string): Card[] =>
  spec.split(' ').map((token) => ({
    rank: Number(token.slice(0, -1)),
    suit: { s: 'star', f: 'flower', l: 'cloud', m: 'moon' }[token.slice(-1)] as Card['suit'],
  }))

const ranks = (row: ReturnType<typeof arrangeRow>) => row.map((a) => a.card.rank)

describe('arrangeRow', () => {
  it('puts the cards in rank order', () => {
    expect(ranks(arrangeRow(hand('7s 3f 5l 1m 9s')))).toEqual([1, 3, 5, 7, 9])
  })

  it('brings a scattered pair together', () => {
    // The two 2s land at either end of the row and should end up adjacent.
    expect(ranks(arrangeRow(hand('2l 1s 1f 5f 2s')))).toEqual([1, 1, 2, 2, 5])
  })

  it('makes a straight read as a run', () => {
    expect(ranks(arrangeRow(hand('6m 4f 7s 5l 3s')))).toEqual([3, 4, 5, 6, 7])
  })

  it('remembers where each card was dealt, so it can slide from there', () => {
    const arranged = arrangeRow(hand('9s 1f 5l 3m 7s'))
    expect(arranged.map((a) => a.dealtAt)).toEqual([1, 3, 2, 4, 0])
  })

  it('keeps every card exactly once', () => {
    const row = hand('7s 3f 5l 1m 9s')
    const arranged = arrangeRow(row)
    expect(arranged).toHaveLength(row.length)
    for (const card of row) expect(arranged.map((a) => a.card)).toContainEqual(card)
  })

  it('orders equal ranks the same way every time', () => {
    const row = hand('4m 4s 4f 4l 1s')
    expect(arrangeRow(row)).toEqual(arrangeRow(row))
  })

  it('leaves the row it was given alone', () => {
    const row = hand('7s 3f 5l 1m 9s')
    const before = [...row]
    arrangeRow(row)
    expect(row).toEqual(before)
  })
})
