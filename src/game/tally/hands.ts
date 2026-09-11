import { MAX_RANK, type Card } from './cards'

/** Hand types, weakest first. The order is the ranking. */
export const HAND_TYPES = [
  'highCard',
  'pair',
  'twoPair',
  'threeOfAKind',
  'straight',
  'flush',
  'fullHouse',
  'fourOfAKind',
  'straightFlush',
] as const
export type HandType = (typeof HAND_TYPES)[number]

export interface Hand {
  type: HandType
  /**
   * The cards that actually make the hand.
   *
   * Only these add their rank to the score, so a pair of nines beats a pair of
   * twos without needing a separate kicker rule.
   */
  scoring: Card[]
}

/** Cards grouped by rank, largest group first, then by rank within that. */
function byRank(cards: Card[]): Card[][] {
  const groups = new Map<number, Card[]>()
  for (const card of cards) {
    const group = groups.get(card.rank)
    if (group) group.push(card)
    else groups.set(card.rank, [card])
  }
  return [...groups.values()].sort((a, b) => b.length - a.length || b[0].rank - a[0].rank)
}

const isFlush = (cards: Card[]): boolean => new Set(cards.map((c) => c.suit)).size === 1

/**
 * Five distinct ranks in an unbroken run.
 *
 * Ranks stop at 9 and there is no ace, so nothing wraps around — 8 9 1 2 3 is
 * just a high card.
 */
function isStraight(cards: Card[]): boolean {
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b)
  if (ranks.length !== 5) return false
  return ranks[4] - ranks[0] === 4
}

/**
 * Read five cards as the best hand they make.
 *
 * Tested from both ends: every type has a worked example, and a few thousand
 * random hands are checked against a second, deliberately different reading.
 */
export function classify(cards: Card[]): Hand {
  const groups = byRank(cards)
  const flush = isFlush(cards)
  const straight = isStraight(cards)

  if (straight && flush) return { type: 'straightFlush', scoring: [...cards] }
  // Four of each rank exist, so a larger group means a card was duplicated
  // somewhere. Reading it as four of a kind fails safe; falling past every
  // branch used to score the strongest possible row as a high card.
  if (groups[0].length >= 4) return { type: 'fourOfAKind', scoring: groups[0] }
  if (groups[0].length === 3 && groups[1]?.length === 2) {
    return { type: 'fullHouse', scoring: [...cards] }
  }
  if (flush) return { type: 'flush', scoring: [...cards] }
  if (straight) return { type: 'straight', scoring: [...cards] }
  if (groups[0].length === 3) return { type: 'threeOfAKind', scoring: groups[0] }
  if (groups[0].length === 2 && groups[1]?.length === 2) {
    return { type: 'twoPair', scoring: [...groups[0], ...groups[1]] }
  }
  if (groups[0].length === 2) return { type: 'pair', scoring: groups[0] }

  const best = cards.reduce((high, card) => (card.rank > high.rank ? card : high), cards[0])
  return { type: 'highCard', scoring: [best] }
}

const strengthOf = (hand: Hand): number => HAND_TYPES.indexOf(hand.type)

/**
 * Order two hands. Positive means `a` is the better one.
 *
 * Type decides it first; between two hands of the same type, the total of the
 * cards that make them breaks the tie.
 */
export function compareHands(a: Hand, b: Hand): number {
  const byType = strengthOf(a) - strengthOf(b)
  if (byType !== 0) return byType
  const total = (hand: Hand) => hand.scoring.reduce((sum, card) => sum + card.rank, 0)
  return total(a) - total(b)
}

/** The highest rank a hand could hold, for sizing score displays. */
export const TOP_RANK = MAX_RANK
