import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SIZES } from '@/game/starbattle/generate'
import { dailySpec } from '@/game/starbattle/daily'
import { formatDuration } from '@/lib/format'
import { isFirebaseConfigured } from '@/lib/firebase/app'
import { signInWithGoogle, SignInError } from '@/lib/firebase/auth'
import type { Account } from '@/lib/firebase/auth'
import type { Stats } from '@/lib/firebase/types'
import styles from './Home.module.css'

const TIERS: Record<number, string> = {
  5: 'gentle',
  6: 'easy',
  7: 'steady',
  8: 'tricky',
  9: 'deep',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Home({
  account,
  stats,
  queued,
}: {
  account: Account
  stats: Stats
  queued: number
}) {
  const [notice, setNotice] = useState<string | null>(null)
  const daily = dailySpec()
  const [, month, day] = daily.date.split('-')
  const bestOverall = Object.values(stats.bySize).reduce<number | null>(
    (best, s) => (best === null ? s.bestMs : Math.min(best, s.bestMs)),
    null,
  )

  async function onSignIn() {
    setNotice(null)
    try {
      const { merged } = await signInWithGoogle()
      if (!merged) setNotice('Signed in. Progress from this device stays on this device.')
    } catch (error) {
      setNotice(error instanceof SignInError ? error.message : 'Sign-in did not complete.')
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <div>
          <h1 className={styles.wordmark}>Chilled</h1>
          <p className={styles.tagline}>Small puzzles, no timer pressure.</p>
        </div>
      </header>

      <Link to="/daily" className={styles.daily}>
        <div>
          <span className={styles.eyebrow}>Today</span>
          <h2 className={styles.cardTitle}>Daily puzzle</h2>
          <p className={styles.dailyMeta}>
            {Number(day)} {MONTHS[Number(month) - 1]} · {daily.size} × {daily.size} · same board for
            everyone
          </p>
        </div>
        <span className={styles.dailyGlyph} aria-hidden="true">
          ◔
        </span>
      </Link>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Emoji Star Battle</h2>
          <span className={styles.eyebrow}>Pick a size</span>
        </div>
        <p className={styles.blurb}>
          One emoji in every row, every column and every colour — and no two may touch, not even at
          the corners.
        </p>
        <ul className={styles.how}>
          <li>
            <b>Tap</b> a square to rule it out
          </li>
          <li>
            <b>Double tap</b> to place the emoji
          </li>
          <li>Three wrong guesses ends the round</li>
        </ul>
        <nav className={styles.sizes}>
          {SIZES.map((size) => (
            <Link key={size} to={`/play/${size}`} className={styles.size}>
              <span className={styles.sizeNum}>{size}</span>
              <span className={styles.sizeTier}>{TIERS[size]}</span>
            </Link>
          ))}
        </nav>
      </section>

      <section className={styles.stats} aria-label="your progress">
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.solved}</div>
          <div className={styles.statLabel}>SOLVED</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.streak.current}</div>
          <div className={styles.statLabel}>DAY STREAK</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {bestOverall === null ? '—' : formatDuration(bestOverall)}
          </div>
          <div className={styles.statLabel}>BEST TIME</div>
        </div>
      </section>

      {isFirebaseConfigured && (
        <div className={styles.account}>
          <span>
            {!account.ready
              ? 'Connecting…'
              : account.isGuest
                ? 'Playing as a guest'
                : `Signed in as ${account.name ?? 'you'}`}
            {queued > 0 && <span className={styles.offline}> · {queued} waiting to sync</span>}
          </span>
          {account.isGuest && (
            <button type="button" className={styles.signIn} onClick={onSignIn}>
              Save progress
            </button>
          )}
        </div>
      )}

      {notice && <p className={styles.blurb}>{notice}</p>}
    </main>
  )
}
