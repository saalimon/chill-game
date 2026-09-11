import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/game/grid/rng'
import {
  DECK_SIZE,
  MAX_RANK,
  SUITS,
  cardId,
  fullDeck,
  shuffleDeck,
  startingDeck,
  type Card,
} from './cards'

describe('the deck', () => {
  it('has four suits', () => {
    expect(SUITS).toHaveLength(4)
    expect(new Set(SUITS.map((s) => s.id)).size).toBe(4)
  })

  it('draws each suit in its own ink, so colour and shape both carry it', () => {
    expect(new Set(SUITS.map((s) => s.ink)).size).toBe(4)
    expect(new Set(SUITS.map((s) => s.glyph)).size).toBe(4)
  })

  it('runs ranks 1 to 9', () => {
    expect(MAX_RANK).toBe(9)
  })

  it('holds every suit and rank combination exactly once', () => {
    const deck = fullDeck()
    expect(deck).toHaveLength(DECK_SIZE)
    expect(new Set(deck.map(cardId)).size).toBe(DECK_SIZE)
  })
})

describe('the starting deck', () => {
  const deck = startingDeck()

  it('is small enough that one new card is felt', () => {
    // A card added to a twenty-card deck shifts the odds by five percent; in a
    // full thirty-six it would barely register, and drafting would feel inert.
    expect(deck.length).toBeGreaterThanOrEqual(16)
    expect(deck.length).toBeLessThanOrEqual(24)
  })

  it('covers all four suits, so a flush is reachable from the start', () => {
    expect(new Set(deck.map((c) => c.suit)).size).toBe(4)
  })

  it('leans low, leaving somewhere to grow', () => {
    const average = deck.reduce((sum, c) => sum + c.rank, 0) / deck.length
    expect(average).toBeLessThan((1 + MAX_RANK) / 2)
  })

  it('is a fresh copy each time, never a shared array', () => {
    const one = startingDeck()
    one.pop()
    expect(startingDeck()).toHaveLength(deck.length)
  })
})

describe('shuffleDeck', () => {
  const deck = startingDeck()

  it('deals the same order for the same seed', () => {
    expect(shuffleDeck(deck, mulberry32(7))).toEqual(shuffleDeck(deck, mulberry32(7)))
  })

  it('deals a different order for a different seed', () => {
    expect(shuffleDeck(deck, mulberry32(1))).not.toEqual(shuffleDeck(deck, mulberry32(2)))
  })

  it('keeps every card', () => {
    const shuffled = shuffleDeck(deck, mulberry32(3))
    const tally = (cards: Card[]) => cards.map(cardId).sort().join(' ')
    expect(tally(shuffled)).toBe(tally(deck))
  })

  it('leaves the deck it was given alone', () => {
    const before = deck.map(cardId).join(' ')
    shuffleDeck(deck, mulberry32(9))
    expect(deck.map(cardId).join(' ')).toBe(before)
  })
})
