import type { Card } from '@/game/tally/cards'
import type { HandType } from '@/game/tally/hands'

const c = (rank: number, suit: Card['suit']): Card => ({ rank, suit })

/**
 * A worked example of every hand, for the rankings table.
 *
 * Naming a hand is no use to someone who does not already know poker, so each
 * row of the table shows one. `exampleHands.test.ts` runs every example through
 * the real classifier, so an illustration can never drift from the hand it
 * claims to be.
 */
export const EXAMPLE_HANDS: Record<HandType, Card[]> = {
  straightFlush: [c(5, 'star'), c(6, 'star'), c(7, 'star'), c(8, 'star'), c(9, 'star')],
  fourOfAKind: [c(7, 'star'), c(7, 'flower'), c(7, 'cloud'), c(7, 'moon'), c(2, 'star')],
  fullHouse: [c(4, 'star'), c(4, 'flower'), c(4, 'cloud'), c(9, 'moon'), c(9, 'star')],
  flush: [c(1, 'flower'), c(4, 'flower'), c(5, 'flower'), c(7, 'flower'), c(9, 'flower')],
  straight: [c(3, 'star'), c(4, 'flower'), c(5, 'cloud'), c(6, 'moon'), c(7, 'star')],
  threeOfAKind: [c(6, 'star'), c(6, 'flower'), c(6, 'cloud'), c(2, 'moon'), c(8, 'star')],
  twoPair: [c(3, 'star'), c(3, 'flower'), c(8, 'cloud'), c(8, 'moon'), c(1, 'star')],
  pair: [c(5, 'star'), c(5, 'flower'), c(2, 'cloud'), c(7, 'moon'), c(9, 'star')],
  highCard: [c(2, 'star'), c(5, 'flower'), c(7, 'cloud'), c(9, 'moon'), c(3, 'star')],
}
