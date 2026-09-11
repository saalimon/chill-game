import { suitOf, type Card } from './cards'
import type { Hand } from './hands'

const plural = (rank: number) => `${rank}s`

/**
 * Which cards make the hand, in words.
 *
 * The row already names the hand and shows its score, but nothing said *why*,
 * so there was no way to check the game's working — or to learn what a full
 * house is by seeing one. Naming the group turns the outline round the cards
 * into something readable.
 */
export function describeHand(hand: Hand): string {
  const cards = hand.scoring
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b)

  switch (hand.type) {
    case 'highCard':
      return `${cards[0].rank} high`

    case 'pair':
    case 'threeOfAKind':
    case 'fourOfAKind':
      return plural(ranks[0])

    case 'twoPair':
      return `${plural(ranks[0])} and ${plural(ranks[1])}`

    case 'fullHouse': {
      // Three of one rank over two of another; say which way round.
      const counts = new Map<number, number>()
      for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
      const three = [...counts.entries()].find(([, n]) => n === 3)?.[0]
      const two = [...counts.entries()].find(([, n]) => n === 2)?.[0]
      return `${plural(three ?? ranks[0])} over ${plural(two ?? ranks[1])}`
    }

    case 'straight':
      return `${ranks[0]} to ${ranks[ranks.length - 1]}`

    case 'flush':
      return suitOf(cards[0].suit).name

    case 'straightFlush':
      return `${ranks[0]} to ${ranks[ranks.length - 1]}, ${suitOf(cards[0].suit).name}`
  }
}

/** For the aria label: the hand and what makes it, as one phrase. */
export const spokenHand = (name: string, hand: Hand): string =>
  `${name}, ${describeHand(hand)}`

export type { Card }
