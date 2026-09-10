import { mulberry32, type Rng } from '@/game/starbattle/rng'
import type { Point } from './regionOutline'

export interface WobbleOptions {
  rng: Rng
  /** Largest distance a drawn line may stray from the true one, in cell units. */
  amplitude: number
  /** Roughly how long each drawn segment is, in cell units. */
  step?: number
}

const DEFAULT_STEP = 0.42

/** Trim to 3 decimals: shorter path data, no visible difference. */
const n = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

/**
 * Points along a segment, nudged sideways.
 *
 * Both ends are left exactly where they were. Corners are shared between
 * neighbouring edges of a loop, so moving them would tear the outline open;
 * only the points in between drift.
 */
function driftedPoints(a: Point, b: Point, { rng, amplitude, step = DEFAULT_STEP }: WobbleOptions) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return [a, b]

  // Unit normal, so the drift is always across the line rather than along it.
  const nx = -dy / length
  const ny = dx / length

  const divisions = Math.max(2, Math.round(length / step))
  const points: Point[] = [a]
  for (let i = 1; i < divisions; i++) {
    const t = i / divisions
    const drift = (rng() * 2 - 1) * amplitude
    points.push({ x: a.x + dx * t + nx * drift, y: a.y + dy * t + ny * drift })
  }
  points.push(b)
  return points
}

/**
 * Smooth a run of points into a curve.
 *
 * Each point is the handle of a quadratic ending halfway to the next, which
 * rounds the drift into something pen-like rather than a zig-zag of straight
 * hops. The last segment ends *on* the final point instead of a midpoint, which
 * makes the curve symmetric: walking the same points backwards traces exactly
 * the same line. Two regions share a boundary and walk it in opposite
 * directions, so without that they would each draw a slightly different curve
 * and leave a sliver of paper between their fills.
 */
function smooth(points: Point[], moveTo = true): string {
  if (points.length < 2) return ''
  let d = moveTo ? `M${n(points[0].x)} ${n(points[0].y)}` : ''

  if (points.length === 2) {
    return `${d}L${n(points[1].x)} ${n(points[1].y)}`
  }

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]
    const next = points[i + 1]
    const last = i === points.length - 2
    const endX = last ? next.x : (point.x + next.x) / 2
    const endY = last ? next.y : (point.y + next.y) / 2
    d += `Q${n(point.x)} ${n(point.y)} ${n(endX)} ${n(endY)}`
  }
  return d
}

/** One hand-drawn line from `a` to `b`. */
export function wobbleLine(a: Point, b: Point, options: WobbleOptions): string {
  return smooth(driftedPoints(a, b, options))
}

/**
 * A hand-drawn closed outline.
 *
 * Every edge of the ring is drifted in turn and the results are joined into one
 * path, so a region can be filled and stroked from the same geometry — which is
 * what keeps its colour from showing a straight seam beside a wobbly line.
 */
export function wobbleLoop(loop: Point[], options: WobbleOptions): string {
  if (loop.length < 3) return ''

  const points: Point[] = []
  for (let i = 0; i < loop.length; i++) {
    const from = loop[i]
    const to = loop[(i + 1) % loop.length]
    const drifted = driftedPoints(from, to, options)
    // Drop the trailing point; the next edge starts on it.
    points.push(...drifted.slice(0, -1))
  }

  if (points.length < 2) return ''

  // Close the ring by curving back through the first point.
  let d = `M${n(points[0].x)} ${n(points[0].y)}`
  for (let i = 1; i <= points.length; i++) {
    const point = points[i % points.length]
    const next = points[(i + 1) % points.length]
    const midX = (point.x + next.x) / 2
    const midY = (point.y + next.y) / 2
    d += `Q${n(point.x)} ${n(point.y)} ${n(midX)} ${n(midY)}`
  }
  return `${d}Z`
}

/** Drifted points along one lattice edge, in the direction asked for. */
export type EdgeDrift = (a: Point, b: Point) => Point[]

