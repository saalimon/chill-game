import { describe, expect, it } from 'vitest'
import { mulberry32, randInt } from '@/game/grid/rng'
import { HAND_TYPES, classify, compareHands, type HandType } from './hands'
import { MAX_RANK, SUIT_IDS, fullDeck, type Card } from './cards'

/** `3s` is the three of stars. */
const hand = (spec: string): Card[] =>
  spec.split(' ').map((token) => ({
    rank: Number(token.slice(0, -1)),
    suit: { s: 'star', f: 'flower', l: 'cloud', m: 'moon' }[token.slice(-1)] as Card['suit'],
  }))

const HANDS: Record<HandType, string> = {
  highCard: '2s 5f 7l 9m 3s',
  pair: '4s 4f 7l 9m 2s',
  twoPair: '4s 4f 7l 7m 2s',
  threeOfAKind: '4s 4f 4l 9m 2s',
  straight: '3s 4f 5l 6m 7s',
  flush: '2s 5s 7s 9s 3s',
  fullHouse: '4s 4f 4l 9m 9s',
  fourOfAKind: '4s 4f 4l 4m 2s',
  straightFlush: '3s 4s 5s 6s 7s',
}

describe('classify', () => {
  it('recognises every hand type', () => {
    for (const [type, spec] of Object.entries(HANDS)) {
      expect(classify(hand(spec)).type, spec).toBe(type)
    }
  })

  it('reads a straight in any order', () => {
    expect(classify(hand('7s 3f 5l 4m 6s')).type).toBe('straight')
  })

  it('does not call a gap a straight', () => {
    expect(classify(hand('3s 4f 5l 6m 8s')).type).toBe('highCard')
  })

  it('does not wrap around from 9 to 1, since there are no aces here', () => {
    expect(classify(hand('8s 9f 1l 2m 3s')).type).toBe('highCard')
  })

  it('prefers the better reading when a hand qualifies twice', () => {
    // Also contains a pair and three of a kind, but a full house outranks both.
    expect(classify(hand('4s 4f 4l 9m 9s')).type).toBe('fullHouse')
  })

  describe('which cards score', () => {
    it('counts only the pair', () => {
      expect(classify(hand('4s 4f 7l 9m 2s')).scoring).toHaveLength(2)
    })

    it('counts only the four of a kind', () => {
      expect(classify(hand('4s 4f 4l 4m 2s')).scoring).toHaveLength(4)
    })

    it('counts the single best card for a high card', () => {
      const { scoring } = classify(hand('2s 5f 7l 9m 3s'))
      expect(scoring).toHaveLength(1)
      expect(scoring[0].rank).toBe(9)
    })

    it('counts all five for a straight, a flush and a full house', () => {
      for (const type of ['straight', 'flush', 'fullHouse'] as const) {
        expect(classify(hand(HANDS[type])).scoring, type).toHaveLength(5)
      }
    })

    it('never reports a card that is not in the hand', () => {
      const cards = hand('4s 4f 7l 9m 2s')
      for (const card of classify(cards).scoring) expect(cards).toContainEqual(card)
    })
  })
})

describe('compareHands', () => {
  it('orders the types from high card up to straight flush', () => {
    const ordered = HAND_TYPES.map((type) => classify(hand(HANDS[type])))
    for (let i = 1; i < ordered.length; i++) {
      expect(compareHands(ordered[i], ordered[i - 1]), HAND_TYPES[i]).toBeGreaterThan(0)
    }
  })

  it('is consistent both ways round', () => {
    const a = classify(hand(HANDS.flush))
    const b = classify(hand(HANDS.pair))
    expect(Math.sign(compareHands(a, b))).toBe(-Math.sign(compareHands(b, a)))
  })

  it('calls a hand equal to itself', () => {
    const a = classify(hand(HANDS.straight))
    expect(compareHands(a, a)).toBe(0)
  })
})

describe('against an independent reading', () => {
  /** Deliberately written a different way, to disagree if either is wrong. */
  function naive(cards: Card[]): HandType {
    const counts = new Map<number, number>()
    for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
    const groups = [...counts.values()].sort((a, b) => b - a)
    const ranks = cards.map((c) => c.rank).sort((a, b) => a - b)

    const isFlush = new Set(cards.map((c) => c.suit)).size === 1
    let isStraight = new Set(ranks).size === 5
    for (let i = 1; i < ranks.length && isStraight; i++) {
      if (ranks[i] !== ranks[i - 1] + 1) isStraight = false
    }

    if (isStraight && isFlush) return 'straightFlush'
    if (groups[0] === 4) return 'fourOfAKind'
    if (groups[0] === 3 && groups[1] === 2) return 'fullHouse'
    if (isFlush) return 'flush'
    if (isStraight) return 'straight'
    if (groups[0] === 3) return 'threeOfAKind'
    if (groups[0] === 2 && groups[1] === 2) return 'twoPair'
    if (groups[0] === 2) return 'pair'
    return 'highCard'
  }

  it('agrees on thousands of random hands', () => {
    const deck = fullDeck()
    const rng = mulberry32(20260911)
    for (let i = 0; i < 4000; i++) {
      const picked: Card[] = []
      const pool = [...deck]
      for (let n = 0; n < 5; n++) picked.push(...pool.splice(randInt(rng, pool.length), 1))
      expect(classify(picked).type, JSON.stringify(picked)).toBe(naive(picked))
    }
  })

  it('agrees on hands built to be near misses', () => {
    const rng = mulberry32(4242)
    for (let i = 0; i < 2000; i++) {
      // Cluster ranks tightly so straights and near-straights come up often.
      const base = 1 + randInt(rng, MAX_RANK - 4)
      const cards: Card[] = Array.from({ length: 5 }, () => ({
        rank: Math.min(MAX_RANK, base + randInt(rng, 6)),
        suit: SUIT_IDS[randInt(rng, SUIT_IDS.length)],
      }))
      // Skip impossible hands: only four of each rank exist.
      const counts = new Map<string, number>()
      let legal = true
      for (const c of cards) {
        const k = `${c.suit}${c.rank}`
        counts.set(k, (counts.get(k) ?? 0) + 1)
        if (counts.get(k)! > 1) legal = false
      }
      if (!legal) continue
      expect(classify(cards).type, JSON.stringify(cards)).toBe(naive(cards))
    }
  })
})

describe('groups larger than four', () => {
  /**
   * Only four of each rank exist, so this should be unreachable — but it was
   * reachable through a duplicated card, and fell through every branch to score
   * as a high card: the strongest row in the game paying the least. Reading it
   * as four of a kind fails safe if it is ever reachable again.
   */
  it('reads five of a rank as four of a kind rather than a high card', () => {
    const five: Card[] = [
      { rank: 3, suit: 'star' },
      { rank: 3, suit: 'flower' },
      { rank: 3, suit: 'cloud' },
      { rank: 3, suit: 'moon' },
      { rank: 3, suit: 'star' },
    ]
    expect(classify(five).type).toBe('fourOfAKind')
    expect(classify(five).scoring.length).toBeGreaterThanOrEqual(4)
  })
})
