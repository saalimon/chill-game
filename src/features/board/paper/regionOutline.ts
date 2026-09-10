import type { Regions } from '@/game/starbattle/types'

/** A lattice corner, in cell units: `x` counts columns, `y` counts rows. */
export interface Point {
  x: number
  y: number
}

/** A closed ring of corners. The last point joins back to the first. */
export type Loop = Point[]

/** The four sides of a cell, listed so that following them walks the cell clockwise. */
const SIDES = [
  { dr: -1, dc: 0, from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }, // top
  { dr: 0, dc: 1, from: { x: 1, y: 0 }, to: { x: 1, y: 1 } }, // right
  { dr: 1, dc: 0, from: { x: 1, y: 1 }, to: { x: 0, y: 1 } }, // bottom
  { dr: 0, dc: -1, from: { x: 0, y: 1 }, to: { x: 0, y: 0 } }, // left
] as const

/** Region id at a cell, or -1 off the board. Row lengths are read per row so
 *  these helpers stay correct on any grid, not only a square one. */
const at = (regions: Regions, r: number, c: number): number =>
  r < 0 || r >= regions.length || c < 0 || c >= regions[r].length ? -1 : regions[r][c]

const keyOf = (p: Point): string => `${p.x},${p.y}`

/**
 * Trace the outline of one region.
 *
 * Every cell side that faces a different region — or the edge of the board — is
 * a boundary. Listing those sides in clockwise order means each one ends where
 * another begins, so they chain head-to-tail into closed rings without any
 * geometry beyond a lookup.
 *
 * A region can enclose another, so the result is a *list* of rings: the outer
 * one plus a ring around each hole. Drawn with `fill-rule: evenodd`, those holes
 * punch through correctly.
 */
export function regionLoops(regions: Regions, region: number): Loop[] {
  // Directed boundary edges, indexed by where they start.
  const outgoing = new Map<string, Point[]>()
  for (let r = 0; r < regions.length; r++) {
    for (let c = 0; c < regions[r].length; c++) {
      if (regions[r][c] !== region) continue
      for (const side of SIDES) {
        if (at(regions, r + side.dr, c + side.dc) === region) continue
        const from = { x: c + side.from.x, y: r + side.from.y }
        const to = { x: c + side.to.x, y: r + side.to.y }
        const list = outgoing.get(keyOf(from))
        if (list) list.push(to)
        else outgoing.set(keyOf(from), [to])
      }
    }
  }

  const loops: Loop[] = []
  while (outgoing.size > 0) {
    const startKey = outgoing.keys().next().value as string
    const [sx, sy] = startKey.split(',').map(Number)
    const start = { x: sx, y: sy }

    const loop: Loop = []
    let current = start
    // Walk edge to edge until the ring closes.
    for (;;) {
      const next = takeEdge(outgoing, current)
      if (!next) break
      loop.push(current)
      current = next
      if (current.x === start.x && current.y === start.y) break
    }
    if (loop.length >= 4) loops.push(dropCollinear(loop))
  }

  return loops
}

/** Consume one outgoing edge from `p`, if any remain. */
function takeEdge(outgoing: Map<string, Point[]>, p: Point): Point | null {
  const key = keyOf(p)
  const list = outgoing.get(key)
  if (!list || list.length === 0) return null
  const next = list.pop()!
  if (list.length === 0) outgoing.delete(key)
  return next
}

/** Three points in a straight line only need the two ends. */
function dropCollinear(loop: Loop): Loop {
  const kept: Loop = []
  for (let i = 0; i < loop.length; i++) {
    const previous = loop[(i - 1 + loop.length) % loop.length]
    const point = loop[i]
    const next = loop[(i + 1) % loop.length]
    const straight =
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y)
    if (!straight) kept.push(point)
  }
  return kept
}

/** How many unit-length cell sides sit on a region boundary, counted once each. */
export function boundaryEdgeCount(regions: Regions): number {
  let total = 0
  for (let r = 0; r < regions.length; r++) {
    for (let c = 0; c < regions[r].length; c++) {
      for (const side of SIDES) {
        if (at(regions, r + side.dr, c + side.dc) !== regions[r][c]) total++
      }
    }
  }
  return total
}

/**
 * The faint rules between neighbouring cells of the *same* region.
 *
 * Region boundaries are drawn heavily from `regionLoops`; these are the light
 * lines that keep a large region countable.
 *
 * Runs of adjacent same-region cells are merged into one long segment rather
 * than emitted per cell, so a rule crossing a region is a single pen stroke —
 * both truer to a drawn grid and far fewer paths on a 9x9 board.
 */
export function innerRules(regions: Regions): [Point, Point][] {
  const rules: [Point, Point][] = []
  const rows = regions.length
  const cols = rows > 0 ? regions[0].length : 0

  // Vertical rules, on the boundary between column c and c + 1.
  for (let c = 0; c + 1 < cols; c++) {
    let runStart: number | null = null
    for (let r = 0; r <= rows; r++) {
      const shared = r < rows && at(regions, r, c) === at(regions, r, c + 1)
      if (shared && runStart === null) runStart = r
      if (!shared && runStart !== null) {
        rules.push([
          { x: c + 1, y: runStart },
          { x: c + 1, y: r },
        ])
        runStart = null
      }
    }
  }

  // Horizontal rules, on the boundary between row r and r + 1.
  for (let r = 0; r + 1 < rows; r++) {
    let runStart: number | null = null
    for (let c = 0; c <= cols; c++) {
      const shared = c < cols && at(regions, r, c) === at(regions, r + 1, c)
      if (shared && runStart === null) runStart = c
      if (!shared && runStart !== null) {
        rules.push([
          { x: runStart, y: r + 1 },
          { x: c, y: r + 1 },
        ])
        runStart = null
      }
    }
  }

  return rules
}
