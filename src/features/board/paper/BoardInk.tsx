import { useMemo } from 'react'
import type { Regions } from '@/game/starbattle/types'
import { innerRules, regionLoops } from './regionOutline'
import { makeEdgeDrift, pathFromLine, pathFromLoop } from './wobble'
import styles from './BoardInk.module.css'

/** In cell units, so lines stay proportional to the squares at every size. */
const BOUNDARY_WIDTH = 0.045
const RULE_WIDTH = 0.016
const BOUNDARY_WOBBLE = 0.036
const RULE_WOBBLE = 0.018

/**
 * Everything drawn on the board: the region washes and all the ink.
 *
 * This sits over the grid of cell buttons and takes no pointer events, so
 * hit-testing, focus and the ARIA grid stay entirely in the buttons underneath.
 *
 * It depends only on the layout and the seed — never on the player's marks — so
 * tapping a square never re-traces a single path.
 */
export function BoardInk({ regions, seed }: { regions: Regions; seed: number }) {
  const size = regions.length

  const { fills, rules } = useMemo(() => {
    const boundaryDrift = makeEdgeDrift(seed, BOUNDARY_WOBBLE)
    const ruleDrift = makeEdgeDrift(seed ^ 0x5bf03635, RULE_WOBBLE)

    const fills = Array.from({ length: size }, (_, region) => ({
      region,
      // A region may enclose another, so its loops are joined into one path and
      // filled even-odd, which punches the hole through.
      d: regionLoops(regions, region)
        .map((loop) => pathFromLoop(loop, boundaryDrift))
        .join(''),
    }))

    const rules = innerRules(regions).map(([a, b]) => pathFromLine(a, b, ruleDrift))

    return { fills, rules }
  }, [regions, seed, size])

  return (
    <svg
      className={styles.ink}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {fills.map(({ region, d }) => (
        <path key={region} d={d} fill={`var(--region-${region % 9})`} fillRule="evenodd" />
      ))}

      {rules.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          className={styles.rule}
          strokeWidth={RULE_WIDTH}
          strokeLinecap="round"
        />
      ))}

      {fills.map(({ region, d }) => (
        <path
          key={region}
          d={d}
          fill="none"
          className={styles.boundary}
          strokeWidth={BOUNDARY_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
