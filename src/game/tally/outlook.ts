import { mulberry32 } from '@/game/grid/rng'
import type { Card } from './cards'
import { deal } from './deal'
import { scoreGrid } from './score'

/**
 * How many deals to sample when judging a deck.
 *
 * Enough that the figure is steady between decks that differ by one card, few
 * enough to run four times over while a sheet slides up.
 */
const SAMPLES = 160

/**
 * What a deck typically scores in one deal.
 *
 * The draft is the only decision in a run, and it was being made blind: a lone
 * high card looks like an upgrade and usually is not, because fifteen of twenty
 * cards are dealt every time and an unmatched card mostly displaces one that was
 * completing a pair. Sampling actual deals turns that from something the player
 * has to know into something the screen can say.
 *
 * Sampled from fixed seeds, so the same deck always reports the same figure and
 * the number never flickers as the sheet re-renders.
 */
export function typicalDeal(deck: readonly Card[], samples = SAMPLES): number {
  const totals: number[] = []
  for (let i = 0; i < samples; i++) {
    totals.push(scoreGrid(deal(deck, mulberry32(i * 2654435761 + 1))).total)
  }
  totals.sort((a, b) => a - b)
  return totals[Math.floor(totals.length / 2)]
}
