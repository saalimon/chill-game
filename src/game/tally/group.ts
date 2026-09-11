import { arrangeRow } from './arrange'
import type { Card } from './cards'

export interface CardGroup {
  rank: number
  cards: { card: Card; at: number }[]
}

/**
 * Split a hand into its runs of equal rank.
 *
 * Twenty cards in an unbroken line have to be counted one at a time; broken
 * into runs, "four 2s and three 3s" is something you see rather than count.
 * That is the whole judgement a draft rests on.
 */
export function groupByRank(cards: readonly Card[]): CardGroup[] {
  const groups: CardGroup[] = []
  for (const { card, dealtAt } of arrangeRow(cards)) {
    const last = groups[groups.length - 1]
    if (last && last.rank === card.rank) last.cards.push({ card, at: dealtAt })
    else groups.push({ rank: card.rank, cards: [{ card, at: dealtAt }] })
  }
  return groups
}
