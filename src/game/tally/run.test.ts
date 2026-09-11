import { describe, expect, it } from 'vitest'
import { COLUMNS, ROWS, deal } from './deal'
import { markFor, newRun, playDeal, takeDraft, weakestIndex, type Run } from './run'
import { startingDeck } from './cards'
import { mulberry32 } from '@/game/grid/rng'

describe('deal', () => {
  const deck = startingDeck()

  it('lays out three rows of five', () => {
    const grid = deal(deck, mulberry32(1))
    expect(grid).toHaveLength(ROWS)
    for (const row of grid) expect(row).toHaveLength(COLUMNS)
  })

  it('deals the same cards for the same seed', () => {
    expect(deal(deck, mulberry32(5))).toEqual(deal(deck, mulberry32(5)))
  })

  it('deals different cards for different seeds', () => {
    expect(deal(deck, mulberry32(1))).not.toEqual(deal(deck, mulberry32(2)))
  })

  it('never deals the same card twice from one shuffle', () => {
    const flat = deal(deck, mulberry32(9)).flat()
    expect(new Set(flat.map((c) => `${c.suit}${c.rank}`)).size).toBe(ROWS * COLUMNS)
  })

  it('deals from the deck it is given, so drafted cards can turn up', () => {
    const stacked = deck.filter((c) => c.suit === 'star')
    for (const card of deal(stacked, mulberry32(3)).flat()) {
      expect(card.suit).toBe('star')
    }
  })
})

describe('the mark to beat', () => {
  it('rises every round', () => {
    for (let round = 2; round <= 8; round++) {
      expect(markFor(round), `round ${round}`).toBeGreaterThan(markFor(round - 1))
    }
  })

  it('opens at something a first deal can plausibly reach', () => {
    expect(markFor(1)).toBeGreaterThan(0)
    expect(markFor(1)).toBeLessThan(400)
  })
})

describe('a run', () => {
  const start = () => newRun(2026)

  it('begins on round one with a full set of deals and nothing scored', () => {
    const run = start()
    expect(run.round).toBe(1)
    expect(run.scored).toBe(0)
    expect(run.status).toBe('playing')
    expect(run.dealsLeft).toBeGreaterThan(0)
  })

  it('is reproducible from its seed', () => {
    expect(playDeal(newRun(7))).toEqual(playDeal(newRun(7)))
  })

  it('spends a deal and adds what it scored', () => {
    const before = start()
    const after = playDeal(before)
    expect(after.dealsLeft).toBe(before.dealsLeft - 1)
    expect(after.scored).toBeGreaterThan(0)
    expect(after.grid).toHaveLength(ROWS)
  })

  it('deals something different each time within a round', () => {
    // A late round, so the mark stays out of reach and the run keeps playing
    // rather than moving on to the draft after one deal.
    const late = { ...start(), round: 8 }
    const first = playDeal(late)
    const second = playDeal(first)
    expect(first.status).toBe('playing')
    expect(second.grid).not.toEqual(first.grid)
  })

  it('offers a draft once the mark is beaten', () => {
    let run = start()
    // Force the mark within reach so the test does not depend on tuning.
    run = { ...run, scored: markFor(1) - 1 }
    run = playDeal(run)
    expect(run.status).toBe('drafting')
    expect(run.offers).toHaveLength(3)
  })

  it('ends the run when the deals run out short of the mark', () => {
    let run: Run = { ...start(), dealsLeft: 1, scored: 0 }
    run = playDeal(run)
    if (run.status !== 'drafting') {
      expect(run.status).toBe('lost')
    }
  })

  it('refuses to deal once the run is over', () => {
    const lost: Run = { ...start(), status: 'lost' }
    expect(playDeal(lost)).toBe(lost)
  })

  describe('drafting', () => {
    const reachDraft = () => playDeal({ ...start(), scored: markFor(1) - 1 })

    it('takes the chosen card into the deck', () => {
      const drafting = reachDraft()
      const taken = takeDraft(drafting, 0)
      expect(taken.deck).toContainEqual(drafting.offers[0])
    })

    it('swaps rather than adds, so the deck never dilutes', () => {
      // Fifteen cards are dealt however big the deck is, so a growing deck is a
      // shrinking fraction of what you see. Adding made drafting worse than
      // skipping; holding the size makes a draft purely an improvement.
      const drafting = reachDraft()
      expect(takeDraft(drafting, 0).deck).toHaveLength(drafting.deck.length)
    })

    it('drops the weakest card to make room', () => {
      const drafting = reachDraft()
      const weakest = Math.min(...drafting.deck.map((c) => c.rank))
      const before = drafting.deck.filter((c) => c.rank === weakest).length
      const after = takeDraft(drafting, 0).deck.filter((c) => c.rank === weakest).length
      expect(after).toBeLessThan(before)
    })

    it('lets the offer be skipped', () => {
      const drafting = reachDraft()
      const skipped = takeDraft(drafting, null)
      expect(skipped.deck).toHaveLength(drafting.deck.length)
    })

    it('starts the next round clean', () => {
      const next = takeDraft(reachDraft(), 0)
      expect(next.round).toBe(2)
      expect(next.scored).toBe(0)
      expect(next.status).toBe('playing')
      expect(next.dealsLeft).toBe(newRun(1).dealsLeft)
    })

    it('wins the run after the last round', () => {
      let run: Run = { ...start(), round: run0Rounds(), scored: markFor(run0Rounds()) - 1 }
      run = playDeal(run)
      if (run.status === 'drafting') run = takeDraft(run, null)
      expect(run.status).toBe('won')
    })
  })
})

