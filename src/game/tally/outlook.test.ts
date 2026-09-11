import { describe, expect, it } from 'vitest'
import { startingDeck, type Card } from './cards'
import { typicalDeal } from './outlook'

const swapWeakest = (deck: Card[], card: Card): Card[] => {
  const next = [...deck]
  let weakest = 0
  for (let i = 1; i < next.length; i++) if (next[i].rank < next[weakest].rank) weakest = i
  next[weakest] = card
  return next
}

describe('typicalDeal', () => {
  const deck = startingDeck()

  it('reports the same figure for the same deck, so it never flickers', () => {
    expect(typicalDeal(deck)).toBe(typicalDeal(deck))
  })

  it('gives a plausible figure for the starting deck', () => {
    const typical = typicalDeal(deck)
    expect(typical).toBeGreaterThan(80)
    expect(typical).toBeLessThan(400)
  })

  it('rates a deck stacked into one suit above the starting deck', () => {
    const flushy = deck.map((card, i) => (i % 2 === 0 ? { ...card, suit: 'star' as const } : card))
    expect(typicalDeal(flushy)).toBeGreaterThan(typicalDeal(deck))
  })

  /**
   * The number exists to say this out loud. A lone high card reads as an
   * upgrade and is not: it displaces a card that was completing a pair, and
   * fifteen of twenty cards are dealt every time.
   */
  it('rates a deck worse after taking a lone high card', () => {
    const withNine = swapWeakest(deck, { rank: 9, suit: 'star' })
    expect(typicalDeal(withNine)).toBeLessThan(typicalDeal(deck))
  })

  it('rates a deck better after taking a card that pairs one it holds', () => {
    // A fifth 5 alongside the four the deck already has.
    const paired = swapWeakest(deck, { rank: 5, suit: 'star' })
    expect(typicalDeal(paired)).toBeGreaterThan(typicalDeal(deck))
  })

  it('is quick enough to run for the deck and all three offers at once', () => {
    const started = performance.now()
    for (let i = 0; i < 4; i++) typicalDeal(deck)
    expect(performance.now() - started).toBeLessThan(400)
  })
})
