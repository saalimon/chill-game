import { describe, expect, it } from 'vitest'
import { cardId } from '@/game/tally/cards'
import { HAND_TYPES, classify } from '@/game/tally/hands'
import { EXAMPLE_HANDS } from './exampleHands'

describe('the worked examples in the rankings table', () => {
  it('covers every hand type', () => {
    expect(Object.keys(EXAMPLE_HANDS).sort()).toEqual([...HAND_TYPES].sort())
  })

  /**
   * The point of the whole file: an illustration that quietly stopped being the
   * hand it is labelled would teach the game wrongly, and nothing else would
   * catch it.
   */
  it('really is the hand it claims to be', () => {
    for (const type of HAND_TYPES) {
      expect(classify(EXAMPLE_HANDS[type]).type, type).toBe(type)
    }
  })

  it('shows five cards each', () => {
    for (const type of HAND_TYPES) expect(EXAMPLE_HANDS[type], type).toHaveLength(5)
  })

  it('never shows the same card twice, since only one of each exists', () => {
    for (const type of HAND_TYPES) {
      const ids = EXAMPLE_HANDS[type].map(cardId)
      expect(new Set(ids).size, type).toBe(5)
    }
  })
})
