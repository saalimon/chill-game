import { GAMES, type GameId } from '@/game/games'
import { HAND_TYPES } from '@/game/tally/hands'
import { HAND_VALUES } from '@/game/tally/score'
import { EXAMPLE_HANDS } from './exampleHands'
import { MiniHand } from './MiniHand'
import { WorkedBoard } from './WorkedBoard'
import styles from './HowToPlay.module.css'

const HAND_NAMES: Record<string, string> = {
  straightFlush: 'Straight flush',
  fourOfAKind: 'Four of a kind',
  fullHouse: 'Full house',
  flush: 'Flush',
  straight: 'Straight',
  threeOfAKind: 'Three of a kind',
  twoPair: 'Two pair',
  pair: 'Pair',
  highCard: 'High card',
}

/** The rankings, strongest first — the opposite of the engine's weakest-first order. */
const STRONGEST_FIRST = [...HAND_TYPES].reverse()

function GridHelp({ game }: { game: Extract<GameId, 'queens' | 'twoNotTouch'> }) {
  const many = game === 'queens' ? 'One' : 'Two'
  const doodle = game === 'queens' ? 'doodle' : 'doodles'

  return (
    <>
      <ul className={styles.rules}>
        <li>
          <b>{many}</b> {doodle} in every <b>row</b> and every <b>column</b>.
        </li>
        <li>
          <b>{many}</b> in every <b>colour</b> region.
        </li>
        <li>
          No two may <b>touch</b> — not even at the corners.
        </li>
      </ul>

      <figure className={styles.example}>
        <WorkedBoard game={game} />
        <figcaption className={styles.caption}>A finished board. Every rule holds.</figcaption>
      </figure>

      <ul className={styles.controls}>
        <li>
          <b>Tap</b> a square to rule it out
        </li>
        <li>
          <b>Double tap</b> to place a doodle
        </li>
        <li>Three wrong guesses ends the round</li>
      </ul>
    </>
  )
}

function TallyHelp() {
  return (
    <>
      <ul className={styles.rules}>
        <li>
          <b>Deal</b> your deck across the page: five columns, three rows.
        </li>
        <li>
          Each <b>row</b> is scored as its own five-card hand, and the three add up.
        </li>
        <li>
          Every deal <b>adds</b> to your round score — you have four to reach the target.
        </li>
        <li>
          Clear it and the score <b>resets</b>, the target <b>climbs</b>, and you take a card.
        </li>
      </ul>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Hand</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {STRONGEST_FIRST.map((type) => (
            <tr key={type}>
              <td>
                <span className={styles.handCell}>
                  <span className={styles.handName}>{HAND_NAMES[type]}</span>
                  <MiniHand cards={EXAMPLE_HANDS[type]} label={`an example ${HAND_NAMES[type]}`} />
                </span>
              </td>
              <td className={styles.value}>
                {HAND_VALUES[type].chips} × {HAND_VALUES[type].mult}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.aside}>
        Only the cards making the hand add their rank, so a pair of nines pays more than a pair of
        twos. Clear a round and you are offered three cards: the one you take{' '}
        <b>replaces the weakest card in your deck</b> rather than joining it, so the deck never
        grows and never dilutes.
      </p>
    </>
  )
}

export function HowToPlay({ game, onClose }: { game: GameId; onClose: () => void }) {
  const def = GAMES[game]

  return (
    <div className={styles.layer} data-testid="howto-backdrop" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-label={`How to play ${def.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.eyebrow}>How to play</span>
        <h2 className={styles.title}>{def.name}</h2>

        {game === 'tally' ? <TallyHelp /> : <GridHelp game={game} />}

        <button type="button" className={styles.done} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  )
}
