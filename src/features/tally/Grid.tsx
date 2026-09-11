import { arrangeRow } from '@/game/tally/arrange'
import { cardId, type Card as CardModel } from '@/game/tally/cards'
import type { GridScore } from '@/game/tally/score'
import { Card } from './Card'
import styles from './Grid.module.css'

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

interface GridProps {
  rows: CardModel[][]
  score: GridScore | null
  /** Changes every deal, so the tidy-up animation replays. */
  dealNumber: number
}

/**
 * The cards as they lie: five across, three down.
 *
 * Each row is sorted by rank, so matching cards sit together and a hand can be
 * read rather than hunted for. The cards land where they were dealt and then
 * slide into place, which keeps the deal visible while making clear that the
 * tidying is only presentation — a poker hand is a set, and where a card fell
 * never meant anything.
 */
export function Grid({ rows, score, dealNumber }: GridProps) {
  return (
    <div className={styles.grid}>
      {rows.map((row, r) => {
        const rowScore = score?.rows[r]
        const scoring = new Set((rowScore?.hand.scoring ?? []).map(cardId))
        const arranged = arrangeRow(row)

        return (
          <div className={styles.row} key={r}>
            <div className={styles.cards}>
              {arranged.map(({ card, dealtAt }, position) => (
                <div
                  // Remounting on every deal is what replays the slide.
                  key={`${dealNumber}-${cardId(card)}`}
                  className={styles.slot}
                  style={{ '--shift': dealtAt - position } as React.CSSProperties}
                >
                  <Card card={card} scoring={scoring.has(cardId(card))} />
                </div>
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
