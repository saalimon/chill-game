import { RULES } from '@/game/starbattle/rules'
import type { GameDef } from '@/game/starbattle/games'
import styles from './RuleStrip.module.css'

/** The three rules, kept on screen so they never have to be remembered. */
export function RuleStrip({ game }: { game: GameDef }) {
  return (
    <div className={styles.strip}>
      {RULES.map((rule) => (
        <span key={rule} className={styles.rule}>
          <span className={styles.dot} />
          {game.rules[rule]}
        </span>
      ))}
    </div>
  )
}
