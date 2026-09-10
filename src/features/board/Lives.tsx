import { MAX_LIVES } from '@/features/session/session'
import styles from './Lives.module.css'

/** Guesses left, as a row of pips that empty out as they are spent. */
export function Lives({ left }: { left: number }) {
  return (
    <span
      className={styles.lives}
      aria-label={`${left} of ${MAX_LIVES} guesses left`}
    >
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span key={i} className={`${styles.pip} ${i < left ? '' : styles.spent}`} aria-hidden="true" />
      ))}
    </span>
  )
}
