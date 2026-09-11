import styles from './HelpButton.module.css'

/** Opens the how-to sheet. Drawn, like everything else on the page. */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.button} onClick={onClick} aria-label="How to play">
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
        <path
          d="M8.6 8.8a3.5 3.5 0 1 1 4.6 3.4c-.9.3-1.3 1-1.3 1.9v.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="11.9" cy="18.2" r="1.25" fill="currentColor" />
      </svg>
    </button>
  )
}
