import { SUIT_IDS, type Card } from './cards'

export interface ArrangedCard {
  card: Card
  /** Where it landed in the deal, so the tidy-up can slide it from there. */
  dealtAt: number
}

/**
 * Put a dealt row in reading order.
 *
 * A poker hand is a set: where a card happens to land carries no meaning, so
 * dealt order is pure noise. Sorting by rank puts matching cards side by side,
 * which is the difference between seeing two pair and having to hunt for it, and
 * makes a straight read as the run it is. Suits break ties so the order is
 * stable for a given hand.
 */
export function arrangeRow(row: readonly Card[]): ArrangedCard[] {
  return row
    .map((card, dealtAt) => ({ card, dealtAt }))
    .sort(
      (a, b) =>
        a.card.rank - b.card.rank ||
        SUIT_IDS.indexOf(a.card.suit) - SUIT_IDS.indexOf(b.card.suit),
    )
}
