import { mulberry32, randInt, type Rng } from '@/game/grid/rng'
import { MAX_RANK, SUIT_IDS, cardId, startingDeck, type Card } from './cards'
import { deal } from './deal'
import { scoreGrid, type GridScore } from './score'

/** Rounds in a short run, and deals to beat each mark. */
export const SHORT_ROUNDS = 8
export const DEALS_PER_ROUND = 4
/** Cards offered when a round is cleared. */
export const DRAFT_OFFERS = 3

export type RunStatus = 'playing' | 'drafting' | 'won' | 'lost'

export interface Run {
  seed: number
  rounds: number
  round: number
  /** Points banked this round, against the mark. */
  scored: number
  dealsLeft: number
  deck: Card[]
  /** The grid as it lies, and what it scored. Null before the first deal. */
  grid: Card[][] | null
  lastScore: GridScore | null
  offers: Card[]
  status: RunStatus
  /** Deals played across the whole run, for the run-end summary. */
  dealsPlayed: number
  /** Best single deal of the run. */
  bestDeal: number
  /** Everything banked across every round. */
  totalScored: number
}

/**
 * The mark to beat in a given round.
 *
 * Grows faster than the deck improves, so a run tightens rather than coasting.
 * These two numbers were chosen by measuring, not by feel: across two thousand
 * simulated runs they leave a naive drafter winning about a third of the time,
 * a player who builds for flushes about two in five, and someone who drafts
 * nothing about one in eight. `simulate.test.ts` holds that shape in place.
 */
export function markFor(round: number): number {
  return Math.round(150 * Math.pow(1.31, round - 1))
}

/**
 * Every draw in a run comes from its seed, so the same number plays the same
 * run — which is what lets a run be saved as a seed plus the choices made, and
 * what lets the balance tests measure thousands of runs.
 */
function rngFor(run: Pick<Run, 'seed' | 'round' | 'dealsPlayed'>, salt: number): Rng {
  return mulberry32((run.seed ^ (run.round * 0x9e3779b1) ^ (run.dealsPlayed * 0x85ebca6b)) + salt)
}

export function newRun(seed: number, rounds = SHORT_ROUNDS): Run {
  return {
    seed,
    rounds,
    round: 1,
    scored: 0,
    dealsLeft: DEALS_PER_ROUND,
    deck: startingDeck(),
    grid: null,
    lastScore: null,
    offers: [],
    status: 'playing',
    dealsPlayed: 0,
    bestDeal: 0,
    totalScored: 0,
  }
}

/**
 * Three cards to choose between, no two the same.
 *
 * Offers lean towards ranks the deck already holds, because a lone high card is
 * close to worthless here: fifteen of a twenty-card deck are dealt every time,
 * so an unmatched card mostly displaces one that was completing a pair. Measured
 * over two thousand runs, purely high-rank offers made drafting worse than
 * skipping altogether.
 *
 * Copies are allowed — a built deck may hold four 6s, and stacking a rank is the
 * whole point of pairing up. Refusing cards the deck already held was tried and
 * collapsed the win rate from a third to a twentieth: the starting deck holds
 * every rank in every suit, so nothing could ever pair.
 *
 * What is refused is the same card twice in one draft, which is a choice
 * between identical options, and anything at or below the weakest card, since a
 * draft swaps that card out and taking a 1 to replace a 1 changes nothing.
 */
function makeOffers(run: Run): Card[] {
  const rng = rngFor(run, 0x5eed)
  const weakest = Math.min(...run.deck.map((card) => card.rank))
  const ranksHeld = [...new Set(run.deck.map((card) => card.rank))].filter((r) => r > weakest)

  const offers: Card[] = []
  const taken = new Set<string>()

  // Bounded: there are always far more distinct cards available than offers.
  for (let attempt = 0; attempt < 60 && offers.length < DRAFT_OFFERS; attempt++) {
    const pairUp = rng() < 0.7 && ranksHeld.length > 0
    const rank = pairUp
      ? ranksHeld[randInt(rng, ranksHeld.length)]
      : Math.min(MAX_RANK, 3 + randInt(rng, MAX_RANK - 2))

    const card = {
      rank: Math.max(rank, weakest + 1),
      suit: SUIT_IDS[randInt(rng, SUIT_IDS.length)],
    }
    if (taken.has(cardId(card))) continue
    taken.add(cardId(card))
    offers.push(card)
  }

  return offers
}

/**
 * Which card a draft would drop.
 *
 * Exported because the draft screen shows the player exactly which card is
 * about to leave, and a screen that worked this out for itself could disagree
 * with what the swap actually does.
 */
export function weakestIndex(deck: readonly Card[]): number {
  let weakest = 0
  for (let i = 1; i < deck.length; i++) {
    if (deck[i].rank < deck[weakest].rank) weakest = i
  }
  return weakest
}

/**
 * Take a card into the deck, dropping the weakest one to make room.
 *
 * Exported so the draft screen can show the deck the player is about to have.
 * Working it out separately there would risk the preview disagreeing with what
 * actually happens.
 *
 * Drafting swaps rather than adds, because adding dilutes: fifteen cards are
 * dealt however big the deck is, so every extra card makes the deck a smaller
 * fraction of what you see and breaks up the pairs already in it. Measured over
 * two thousand runs, adding cards made drafting strictly worse than skipping —
 * a deck-builder where building the deck hurts. Holding the deck at a fixed size
 * makes a draft an improvement in composition and nothing else.
 */
export function swapIn(deck: readonly Card[], taken: Card): Card[] {
  const next = [...deck]
  next[weakestIndex(deck)] = taken
  return next
}

/**
 * Play one deal: lay the cards out, bank what they score, spend a deal.
 *
 * Clearing the mark opens the draft — or wins the run, if that was the last
 * round. Running out of deals short of the mark ends it.
 */
export function playDeal(run: Run): Run {
  if (run.status !== 'playing') return run

  const grid = deal(run.deck, rngFor(run, 0))
  const lastScore = scoreGrid(grid)
  const scored = run.scored + lastScore.total

  const next: Run = {
    ...run,
    grid,
    lastScore,
    scored,
    dealsLeft: run.dealsLeft - 1,
    dealsPlayed: run.dealsPlayed + 1,
    bestDeal: Math.max(run.bestDeal, lastScore.total),
    totalScored: run.totalScored + lastScore.total,
  }

  if (scored >= markFor(run.round)) {
    if (run.round >= run.rounds) return { ...next, status: 'won' }
    return { ...next, status: 'drafting', offers: makeOffers(next) }
  }
  if (next.dealsLeft <= 0) return { ...next, status: 'lost' }
  return next
}

/**
 * Take one of the offered cards, or skip, and begin the next round.
 *
 * `choice` is the index of the offer taken, or null to skip.
 */
export function takeDraft(run: Run, choice: number | null): Run {
  if (run.status !== 'drafting') return run

  const taken = choice === null ? null : run.offers[choice]
  const deck = taken ? swapIn(run.deck, taken) : run.deck

  if (run.round >= run.rounds) return { ...run, deck, status: 'won', offers: [] }

  return {
    ...run,
    deck,
    round: run.round + 1,
    scored: 0,
    dealsLeft: DEALS_PER_ROUND,
    grid: null,
    lastScore: null,
    offers: [],
    status: 'playing',
  }
}
