import type { Card } from './cards'
import { classify, type Hand, type HandType } from './hands'

/**
 * What each hand type is worth.
 *
 * Chips are the base, multiplied by mult. These are a starting point: the
 * balance tests in `simulate.test.ts` are what decide whether they are right,
 * since a table that reads sensibly can still make a run trivial or impossible.
 */
export const HAND_VALUES: Record<HandType, { chips: number; mult: number }> = {
  highCard: { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  twoPair: { chips: 20, mult: 2 },
  threeOfAKind: { chips: 30, mult: 3 },
  straight: { chips: 30, mult: 4 },
  flush: { chips: 35, mult: 4 },
  fullHouse: { chips: 40, mult: 4 },
  fourOfAKind: { chips: 60, mult: 7 },
  straightFlush: { chips: 100, mult: 8 },
}

export interface HandScore {
  hand: Hand
  chips: number
  mult: number
  total: number
}

/**
 * Score five cards.
 *
 * Only the cards making the hand add their rank, which is what makes a pair of
 * nines beat a pair of twos without a separate kicker rule.
 */
export function scoreHand(cards: Card[]): HandScore {
  const hand = classify(cards)
  const base = HAND_VALUES[hand.type]
  const chips = base.chips + hand.scoring.reduce((sum, card) => sum + card.rank, 0)
  return { hand, chips, mult: base.mult, total: chips * base.mult }
}

export interface GridScore {
  rows: HandScore[]
  total: number
}

/** Score a dealt grid: every row is its own hand, and the rows add up. */
export function scoreGrid(rows: Card[][]): GridScore {
  const scored = rows.map(scoreHand)
  return { rows: scored, total: scored.reduce((sum, row) => sum + row.total, 0) }
}
