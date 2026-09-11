import { describe, expect, it } from 'vitest'
import type { Regions } from '@/game/grid/types'
import { boundaryEdgeCount, innerRules, regionLoops, type Loop } from './regionOutline'

/** Loops come back in cell units; compare them as plain tuples. */
const asTuples = (loop: Loop) => loop.map((p) => [p.x, p.y])

/** A loop may start anywhere; rotate it so comparisons are stable. */
function normalise(loop: Loop): number[][] {
  const points = asTuples(loop)
  let start = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] < points[start][1] || (points[i][1] === points[start][1] && points[i][0] < points[start][0])) {
      start = i
    }
  }
  return [...points.slice(start), ...points.slice(0, start)]
}

describe('regionLoops', () => {
  it('traces a single cell as one square', () => {
    expect(regionLoops([[0]], 0)).toHaveLength(1)
    expect(normalise(regionLoops([[0]], 0)[0])).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])
  })

  it('collapses collinear edges, so a 1x2 region is still four corners', () => {
    const regions: Regions = [[0, 0]]
    expect(normalise(regionLoops(regions, 0)[0])).toEqual([
      [0, 0],
      [2, 0],
      [2, 1],
      [0, 1],
    ])
  })

  it('traces a whole grid filled by one region as its outer square', () => {
    const regions: Regions = [
      [0, 0],
      [0, 0],
    ]
    expect(normalise(regionLoops(regions, 0)[0])).toEqual([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ])
  })

  it('gives an L-shaped region six corners', () => {
    // 0 .
    // 0 0
    const regions: Regions = [
      [0, 1],
      [0, 0],
    ]
    const loop = regionLoops(regions, 0)[0]
    expect(loop).toHaveLength(6)
    expect(normalise(loop)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
      [0, 2],
    ])
  })

  it('returns a separate loop for a hole, so an enclosing region has two', () => {
    const regions: Regions = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]
    const loops = regionLoops(regions, 0)
    expect(loops).toHaveLength(2)

    const sizes = loops.map((l) => l.length).sort()
    expect(sizes).toEqual([4, 4])

    // One loop is the outer square, the other rings the enclosed cell.
    const traced = loops.map(normalise)
    expect(traced).toContainEqual([
      [0, 0],
      [3, 0],
      [3, 3],
      [0, 3],
    ])
    expect(traced.some((l) => l.every(([x, y]) => x >= 1 && x <= 2 && y >= 1 && y <= 2))).toBe(true)
  })

  it('closes every loop it produces', () => {
    const regions: Regions = [
      [0, 0, 1],
      [2, 0, 1],
      [2, 2, 1],
    ]
    for (let id = 0; id < 3; id++) {
      for (const loop of regionLoops(regions, id)) {
        expect(loop.length).toBeGreaterThanOrEqual(4)
        // Consecutive points, wrapping around, always share an axis.
        for (let i = 0; i < loop.length; i++) {
          const a = loop[i]
          const b = loop[(i + 1) % loop.length]
          expect(a.x === b.x || a.y === b.y).toBe(true)
          expect(a.x === b.x && a.y === b.y).toBe(false)
        }
      }
    }
  })

  it('accounts for every boundary edge exactly once', () => {
    const regions: Regions = [
      [0, 0, 1],
      [2, 0, 1],
      [2, 2, 1],
    ]
    let traced = 0
    for (let id = 0; id < 3; id++) {
      for (const loop of regionLoops(regions, id)) {
        for (let i = 0; i < loop.length; i++) {
          const a = loop[i]
          const b = loop[(i + 1) % loop.length]
          traced += Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
        }
      }
    }
    expect(traced).toBe(boundaryEdgeCount(regions))
  })

  it('has nothing to trace for a region that is not on the board', () => {
    expect(regionLoops([[0]], 7)).toEqual([])
  })
})

describe('innerRules', () => {
  it('finds the faint lines between cells that share a region', () => {
    // One region, 2x2: one vertical and one horizontal inner rule.
    const regions: Regions = [
      [0, 0],
      [0, 0],
    ]
    const rules = innerRules(regions)
    expect(rules).toHaveLength(2)
  })

  it('leaves out edges that sit on a region boundary', () => {
    // Every neighbour pair crosses a region, so there are no inner rules.
    const regions: Regions = [
      [0, 1],
      [2, 3],
    ]
    expect(innerRules(regions)).toEqual([])
  })

  it('spans the full width of a run inside one region', () => {
    const regions: Regions = [[0, 0, 0]]
    const rules = innerRules(regions)
    expect(rules).toHaveLength(2)
    for (const [a, b] of rules) {
      expect(a.x).toBe(b.x)
      expect(b.y - a.y).toBe(1)
    }
  })
})
