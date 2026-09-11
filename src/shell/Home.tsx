import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GAME_IDS, GAMES, type GameDef } from '@/game/starbattle/games'
import { dailySpec } from '@/game/starbattle/daily'
import { formatDuration } from '@/lib/format'
import { isFirebaseConfigured } from '@/lib/firebase/app'
import { signInWithGoogle, SignInError } from '@/lib/firebase/auth'
import type { Account } from '@/lib/firebase/auth'
import type { Stats } from '@/lib/firebase/types'
import styles from './Home.module.css'

/** What each board size feels like, per game. */
const TIERS: Record<string, string> = {
  'queens:5': 'gentle',
  'queens:6': 'easy',
  'queens:7': 'steady',
  'queens:8': 'tricky',
  'queens:9': 'deep',
  'twoNotTouch:8': 'steady',
  'twoNotTouch:9': 'tricky',
  'twoNotTouch:10': 'deep',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function GameCard({ game }: { game: GameDef }) {
  return (
    <section className={styles.card}>
      <span className={styles.pin} aria-hidden="true" />
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{game.name}</h2>
        <span className={styles.eyebrow}>Pick a size</span>
      </div>
      <p className={styles.blurb}>{game.blurb}</p>
      <nav className={styles.sizes}>
        {game.sizes.map((size) => (
          <Link key={size} to={`/play/${game.id}/${size}`} className={styles.size}>
            <span className={styles.sizeNum}>{size}</span>
            <span className={styles.sizeTier}>{TIERS[`${game.id}:${size}`]}</span>
          </Link>
        ))}
      </nav>
    </section>
  )
}

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
        <h1 className={styles.wordmark}>Chilled</h1>
        <p className={styles.tagline}>Small puzzles, no timer pressure.</p>
      </header>

      <Link to="/daily" className={styles.daily}>
        <div>
          <span className={styles.eyebrow}>Today</span>
          <h2 className={styles.cardTitle}>Daily puzzle</h2>
          <p className={styles.dailyMeta}>
            {Number(day)} {MONTHS[Number(month) - 1]} · {GAMES[daily.game].name} · {daily.size} ×{' '}
            {daily.size}
          </p>
        </div>
        <span className={styles.dailyGlyph} aria-hidden="true">
          ◔
        </span>
      </Link>

      {GAME_IDS.map((id) => (
        <GameCard key={id} game={GAMES[id]} />
      ))}

      {/* Both games are played the same way, so this is said once. */}
      <ul className={styles.how}>
        <li>
          <b>Tap</b> a square to rule it out
        </li>
        <li>
          <b>Double tap</b> to place the doodle
        </li>
        <li>Three wrong guesses ends the round</li>
      </ul>

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

      {notice && <p className={styles.notice}>{notice}</p>}
    </main>
  )
}
