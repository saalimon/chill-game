import styles from './SoundToggle.module.css'

/**
 * Sound on/off, drawn rather than set in an emoji.
 *
 * A glossy multicoloured emoji here would be the one thing on the sheet not
 * made of ink — the same reason the board's tokens are drawn.
 */
export function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
        <path
          d="M4.5 9.4h3.2L12 5.7v12.6L7.7 14.6H4.5z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {muted ? (
          <path
            d="M15.6 9.7l5 4.6M20.6 9.7l-5 4.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M15.4 9.6a4.4 4.4 0 0 1 0 4.8M18.2 7.2a8.4 8.4 0 0 1 0 9.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  )
}
