import { describe, expect, it } from 'vitest'
import { generate } from './generate'
import { GAMES } from './games'
import { solve } from './solve'
import { touches } from './rules'
import type { Cell, Regions } from './types'

const SIZES = GAMES.twoNotTouch.sizes
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 6151 + 29)

/** Every cell of `region` reachable from any other, moving orthogonally. */
function isContiguous(regions: Regions, region: number): boolean {
  const size = regions.length
  const cells: Cell[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (regions[r][c] === region) cells.push({ r, c })
  }
  if (cells.length === 0) return false
  const seen = new Set([`${cells[0].r},${cells[0].c}`])
  const queue = [cells[0]]
  while (queue.length) {
    const { r, c } = queue.pop()!
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
      if (regions[nr][nc] !== region) continue
      const k = `${nr},${nc}`
      if (seen.has(k)) continue
      seen.add(k)
      queue.push({ r: nr, c: nc })
    }
  }
  return seen.size === cells.length
}

const tally = (values: number[]) => {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return counts
}

describe('Two Not Touch', () => {
  it('is offered only at sizes that can hold two stars per line', () => {
    // Below 8x8 there is no legal placement at all.
    expect(Math.min(...SIZES)).toBeGreaterThanOrEqual(8)
    expect(() => generate(1, 7, 'twoNotTouch')).toThrow()
  })

  it('records which game built it', () => {
    const p = generate(11, 9, 'twoNotTouch')
    expect(p.game).toBe('twoNotTouch')
    expect(p.stars).toBe(2)
  })

  it('is deterministic for a seed', () => {
    expect(generate(77, 9, 'twoNotTouch')).toEqual(generate(77, 9, 'twoNotTouch'))
  })

  it('builds a different board from the one-star game at the same seed', () => {
    expect(generate(88, 9, 'twoNotTouch').regions).not.toEqual(generate(88, 9, 'queens').regions)
  })

  describe.each(SIZES)('a %ix%i board', (size) => {
    const puzzles = SEEDS.map((seed) => generate(seed, size, 'twoNotTouch'))

    it('has exactly one solution', () => {
      for (const p of puzzles) {
        expect(solve(p.regions, { stars: 2, cap: 2 }).solutions.length).toBe(1)
      }
    })

    it('agrees with the solver about what that solution is', () => {
      for (const p of puzzles) {
        const found = solve(p.regions, { stars: 2, cap: 2 }).solutions[0]
        const key = (cells: Cell[]) =>
          cells.map((c) => `${c.r},${c.c}`).sort().join(' ')
        expect(key(found)).toBe(key(p.solution))
      }
    })

    it('places two stars in every row and every column', () => {
      for (const p of puzzles) {
        expect(p.solution).toHaveLength(size * 2)
        for (const counts of [
          tally(p.solution.map((c) => c.r)),
          tally(p.solution.map((c) => c.c)),
        ]) {
          expect(counts.size).toBe(size)
          for (const n of counts.values()) expect(n).toBe(2)
        }
      }
    })

    it('places two stars in every region', () => {
      for (const p of puzzles) {
        const counts = tally(p.solution.map((c) => p.regions[c.r][c.c]))
        expect(counts.size).toBe(size)
        for (const n of counts.values()) expect(n).toBe(2)
      }
    })

    it('never lets two stars touch, including the pair sharing a row', () => {
      for (const p of puzzles) {
        for (let i = 0; i < p.solution.length; i++) {
          for (let j = i + 1; j < p.solution.length; j++) {
            expect(touches(p.solution[i], p.solution[j])).toBe(false)
          }
        }
      }
    })

    it('builds exactly `size` contiguous regions', () => {
      for (const p of puzzles) {
        const ids = new Set<number>()
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) ids.add(p.regions[r][c])
        expect(ids.size).toBe(size)
        for (let id = 0; id < size; id++) expect(isContiguous(p.regions, id)).toBe(true)
      }
    })
  })

  /** Deterministic, so a CI runner's speed cannot make it flake. See the
   *  matching note in generate.test.ts. */
  it('solves its largest board without an explosion of searching', () => {
    const nodes = Array.from({ length: 25 }, (_, i) =>
      generate(60000 + i, 10, 'twoNotTouch').nodes,
    ).sort((a, b) => a - b)
    expect(nodes[Math.floor(nodes.length * 0.95)]).toBeLessThan(150_000)
  })

  it('generates its largest board without pathological slowness', () => {
    const started = performance.now()
    for (let i = 0; i < 15; i++) generate(61000 + i, 10, 'twoNotTouch')
    expect((performance.now() - started) / 15).toBeLessThan(1_500)
  })
})
