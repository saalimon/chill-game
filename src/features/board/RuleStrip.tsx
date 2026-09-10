import { RULES } from '@/game/starbattle/rules'
import type { Rule } from '@/game/starbattle/rules'
import styles from './RuleStrip.module.css'

const LABELS: Record<Rule, string> = {
  line: 'row & column',
  colour: 'one per colour',
  touching: 'no touching',
}

/** The three rules, kept on screen so they never have to be remembered. */
export function RuleStrip() {
  return (
    <div className={styles.strip}>
      {RULES.map((rule) => (
        <span key={rule} className={styles.rule}>
          <span className={styles.dot} />
          {LABELS[rule]}
        </span>
      ))}
    </div>
  )
}
