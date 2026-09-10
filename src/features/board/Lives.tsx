import { MAX_LIVES } from '@/features/session/session'
import styles from './Lives.module.css'

/**
 * Guesses left, as push pins.
 *
 * A spent guess leaves the hole its pin came out of, so the count reads at a
 * glance without a number — and the metaphor does real work instead of
 * decorating.
 */
export function Lives({ left }: { left: number }) {
  return (
    <span className={styles.lives} aria-label={`${left} of ${MAX_LIVES} guesses left`}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span
          key={i}
          className={`${styles.pin} ${i < left ? '' : styles.hole}`}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}
