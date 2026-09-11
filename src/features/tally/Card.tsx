import { Doodle } from '@/features/board/doodles/Doodle'
import { suitOf, type Card as CardModel } from '@/game/tally/cards'
import styles from './Card.module.css'

/**
 * One card: a handwritten rank over its suit's doodle, both in the suit's ink.
 *
 * The suit is carried twice, by shape and by colour, so it reads without relying
 * on either alone — the same reasoning as the puzzle boards.
 */
export function Card({ card, scoring }: { card: CardModel; scoring: boolean }) {
  const suit = suitOf(card.suit)
  return (
    <div
      className={`${styles.card} ${scoring ? styles.scoring : ''}`}
      style={{ '--suit-ink': `var(--pen-${suit.ink})` } as React.CSSProperties}
      aria-label={`${card.rank} of ${suit.name}`}
    >
      <span className={styles.rank}>{card.rank}</span>
      <Doodle id={suit.glyph} className={styles.suit} />
    </div>
  )
}
