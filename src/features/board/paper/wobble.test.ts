import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/game/starbattle/rng'
import { makeEdgeDrift, pathFromLoop, wobbleLine, wobbleLoop } from './wobble'

const A = { x: 0, y: 0 }
const B = { x: 10, y: 0 }
const SQUARE = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
]

/** Every coordinate pair in a path's `d`. */
function coords(d: string): { x: number; y: number }[] {
  const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  const points: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] })
  return points
}

describe('wobbleLine', () => {
  it('is deterministic — the same seed draws the same line', () => {
    const one = wobbleLine(A, B, { rng: mulberry32(7), amplitude: 0.5 })
    const two = wobbleLine(A, B, { rng: mulberry32(7), amplitude: 0.5 })
    expect(one).toBe(two)
  })

  it('draws a different line from a different seed', () => {
    const one = wobbleLine(A, B, { rng: mulberry32(1), amplitude: 0.5 })
    const two = wobbleLine(A, B, { rng: mulberry32(2), amplitude: 0.5 })
    expect(one).not.toBe(two)
  })

  it('starts and ends exactly on the given points, so joins stay tight', () => {
    const d = wobbleLine(A, B, { rng: mulberry32(3), amplitude: 0.5 })
    const points = coords(d)
    expect(points[0]).toEqual(A)
    expect(points[points.length - 1]).toEqual(B)
  })

  it('never strays further from the line than the amplitude allows', () => {
    for (let seed = 0; seed < 40; seed++) {
      const d = wobbleLine(A, B, { rng: mulberry32(seed), amplitude: 0.4 })
      for (const p of coords(d)) {
        // The line lies on y = 0, so any drift is the y value itself.
        expect(Math.abs(p.y)).toBeLessThanOrEqual(0.4 + 1e-9)
      }
    }
  })

  it('lies perfectly straight when the amplitude is zero', () => {
    const d = wobbleLine(A, B, { rng: mulberry32(5), amplitude: 0 })
    for (const p of coords(d)) expect(p.y).toBeCloseTo(0, 10)
  })

  it('produces a path that starts with a move', () => {
    expect(wobbleLine(A, B, { rng: mulberry32(5), amplitude: 0.3 })).toMatch(/^M/)
  })

  it('leaves a zero-length line alone rather than dividing by zero', () => {
    const d = wobbleLine(A, A, { rng: mulberry32(5), amplitude: 0.3 })
    for (const p of coords(d)) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })
})

describe('wobbleLoop', () => {
  it('is deterministic for a given seed', () => {
    const one = wobbleLoop(SQUARE, { rng: mulberry32(9), amplitude: 0.3 })
    const two = wobbleLoop(SQUARE, { rng: mulberry32(9), amplitude: 0.3 })
    expect(one).toBe(two)
  })

  it('closes the ring', () => {
    expect(wobbleLoop(SQUARE, { rng: mulberry32(9), amplitude: 0.3 })).toMatch(/Z\s*$/)
  })

  it('keeps every corner exactly where it was, so neighbouring edges meet', () => {
    const d = wobbleLoop(SQUARE, { rng: mulberry32(11), amplitude: 0.35 })
    const points = coords(d)
    for (const corner of SQUARE) {
      expect(points.some((p) => p.x === corner.x && p.y === corner.y)).toBe(true)
    }
  })

  it('stays within the amplitude of the shape it was given', () => {
    const d = wobbleLoop(SQUARE, { rng: mulberry32(13), amplitude: 0.3 })
    for (const p of coords(d)) {
      expect(p.x).toBeGreaterThanOrEqual(-0.3 - 1e-9)
      expect(p.x).toBeLessThanOrEqual(4.3 + 1e-9)
      expect(p.y).toBeGreaterThanOrEqual(-0.3 - 1e-9)
      expect(p.y).toBeLessThanOrEqual(4.3 + 1e-9)
    }
  })

  it('has nothing to draw for a degenerate loop', () => {
    expect(wobbleLoop([], { rng: mulberry32(1), amplitude: 0.3 })).toBe('')
  })
})

