import { pickEmoji } from './emoji'
import { mulberry32, randInt, shuffled, type Rng } from './rng'
import { countSolutions, solve } from './solve'
import { GEN_VERSION, type Cell, type Puzzle, type Regions } from './types'

/** Board sizes the app offers, easiest first. */
export const SIZES = [5, 6, 7, 8, 9] as const
export type Size = (typeof SIZES)[number]

/** Boundary nudges tried on one layout before starting over with a fresh one. */
const REPAIRS_PER_LAYOUT = 300
/** Fresh layouts tried before giving up on a seed entirely. */
const MAX_LAYOUTS = 200

const ORTHOGONAL = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/**
 * Choose the answer first: one cell per row and column, none touching.
 *
 * Because there is one emoji per row, this only needs to pick a column per row —
 * a permutation where consecutive rows differ by at least 2 columns.
 */
function placeSolution(size: number, rng: Rng): Cell[] {
  const cols: number[] = []
  const used = new Array<boolean>(size).fill(false)

  function walk(r: number): boolean {
    if (r === size) return true
    for (const c of shuffled(rng, Array.from({ length: size }, (_, i) => i))) {
      if (used[c]) continue
      if (r > 0 && Math.abs(c - cols[r - 1]) <= 1) continue
      used[c] = true
      cols.push(c)
      if (walk(r + 1)) return true
      cols.pop()
      used[c] = false
    }
    return false
  }

  if (!walk(0)) throw new Error(`no non-touching placement exists for size ${size}`)
  return cols.map((c, r) => ({ r, c }))
}

/**
 * Grow one region outward from each solution cell until the board is covered.
 *
 * Seeding from the solution gives both properties the puzzle needs for free:
 * every region holds exactly one solution cell, and every region is contiguous,
 * because a cell is only ever claimed from a neighbour already in the region.
 */
function growRegions(size: number, solution: Cell[], rng: Rng): Regions {
  const regions: Regions = Array.from({ length: size }, () => new Array<number>(size).fill(-1))
  const frontier: { r: number; c: number; region: number }[] = []

  const claim = (r: number, c: number, region: number) => {
    regions[r][c] = region
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
      if (regions[nr][nc] === -1) frontier.push({ r: nr, c: nc, region })
    }
  }

  solution.forEach((cell, region) => claim(cell.r, cell.c, region))

  let remaining = size * size - size
  while (remaining > 0 && frontier.length > 0) {
    const i = randInt(rng, frontier.length)
    const next = frontier[i]
    frontier[i] = frontier[frontier.length - 1]
    frontier.pop()
    if (regions[next.r][next.c] !== -1) continue
    claim(next.r, next.c, next.region)
    remaining--
  }

  return regions
}

/** Whether every cell of `region` is orthogonally reachable from the others. */
function isContiguous(regions: Regions, region: number): boolean {
  const size = regions.length
  let start: Cell | null = null
  let total = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] !== region) continue
      total++
      start ??= { r, c }
    }
  }
  if (!start) return false

  const seen = new Set<number>([start.r * size + start.c])
  const stack: Cell[] = [start]
  while (stack.length) {
    const { r, c } = stack.pop()!
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
      if (regions[nr][nc] !== region) continue
      const id = nr * size + nc
      if (seen.has(id)) continue
      seen.add(id)
      stack.push({ r: nr, c: nc })
    }
  }
  return seen.size === total
}

const isIn = (solution: Cell[], cell: Cell): boolean => solution[cell.r].c === cell.c

/**
 * Nudge one region boundary so that `unwanted` stops being a solution.
 *
 * Takes a cell used by the unwanted solution but *not* by the intended one and
 * hands it to a neighbouring region. That region then holds two of the unwanted
 * solution's emojis, which kills it. The intended solution survives untouched:
 * its own cells never move, so every region keeps exactly one of them.
 *
 * Returns false when no move preserves region contiguity.
 */
function breakSolution(regions: Regions, solution: Cell[], unwanted: Cell[], rng: Rng): boolean {
  const size = regions.length
  for (const cell of shuffled(rng, unwanted.filter((c) => !isIn(solution, c)))) {
    const from = regions[cell.r][cell.c]
    const neighbours = shuffled(
      rng,
      ORTHOGONAL.map(([dr, dc]) => ({ r: cell.r + dr, c: cell.c + dc })).filter(
        (n) => n.r >= 0 && n.c >= 0 && n.r < size && n.c < size && regions[n.r][n.c] !== from,
      ),
    )
    for (const n of neighbours) {
      regions[cell.r][cell.c] = regions[n.r][n.c]
      if (isContiguous(regions, from)) return true
      regions[cell.r][cell.c] = from
    }
  }
  return false
}

/**
 * Build a puzzle with exactly one solution.
 *
 * Random region layouts are almost never unique on their own — under 1% of them
 * past 7x7 — so rerolling until one lands is hopeless. Instead a layout is
 * carved into shape: the solver reports a solution we don't want, one region
 * boundary moves to rule it out, and that repeats until only the intended
 * answer remains.
 */
export function generate(seed: number, size: number): Puzzle {
  if (!(SIZES as readonly number[]).includes(size)) {
    throw new Error(`unsupported board size ${size}; expected one of ${SIZES.join(', ')}`)
  }

  const rng = mulberry32(seed)

  for (let layout = 0; layout < MAX_LAYOUTS; layout++) {
    const solution = placeSolution(size, rng)
    const regions = growRegions(size, solution, rng)

    for (let repair = 0; repair < REPAIRS_PER_LAYOUT; repair++) {
      const { solutions, nodes } = solve(regions, { cap: 2 })
      if (solutions.length === 1) {
        return {
          size,
          seed,
          genVersion: GEN_VERSION,
          regions,
          solution,
          emoji: pickEmoji(rng),
          nodes,
        }
      }
      const unwanted = solutions.find((s) => !s.every((cell) => isIn(solution, cell)))
      if (!unwanted) break
      if (!breakSolution(regions, solution, unwanted, rng)) break
    }
  }

  throw new Error(`could not generate a unique ${size}x${size} puzzle for seed ${seed}`)
}

/** Kept for callers that only need the count. */
export { countSolutions }
