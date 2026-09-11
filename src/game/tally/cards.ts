import { shuffled, type Rng } from '@/game/grid/rng'
import type { TokenId, TokenInk } from '@/game/grid/tokens'

/**
 * A suit, drawn rather than printed.
 *
 * Each one is an existing doodle in its own ink, so the deck is made from art
 * the app already has. Carrying both a shape and a colour means the suit reads
 * without relying on colour alone.
 */
export interface Suit {
  id: SuitId
  name: string
  glyph: TokenId
  ink: TokenInk
}

export const SUIT_IDS = ['star', 'flower', 'cloud', 'moon'] as const
export type SuitId = (typeof SUIT_IDS)[number]

export const SUITS: readonly Suit[] = [
  { id: 'star', name: 'Stars', glyph: 'star', ink: 'pink' },
  { id: 'flower', name: 'Flowers', glyph: 'flower', ink: 'blue' },
  // A filled silhouette, not an outline: the leaf glyph is drawn as a stroked
  // outline with a midrib and collapsed into an unreadable sliver at card size.
  { id: 'cloud', name: 'Clouds', glyph: 'cloud', ink: 'ink' },
  { id: 'moon', name: 'Moons', glyph: 'moon', ink: 'yellow' },
]

export const suitOf = (id: SuitId): Suit => SUITS.find((s) => s.id === id)!

/** Ranks run 1 to 9: low enough to read at a glance, high enough for runs. */
export const MAX_RANK = 9

export interface Card {
  rank: number
  suit: SuitId
}

export const DECK_SIZE = SUIT_IDS.length * MAX_RANK

/** A stable key for a card, for comparing and de-duplicating. */
export const cardId = (card: Card): string => `${card.suit}${card.rank}`

/** Every suit and rank, once each. */
export function fullDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUIT_IDS) {
    for (let rank = 1; rank <= MAX_RANK; rank++) deck.push({ rank, suit })
  }
  return deck
}

/**
 * What a run begins with: ranks 1 to 5 in every suit.
 *
 * Kept small and low on purpose. Drafting has to be felt, and one card added to
 * twenty shifts the odds by five percent where one added to a full thirty-six
 * would barely register. Starting low also leaves the deck somewhere to grow.
 */
export function startingDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUIT_IDS) {
    for (let rank = 1; rank <= 5; rank++) deck.push({ rank, suit })
  }
  return deck
}

/** A seeded shuffle. The deck handed in is left untouched. */
export function shuffleDeck(deck: readonly Card[], rng: Rng): Card[] {
  return shuffled(rng, deck)
}