describe('makeEdgeDrift', () => {
  it('draws a shared edge identically from either side', () => {
    const drift = makeEdgeDrift(2026, 0.03)
    const forward = drift({ x: 1, y: 1 }, { x: 1, y: 4 })
    const backward = drift({ x: 1, y: 4 }, { x: 1, y: 1 })
    // Two regions meet along this edge and walk it in opposite directions. The
    // drawn line has to be the same line, or their fills part company.
    expect(backward).toEqual([...forward].reverse())
  })

  it('gives the same edge the same drift every time it is asked', () => {
    const drift = makeEdgeDrift(7, 0.03)
    expect(drift({ x: 2, y: 0 }, { x: 2, y: 3 })).toEqual(drift({ x: 2, y: 0 }, { x: 2, y: 3 }))
  })

  it('gives different edges different drift', () => {
    const drift = makeEdgeDrift(7, 0.03)
    const a = drift({ x: 1, y: 0 }, { x: 1, y: 3 })
    const b = drift({ x: 2, y: 0 }, { x: 2, y: 3 })
    expect(a).not.toEqual(b)
  })

  it('changes with the puzzle seed, so two boards are not drawn alike', () => {
    const a = makeEdgeDrift(1, 0.03)({ x: 1, y: 0 }, { x: 1, y: 3 })
    const b = makeEdgeDrift(2, 0.03)({ x: 1, y: 0 }, { x: 1, y: 3 })
    expect(a).not.toEqual(b)
  })

  it('keeps the endpoints exact', () => {
    const drift = makeEdgeDrift(3, 0.05)
    const points = drift({ x: 0, y: 2 }, { x: 5, y: 2 })
    expect(points[0]).toEqual({ x: 0, y: 2 })
    expect(points[points.length - 1]).toEqual({ x: 5, y: 2 })
  })

  it('stays within the amplitude', () => {
    const drift = makeEdgeDrift(11, 0.04)
    for (const p of drift({ x: 0, y: 2 }, { x: 6, y: 2 })) {
      expect(Math.abs(p.y - 2)).toBeLessThanOrEqual(0.04 + 1e-9)
    }
  })
})

describe('pathFromLoop', () => {
  it('closes the ring', () => {
    expect(pathFromLoop(SQUARE, makeEdgeDrift(1, 0.03))).toMatch(/Z\s*$/)
  })

  it('is empty for a degenerate loop', () => {
    expect(pathFromLoop([], makeEdgeDrift(1, 0.03))).toBe('')
  })

  it('traces two regions sharing an edge along the very same points', () => {
    const drift = makeEdgeDrift(5, 0.03)
    // A left square and a right square meeting on x = 1.
    const left = pathFromLoop(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      drift,
    )
    const right = pathFromLoop(
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ],
      drift,
    )

    // Path data rounds to 3 decimals, so format the same way before looking.
    const fmt = (v: number) => {
      const r = Math.round(v * 1000) / 1000
      return Object.is(r, -0) ? '0' : String(r)
    }
    const shared = drift({ x: 1, y: 0 }, { x: 1, y: 1 })
    const interior = shared.slice(1, -1)
    expect(interior.length).toBeGreaterThan(0)

    for (const p of interior) {
      const pair = `${fmt(p.x)} ${fmt(p.y)}`
      expect(left).toContain(pair)
      expect(right).toContain(pair)
    }
  })
})

describe('pathFromLoop corners', () => {
  it('lands exactly on every corner, so regions still read as squares', () => {
    const drift = makeEdgeDrift(21, 0.04)
    const d = pathFromLoop(SQUARE, drift)
    const fmt = (v: number) => {
      const r = Math.round(v * 1000) / 1000
      return Object.is(r, -0) ? '0' : String(r)
    }
    // A corner appears as the target of a line command, not as a curve handle.
    for (const corner of SQUARE.slice(1)) {
      expect(d).toContain(`L${fmt(corner.x)} ${fmt(corner.y)}`)
    }
    expect(d).toMatch(new RegExp(`^M${fmt(SQUARE[0].x)} ${fmt(SQUARE[0].y)}`))
  })
})