/** The number of rounds a short run holds. */
function run0Rounds() {
  return newRun(1).rounds
}

describe('weakestIndex', () => {
  it('finds the lowest-ranked card', () => {
    const deck = [
      { rank: 5, suit: 'star' as const },
      { rank: 2, suit: 'flower' as const },
      { rank: 7, suit: 'cloud' as const },
    ]
    expect(weakestIndex(deck)).toBe(1)
  })

  it('takes the first when several share the lowest rank', () => {
    const deck = [
      { rank: 3, suit: 'star' as const },
      { rank: 1, suit: 'flower' as const },
      { rank: 1, suit: 'cloud' as const },
    ]
    expect(weakestIndex(deck)).toBe(1)
  })

  /** The screen shows this card as the one leaving, so the two must agree. */
  it('names the card a draft actually replaces', () => {
    const drafting = playDeal({ ...newRun(2026), scored: markFor(1) - 1 })
    const leaving = drafting.deck[weakestIndex(drafting.deck)]
    const after = takeDraft(drafting, 0)

    const count = (deck: typeof after.deck, card: typeof leaving) =>
      deck.filter((c) => c.rank === card.rank && c.suit === card.suit).length
    expect(count(after.deck, leaving)).toBe(count(drafting.deck, leaving) - 1)
  })
})

describe('the cards offered', () => {
  /** Play a run, collecting every draft it offers along the way. */
  const everyOffer = (seeds: number) => {
    const seen: { offers: typeof runSample.offers; deck: typeof runSample.deck }[] = []
    for (let seed = 0; seed < seeds; seed++) {
      let run = newRun(seed)
      for (let step = 0; step < 200; step++) {
        if (run.status === 'won' || run.status === 'lost') break
        if (run.status === 'drafting') {
          seen.push({ offers: run.offers, deck: run.deck })
          run = takeDraft(run, 0)
        } else run = playDeal(run)
      }
    }
    return seen
  }
  const runSample = newRun(1)

  it('never offers the same card twice in one draft', () => {
    for (const { offers } of everyOffer(120)) {
      const ids = offers.map((c) => `${c.suit}${c.rank}`)
      expect(new Set(ids).size, ids.join(' ')).toBe(ids.length)
    }
  })

  it('may offer a card the deck already holds, since stacking a rank is the point', () => {
    // Refusing these was tried and collapsed the win rate from a third to a
    // twentieth: the starting deck holds every rank in every suit, so nothing
    // could ever pair up.
    const anyHeld = everyOffer(120).some(({ offers, deck }) => {
      const held = new Set(deck.map((c) => `${c.suit}${c.rank}`))
      return offers.some((card) => held.has(`${card.suit}${card.rank}`))
    })
    expect(anyHeld).toBe(true)
  })

  it('never offers a card at or below the one it would replace', () => {
    for (const { offers, deck } of everyOffer(120)) {
      const weakest = Math.min(...deck.map((c) => c.rank))
      for (const card of offers) expect(card.rank).toBeGreaterThan(weakest)
    }
  })

  it('still offers three cards', () => {
    for (const { offers } of everyOffer(40)) expect(offers).toHaveLength(3)
  })
})
