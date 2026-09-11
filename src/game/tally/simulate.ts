import { MAX_RANK, type Card } from './cards'
import { newRun, playDeal, takeDraft, type Run } from './run'

/** How a simulated player chooses between the three offers. */
export type Policy = (offers: Card[], run: Run) => number | null

/** Take the highest rank going — what an unthinking player would do. */
export const greedyPolicy: Policy = (offers) =>
  offers.reduce((best, card, i) => (card.rank > offers[best].rank ? i : best), 0)

/** Never take anything, for measuring what the starting deck alone can do. */
export const skipPolicy: Policy = () => null

/** Chase one suit, to see whether building for flushes is viable. */
export const flushPolicy: Policy = (offers, run) => {
  const counts = new Map<string, number>()
  for (const card of run.deck) counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1)
  const favourite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const match = offers.findIndex((card) => card.suit === favourite)
  return match === -1 ? greedyPolicy(offers, run) : match
}

export interface RunOutcome {
  won: boolean
  /** The round the run ended on — how far the player got. */
  round: number
  deals: number
  totalScored: number
  bestDeal: number
  deckSize: number
}

/** Guard against a rule change that could let a run never finish. */
const MAX_STEPS = 1000

/** Play one seeded run to its end under a policy. */
export function simulateRun(seed: number, policy: Policy = greedyPolicy, rounds?: number): RunOutcome {
  let run = rounds === undefined ? newRun(seed) : newRun(seed, rounds)

  for (let step = 0; step < MAX_STEPS; step++) {
    if (run.status === 'won' || run.status === 'lost') break
    run = run.status === 'drafting' ? takeDraft(run, policy(run.offers, run)) : playDeal(run)
  }

  return {
    won: run.status === 'won',
    round: run.round,
    deals: run.dealsPlayed,
    totalScored: run.totalScored,
    bestDeal: run.bestDeal,
    deckSize: run.deck.length,
  }
}

export interface Summary {
  runs: number
  winRate: number
  medianDeals: number
  medianRound: number
  medianBestDeal: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Play many seeded runs and report how they went.
 *
 * This is the point of seeding the game: difficulty becomes something measured
 * over thousands of runs and asserted in tests, rather than judged by feel —
 * and it is what will keep the stickers and shop prices honest later, where
 * mispricing is otherwise very easy and very hard to notice.
 */
export function summarise(count: number, policy: Policy = greedyPolicy, rounds?: number): Summary {
  const outcomes = Array.from({ length: count }, (_, i) => simulateRun(i * 7919 + 13, policy, rounds))
  return {
    runs: count,
    winRate: outcomes.filter((o) => o.won).length / count,
    medianDeals: median(outcomes.map((o) => o.deals)),
    medianRound: median(outcomes.map((o) => o.round)),
    medianBestDeal: median(outcomes.map((o) => o.bestDeal)),
  }
}

/** The best a deck could theoretically do, for sanity-checking the mark curve. */
export const TOP_CARD = MAX_RANK
