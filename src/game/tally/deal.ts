import type { Rng } from '@/game/grid/rng'
import { shuffleDeck, type Card } from './cards'

export const COLUMNS = 5
export const ROWS = 3
export const HAND_SIZE = COLUMNS * ROWS

/**
 * Lay cards across the page: five columns, three rows.
 *
 * Each row is read as its own five-card hand, which keeps scoring legible on a
 * phone — hunting hands anywhere in the grid would not be.
 *
 * The whole deck is shuffled for every deal rather than drawn from a pile that
 * persists across the round. Each deal then stands alone, and the odds a player
 * is weighing when they draft a card stay the same all round.
 */
export function deal(deck: readonly Card[], rng: Rng): Card[][] {
  const shuffledDeck = shuffleDeck(deck, rng)
  const rows: Card[][] = []
  for (let r = 0; r < ROWS; r++) {
    rows.push(shuffledDeck.slice(r * COLUMNS, (r + 1) * COLUMNS))
  }
  return rows
}
