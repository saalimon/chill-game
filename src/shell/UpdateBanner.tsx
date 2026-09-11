import styles from './UpdateBanner.module.css'

/**
 * Offered rather than forced.
 *
 * A new build is only taken automatically when the player is on the games list.
 * Reloading in the middle of a puzzle would throw away the board they are
 * working on, so there it waits for them to say when.
 */
export function UpdateBanner({ onApply }: { onApply: () => void }) {
  return (
    <div className={styles.banner} role="status">
      <span>A newer version is ready.</span>
      <button type="button" className={styles.action} onClick={onApply}>
        Reload
      </button>
    </div>
  )
}
