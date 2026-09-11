import { cardId, type Card } from '@/game/tally/cards'
import { MiniCard } from './MiniCard'
import styles from './MiniHand.module.css'

/**
 * Five cards, small enough to sit in a table row.
 *
 * The doodle is a hint at the suit rather than a readable shape at this size,
 * so the ink does most of the work — but a flush still reads instantly as five
 * of one colour, which is what the rankings table needs to show.
 */
export function MiniHand({ cards, label }: { cards: Card[]; label: string }) {
  return (
    <span className={styles.hand} role="img" aria-label={label}>
      {cards.map((card) => (
        <MiniCard key={cardId(card)} card={card} />
      ))}
    </span>
  )
}