/** FNV-1a, so an edge's identity maps to a stable seed. */
function hashEdge(seed: number, a: Point, b: Point): number {
  let h = (0x811c9dc5 ^ seed) >>> 0
  for (const value of [a.x, a.y, b.x, b.y]) {
    h ^= Math.round(value * 16) & 0xffff
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * A drift function keyed by the edge itself rather than by whoever is drawing.
 *
 * Neighbouring regions share a boundary and walk it in opposite directions. If
 * each drew its own wobble, the two outlines would part company and the paper
 * would show through the gap between their fills. Seeding from the edge's own
 * coordinates — canonicalised so direction cannot matter, then reversed on the
 * way back — makes both regions draw the identical line.
 *
 * Results are cached, so an edge is computed once per board however many times
 * it is asked for.
 */
export function makeEdgeDrift(seed: number, amplitude: number, step = DEFAULT_STEP): EdgeDrift {
  const cache = new Map<string, Point[]>()

  return (a, b) => {
    // Canonical order: the smaller endpoint first, whichever way we were asked.
    const forward = a.x < b.x || (a.x === b.x && a.y <= b.y)
    const from = forward ? a : b
    const to = forward ? b : a

    const key = `${from.x},${from.y},${to.x},${to.y}`
    let points = cache.get(key)
    if (!points) {
      points = driftedPoints(from, to, {
        rng: mulberry32(hashEdge(seed, from, to)),
        amplitude,
        step,
      })
      cache.set(key, points)
    }
    return forward ? points : [...points].reverse()
  }
}

/**
 * Split a corner-to-corner edge into single lattice steps.
 *
 * Two regions meeting along a boundary do not necessarily corner in the same
 * places: where three regions meet, one side may run straight past a point the
 * other turns at. Asking for drift by corner-to-corner segment would then hand
 * the two sides different lines and leave a sliver of paper between their fills.
 * The unit lattice edge is the one decomposition both sides always agree on.
 */
function unitSteps(a: Point, b: Point): [Point, Point][] {
  const dx = Math.sign(b.x - a.x)
  const dy = Math.sign(b.y - a.y)
  const count = Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
  const steps: [Point, Point][] = []
  let from = a
  for (let i = 0; i < count; i++) {
    const to = { x: from.x + dx, y: from.y + dy }
    steps.push([from, to])
    from = to
  }
  return steps
}

/**
 * Draw an edge one lattice step at a time.
 *
 * Each step is smoothed on its own, which anchors the line exactly on every
 * lattice point it passes. Smoothing a whole edge in one run would leave those
 * points as mere curve handles, and a curve's shape there depends on its
 * neighbours — so the side that runs straight through a junction would bend near
 * it while the side that corners there started on it, and the two would drift
 * apart by a hair. Anchoring every step keeps them identical.
 */
function drawEdge(a: Point, b: Point, drift: EdgeDrift, moveTo: boolean): string {
  let d = ''
  let first = moveTo
  for (const [from, to] of unitSteps(a, b)) {
    d += smooth(drift(from, to), first)
    first = false
  }
  return d
}

/**
 * A region outline drawn from shared edges.
 *
 * The same path is used for the region's fill and its ink, so colour and line
 * can never disagree.
 */
export function pathFromLoop(loop: Point[], drift: EdgeDrift): string {
  if (loop.length < 3) return ''

  // Each edge is smoothed on its own and the runs are joined end to end.
  // Smoothing straight through a corner would round it away, and a grid of
  // rounded-off regions stops reading as squares — so a corner is a hard point
  // where one edge finishes and the next begins.
  let d = ''
  for (let i = 0; i < loop.length; i++) {
    d += drawEdge(loop[i], loop[(i + 1) % loop.length], drift, i === 0)
  }
  return `${d}Z`
}

/** One open line — an inner rule — drawn from shared edges. */
export function pathFromLine(a: Point, b: Point, drift: EdgeDrift): string {
  return drawEdge(a, b, drift, true)
}
