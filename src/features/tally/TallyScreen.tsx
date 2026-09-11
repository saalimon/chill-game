import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DoodleSprite } from '@/features/board/doodles/Doodle'
import { suitOf, type Card as CardModel } from '@/game/tally/cards'
import { markFor, swapIn, weakestIndex } from '@/game/tally/run'
import { DeckStrip } from './DeckStrip'
import { Card } from './Card'
import { Grid } from './Grid'
import { useTallyRun } from './useTallyRun'
import { HelpButton } from '@/features/help/HelpButton'
import { HowToPlay } from '@/features/help/HowToPlay'
import type { RunRecord } from '@/lib/firebase/types'
import styles from './TallyScreen.module.css'

export function TallyScreen({ onRunEnd }: { onRunEnd?: (record: RunRecord) => void } = {}) {
  const { run, deal, draft, restart, mark } = useTallyRun()
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  /**
   * What the last draft did, kept only to show it.
   *
   * The choice is committed the moment it is made — holding it until a confirm
   * meant a backgrounded tab silently undid the pick — so this is a snapshot for
   * the screen, not pending state.
   */
  const [tookCard, setTookCard] = useState<{ card: CardModel; before: CardModel[]; at: number } | null>(null)
  const over = run.status === 'won' || run.status === 'lost'

  // Report the finished run once, so it leaves a trace on the games list.
  const reported = useRef<number | null>(null)
  useEffect(() => {
    if (!over || reported.current === run.seed) return
    reported.current = run.seed
    onRunEnd?.({
      id: `tally-${run.seed}-${Date.now()}`,
      game: 'tally',
      seed: run.seed,
      rounds: run.rounds,
      won: run.status === 'won',
      round: run.round,
      deals: run.dealsPlayed,
      totalScored: run.totalScored,
      bestDeal: run.bestDeal,
      completedAt: Date.now(),
    })
  }, [over, run, onRunEnd])
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
            <HelpButton onClick={() => setHelpOpen(true)} />
            <button
              type="button"
              className={styles.newRun}
              onClick={() => setConfirmNew(true)}
              aria-label="Start a new run"
            >
              ⟲
            </button>
          </span>
        </header>

        <section className={styles.mark} aria-label="score against the mark">
          <div className={styles.markRow}>
            <span className={styles.scored}>{run.scored}</span>
            <span className={styles.markTarget}>of {mark}</span>
            {run.lastScore && run.status === 'playing' && (
              <span key={run.dealsPlayed} className={styles.gained}>
                +{run.lastScore.total}
              </span>
            )}
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
          </div>
          <div className={styles.deals}>
            Round {run.round} of {run.rounds} · {run.dealsLeft} deal
            {run.dealsLeft === 1 ? '' : 's'} left
          </div>
        </section>

        <div className={styles.board}>
          {run.grid ? (
            <Grid rows={run.grid} score={run.lastScore} dealNumber={run.dealsPlayed} />
          ) : (
            <p className={styles.empty}>Deal your cards across the page.</p>
          )}
        </div>

        {over ? (
          <div className={`${styles.done} ${run.status === 'won' ? styles.won : styles.lost}`}>
            <h2 className={styles.doneTitle}>
              {run.status === 'won' ? `You beat all ${run.rounds} marks` : 'Out of deals'}
            </h2>
            <p className={styles.doneMeta}>
              {run.status === 'won'
                ? `${run.dealsPlayed} deals · best deal ${run.bestDeal}`
                : `Round ${run.round} fell short — ${run.scored} of ${mark}`}
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

      {(run.status === 'drafting' || tookCard) && (
        <div className={styles.draftLayer} role="dialog" aria-label="take a card">
          <div className={styles.draft}>
            {tookCard === null ? (
              <>
                {/* Beating the mark used to pass in silence, straight to an
                    offer that read as unrelated. Say what just happened. */}
                <span className={styles.cleared}>Round {run.round} cleared</span>
                <h2 className={styles.draftTitle}>Take a card</h2>
                <p className={styles.draftNote}>
                  {run.scored} of {mark}, with {run.dealsLeft} deal
                  {run.dealsLeft === 1 ? '' : 's'} to spare. Next round needs{' '}
                  <b>{markFor(run.round + 1)}</b>.
                </p>
                <div className={styles.offers}>
                  {run.offers.map((card, i) => (
                    <button
                      key={`${card.suit}${card.rank}-${i}`}
                      type="button"
                      className={styles.offer}
                      onClick={() => {
                        setTookCard({ card, before: [...run.deck], at: weakestIndex(run.deck) })
                        draft(i)
                      }}
                      aria-label={`Take the ${card.rank} of ${suitOf(card.suit).name}`}
                    >
                      <Card card={card} scoring={false} />
                      <span className={styles.offerTake}>Take</span>
                    </button>
                  ))}
                </div>

                <div className={styles.deckBlock}>
                  <span className={styles.deckLabel}>
                    Your deck — replaces your{' '}
                    {run.deck[weakestIndex(run.deck)].rank} of{' '}
                    {suitOf(run.deck[weakestIndex(run.deck)].suit).name}
                  </span>
                  <DeckStrip deck={run.deck} swapIndex={weakestIndex(run.deck)} swap="leaving" />
                </div>

                <button type="button" className={styles.skip} onClick={() => draft(null)}>
                  Keep my deck instead
                </button>
              </>
            ) : (
              <>
                <h2 className={styles.draftTitle}>Taken</h2>
                <p className={styles.draftNote}>
                  The {tookCard.card.rank} of {suitOf(tookCard.card.suit).name} is in your deck.
                </p>

                <div className={styles.deckBlock}>
                  <span className={styles.deckLabel}>Your deck</span>
                  <DeckStrip
                    deck={swapIn(tookCard.before, tookCard.card)}
                    swapIndex={tookCard.at}
                    swap="arriving"
                  />
                </div>

                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => setTookCard(null)}
                >
                  Next round
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {confirmNew && (
        <div className={styles.draftLayer} role="dialog" aria-label="start a new run">
          <div className={styles.draft}>
            <h2 className={styles.draftTitle}>Abandon this run?</h2>
            <p className={styles.draftNote}>
              You are on round {run.round} of {run.rounds}. This cannot be undone.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                setConfirmNew(false)
                setTookCard(null)
                restart()
              }}
            >
              Start a new run
            </button>
            <button type="button" className={styles.skip} onClick={() => setConfirmNew(false)}>
              Keep playing
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
