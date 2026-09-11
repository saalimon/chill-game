import { Doodle } from '@/features/board/doodles/Doodle'
import { cardId, suitOf, type Card } from '@/game/tally/cards'
import styles from './MiniHand.module.css'

/**
 * Five cards, small enough to sit in a table row.
 *
 * Small enough that the doodle is a hint at the suit rather than a readable
 * shape, so the ink does most of the work — but a flush still reads instantly
 * as five of one colour, which is exactly what the table needs to show.
 */
export function MiniHand({ cards, label }: { cards: Card[]; label: string }) {
  return (
    <span className={styles.hand} role="img" aria-label={label}>
      {cards.map((card) => {
        const suit = suitOf(card.suit)
        return (
          <span
            key={cardId(card)}
            className={styles.card}
            style={{ '--suit-ink': `var(--pen-${suit.ink})` } as React.CSSProperties}
          >
            <span className={styles.rank}>{card.rank}</span>
            <Doodle id={suit.glyph} className={styles.suit} />
          </span>
        )
      })}
    </span>
  )
}
