import { MiniCard } from '@/features/help/MiniCard'
import { arrangeRow } from '@/game/tally/arrange'
import { SUITS, cardId, type Card } from '@/game/tally/cards'
import styles from './DeckStrip.module.css'

interface DeckStripProps {
  deck: readonly Card[]
  /**
   * The slot a draft swaps. Before the swap it holds the card being dropped;
   * afterwards the same slot holds the card just taken, so one index marks both.
   */
  swapIndex?: number
  swap?: 'leaving' | 'arriving'
}

/**
 * The whole deck, sorted, small enough to take in at a glance.
 *
 * Without this the draft is a guess: whether to take a high card or one that
 * builds a flush depends entirely on what is already in the deck, and the card
 * about to be dropped is part of the price. Hiding it left only "bigger is
 * better" — which the simulation says is the weaker way to play.
 */
export function DeckStrip({ deck, swapIndex, swap }: DeckStripProps) {
  const sorted = arrangeRow(deck)

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        {sorted.map(({ card, dealtAt }) => (
          <MiniCard
            key={`${cardId(card)}-${dealtAt}`}
            card={card}
            state={swap && dealtAt === swapIndex ? swap : 'normal'}
          />
        ))}
      </div>

      {/* Suit counts: the number a flush build is decided on. */}
      <div className={styles.counts}>
        {SUITS.map((suit) => (
          <span
            key={suit.id}
            className={styles.count}
            style={{ '--suit-ink': `var(--pen-${suit.ink})` } as React.CSSProperties}
          >
            {suit.name} {deck.filter((card) => card.suit === suit.id).length}
          </span>
        ))}
      </div>
    </div>
  )
}
