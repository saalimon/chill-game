import { Doodle } from '@/features/board/doodles/Doodle'
import { suitOf, type Card } from '@/game/tally/cards'
import styles from './MiniCard.module.css'

export type MiniCardState = 'normal' | 'leaving' | 'arriving'

/** A card small enough to sit in a table row or a twenty-card strip. */
export function MiniCard({ card, state = 'normal' }: { card: Card; state?: MiniCardState }) {
  const suit = suitOf(card.suit)
  return (
    <span
      className={`${styles.card} ${state === 'leaving' ? styles.leaving : ''} ${
        state === 'arriving' ? styles.arriving : ''
      }`}
      style={{ '--suit-ink': `var(--pen-${suit.ink})` } as React.CSSProperties}
      aria-label={`${card.rank} of ${suit.name}${state === 'leaving' ? ', leaving' : ''}${
        state === 'arriving' ? ', new' : ''
      }`}
    >
      <span className={styles.rank}>{card.rank}</span>
      <Doodle id={suit.glyph} className={styles.suit} />
    </span>
  )
}
