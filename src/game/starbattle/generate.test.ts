import { describe, expect, it } from 'vitest'
import { generate, SIZES } from './generate'
import { TOKEN_IDS, TOKEN_INKS } from './tokens'
import { solve } from './solve'
import { touches } from './rules'
import type { Cell, Regions } from './types'

/** Every cell of `region` reachable from any other, moving orthogonally. */
function isContiguous(regions: Regions, region: number): boolean {
  const size = regions.length
  const cells: Cell[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (regions[r][c] === region) cells.push({ r, c })
  }
  if (cells.length === 0) return false
  const seen = new Set<string>([`${cells[0].r},${cells[0].c}`])
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

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 13)

describe('generate', () => {
  it('is deterministic for a given seed and size', () => {
    expect(generate(4242, 7)).toEqual(generate(4242, 7))
  })

  it('produces different boards for different seeds', () => {
    expect(generate(1, 7).regions).not.toEqual(generate(2, 7).regions)
  })

  it('records the seed, size and generation version it was built with', () => {
    const p = generate(99, 6)
    expect(p.seed).toBe(99)
    expect(p.size).toBe(6)
    expect(p.genVersion).toBe(2)
  })

  it('picks a doodle and an ink to draw it with', () => {
    const { token } = generate(99, 6)
    expect(TOKEN_IDS).toContain(token.id)
    expect(TOKEN_INKS).toContain(token.ink)
  })

  it('rejects sizes outside the supported ladder', () => {
    expect(() => generate(1, 4)).toThrow()
    expect(() => generate(1, 10)).toThrow()
  })

  it('supports every size on the ladder', () => {
    for (const size of SIZES) expect(generate(2024, size).size).toBe(size)
  })

  describe.each(SIZES)('a %ix%i board', (size) => {
    const puzzles = SEEDS.map((seed) => generate(seed, size))

    it('has exactly one solution', () => {
      for (const p of puzzles) {
        expect(solve(p.regions, { cap: 2 }).solutions.length).toBe(1)
      }
    })

    it('has a solution matching the one the solver finds', () => {
      for (const p of puzzles) {
        expect(solve(p.regions, { cap: 2 }).solutions[0]).toEqual(p.solution)
      }
    })

    it('places exactly one emoji per row and per column', () => {
      for (const p of puzzles) {
        expect(p.solution.map((c) => c.r).sort((a, b) => a - b)).toEqual(
          Array.from({ length: size }, (_, i) => i),
        )
        expect(p.solution.map((c) => c.c).sort((a, b) => a - b)).toEqual(
          Array.from({ length: size }, (_, i) => i),
        )
      }
    })

    it('never places two emojis that touch', () => {
      for (const p of puzzles) {
        for (let i = 0; i < p.solution.length; i++) {
          for (let j = i + 1; j < p.solution.length; j++) {
            expect(touches(p.solution[i], p.solution[j])).toBe(false)
          }
        }
      }
    })

    it('assigns every cell to one of exactly `size` regions', () => {
      for (const p of puzzles) {
        const ids = new Set<number>()
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const id = p.regions[r][c]
            expect(Number.isInteger(id)).toBe(true)
            expect(id).toBeGreaterThanOrEqual(0)
            expect(id).toBeLessThan(size)
            ids.add(id)
          }
        }
        expect(ids.size).toBe(size)
      }
    })

    it('builds contiguous regions', () => {
      for (const p of puzzles) {
        for (let id = 0; id < size; id++) {
          expect(isContiguous(p.regions, id)).toBe(true)
        }
      }
    })

    it('puts exactly one solution cell in each region', () => {
      for (const p of puzzles) {
        const perRegion = new Map<number, number>()
        for (const cell of p.solution) {
          const id = p.regions[cell.r][cell.c]
          perRegion.set(id, (perRegion.get(id) ?? 0) + 1)
        }
        expect(perRegion.size).toBe(size)
        for (const count of perRegion.values()) expect(count).toBe(1)
      }
    })
  })

  it('generates a 9x9 board well inside the frame budget', () => {
    const times: number[] = []
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now()
      generate(90000 + i, 9)
      times.push(performance.now() - t0)
    }
    times.sort((a, b) => a - b)
    const p95 = times[Math.floor(times.length * 0.95)]
    expect(p95).toBeLessThan(150)
  })
})
