import type { Card as CardModel } from '@/game/tally/cards'
import type { GridScore } from '@/game/tally/score'
import { Card } from './Card'
import styles from './Grid.module.css'

const key = (card: CardModel) => `${card.suit}${card.rank}`

/**
 * The cards as they lie: five across, three down.
 *
 * Each row is its own hand, so each row is labelled with what it made and what
 * it paid — the scoring has to be legible or the deck-building means nothing.
 */
export function Grid({ rows, score }: { rows: CardModel[][]; score: GridScore | null }) {
  return (
    <div className={styles.grid}>
      {rows.map((row, r) => {
        const rowScore = score?.rows[r]
        const scoring = new Set((rowScore?.hand.scoring ?? []).map(key))
        return (
          <div className={styles.row} key={r}>
            <div className={styles.cards}>
              {row.map((card) => (
                <Card key={key(card)} card={card} scoring={scoring.has(key(card))} />
              ))}
            </div>
            {rowScore && (
              <div className={styles.readout}>
                <span className={styles.handName}>{HAND_NAMES[rowScore.hand.type]}</span>
                <span className={styles.sum}>
                  {rowScore.chips} × {rowScore.mult}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const HAND_NAMES: Record<string, string> = {
  highCard: 'High card',
  pair: 'Pair',
  twoPair: 'Two pair',
  threeOfAKind: 'Three of a kind',
  straight: 'Straight',
  flush: 'Flush',
  fullHouse: 'Full house',
  fourOfAKind: 'Four of a kind',
  straightFlush: 'Straight flush',
}
