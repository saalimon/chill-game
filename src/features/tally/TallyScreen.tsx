import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DoodleSprite } from '@/features/board/doodles/Doodle'
import { suitOf } from '@/game/tally/cards'
import { Card } from './Card'
import { Grid } from './Grid'
import { useTallyRun } from './useTallyRun'
import { HelpButton } from '@/features/help/HelpButton'
import { HowToPlay } from '@/features/help/HowToPlay'
import styles from './TallyScreen.module.css'

export function TallyScreen() {
  const { run, deal, draft, restart, mark } = useTallyRun()
  const [helpOpen, setHelpOpen] = useState(false)
  const over = run.status === 'won' || run.status === 'lost'
  const progress = Math.min(1, run.scored / mark)

  return (
    <div className={styles.screen}>
      <DoodleSprite />
      <div className={styles.sheet}>
        <span className={styles.pin} aria-hidden="true" />

        <header className={styles.bar}>
          <Link to="/" className={styles.back}>
            ← Games
          </Link>
          <h1 className={styles.title}>Tally</h1>
          <span className={styles.right}>
            <span className={styles.round}>
              Round {run.round}/{run.rounds}
            </span>
            <HelpButton onClick={() => setHelpOpen(true)} />
          </span>
        </header>

        <section className={styles.mark} aria-label="score against the mark">
          <div className={styles.markRow}>
            <span className={styles.scored}>{run.scored}</span>
            <span className={styles.markTarget}>of {mark}</span>
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
          </div>
          <div className={styles.deals}>
            {run.dealsLeft} deal{run.dealsLeft === 1 ? '' : 's'} left
          </div>
        </section>

        <div className={styles.board}>
          {run.grid ? (
            <Grid rows={run.grid} score={run.lastScore} />
          ) : (
            <p className={styles.empty}>Deal your cards across the page.</p>
          )}
        </div>

        {over ? (
          <div className={styles.done}>
            <h2 className={styles.doneTitle}>{run.status === 'won' ? 'Run complete' : 'Run over'}</h2>
            <p className={styles.doneMeta}>
              Reached round {run.round} · {run.dealsPlayed} deals · best deal {run.bestDeal}
            </p>
            <button type="button" className={styles.primary} onClick={restart}>
              New run
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.deal}
            onClick={deal}
            disabled={run.status !== 'playing'}
          >
            Deal
          </button>
        )}
      </div>

      {helpOpen && <HowToPlay game="tally" onClose={() => setHelpOpen(false)} />}

      {run.status === 'drafting' && (
        <div className={styles.draftLayer} role="dialog" aria-label="take a card">
          <div className={styles.draft}>
            <h2 className={styles.draftTitle}>Take a card</h2>
            <p className={styles.draftNote}>It replaces the weakest card in your deck.</p>
            <div className={styles.offers}>
              {run.offers.map((card, i) => (
                <button
                  key={`${card.suit}${card.rank}-${i}`}
                  type="button"
                  className={styles.offer}
                  onClick={() => draft(i)}
                  aria-label={`Take the ${card.rank} of ${suitOf(card.suit).name}`}
                >
                  <Card card={card} scoring={false} />
                </button>
              ))}
            </div>
            <button type="button" className={styles.skip} onClick={() => draft(null)}>
              Keep my deck
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
