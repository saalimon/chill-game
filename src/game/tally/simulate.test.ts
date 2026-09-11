import { describe, expect, it } from 'vitest'
import { flushPolicy, greedyPolicy, simulateRun, skipPolicy, summarise } from './simulate'
import { DEALS_PER_ROUND, SHORT_ROUNDS } from './run'

/**
 * Balance, measured rather than felt.
 *
 * Every run is seeded, so these numbers are exact and identical on any machine —
 * the same reason the puzzle generators assert solver branches instead of
 * milliseconds. They are what will catch a sticker or a shop price in Phase 2
 * quietly making the game trivial.
 */
const RUNS = 800

describe('a short run', () => {
  const greedy = summarise(RUNS, greedyPolicy)

  it('is winnable, but not a formality', () => {
    expect(greedy.winRate).toBeGreaterThan(0.2)
    expect(greedy.winRate).toBeLessThan(0.5)
  })

  it('takes five to ten minutes, judged by how many deals it runs to', () => {
    // Somewhere around a deal every fifteen to twenty seconds once the count-up
    // and the draft are included.
    expect(greedy.medianDeals).toBeGreaterThanOrEqual(12)
    expect(greedy.medianDeals).toBeLessThanOrEqual(26)
  })

  it('cannot run longer than its rounds and deals allow', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(simulateRun(seed).deals).toBeLessThanOrEqual(SHORT_ROUNDS * DEALS_PER_ROUND)
    }
  })
})

describe('building the deck', () => {
  const skip = summarise(RUNS, skipPolicy)
  const greedy = summarise(RUNS, greedyPolicy)
  const flush = summarise(RUNS, flushPolicy)

  /**
   * The regression guard for a real bug. Drafting once *added* to the deck,
   * which diluted it — fifteen cards are dealt however big the deck is — and
   * skipping every draft beat taking every card. A deck-builder has to reward
   * building the deck.
   */
  it('beats leaving the deck alone', () => {
    expect(greedy.winRate).toBeGreaterThan(skip.winRate)
  })

  it('rewards building for something over grabbing the biggest number', () => {
    expect(flush.winRate).toBeGreaterThan(greedy.winRate)
  })

  it('never changes the size of the deck, since a draft is a swap', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(simulateRun(seed, greedyPolicy).deckSize).toBe(simulateRun(seed, skipPolicy).deckSize)
    }
  })
})

describe('simulation itself', () => {
  it('always reaches an end', () => {
    for (let seed = 0; seed < 200; seed++) {
      const outcome = simulateRun(seed)
      expect(outcome.round).toBeGreaterThanOrEqual(1)
      expect(outcome.deals).toBeGreaterThan(0)
    }
  })

  it('plays the same run twice for the same seed', () => {
    expect(simulateRun(4242)).toEqual(simulateRun(4242))
  })

  it('plays a different run for a different seed', () => {
    expect(simulateRun(1).totalScored).not.toBe(simulateRun(2).totalScored)
  })
})
