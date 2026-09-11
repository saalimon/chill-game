import { pickToken } from './tokens'
import { mulberry32, randInt, shuffled, type Rng } from './rng'
import { countSolutions, solve } from './solve'
import { GEN_VERSION, type Cell, type Puzzle, type Regions } from './types'
import { GAMES, isGrid, type GameId, type GridGameDef } from '../games'

/** Board sizes the one-star game offers, easiest first. */
export const SIZES = (GAMES.queens as GridGameDef).sizes

/**
 * Frontier cells sampled per growth step, with the hungriest region winning.
 *
 * Picking uniformly at random lets one region run away with the board — measured
 * over 200 boards, the largest region averaged 15 of 49 cells at 7x7 against an
 * ideal of 7, and could reach half the grid while others stayed a single cell.
 * Sampling a few candidates and feeding whichever region is smallest evens them
 * out while keeping the shapes irregular.
 */
const BALANCE_SAMPLES = 6

/**
 * Boundary nudges tried on one layout before starting over with a fresh one.
 *
 * A 7x7 board needs 17 at the median and a 9x9 needs 38, so this has room to
 * spare without letting a stubborn layout run forever.
 */
const REPAIRS_PER_LAYOUT = 120
/** Fresh layouts tried before giving up on a seed entirely. */
const MAX_LAYOUTS = 400

const ORTHOGONAL = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/** A cell's index, for set membership. */
const idOf = (size: number, cell: Cell): number => cell.r * size + cell.c

/**
 * Choose the answer first: `stars` cells per row and per column, none touching.
 *
 * Rows are filled left to right. Two stars in the same row must sit at least two
 * columns apart, and no star may come within a column of one in the row above —
 * rows further back are already two apart and cannot touch.
 */
function placeSolution(size: number, stars: number, rng: Rng): Cell[] {
  const colCount = new Array<number>(size).fill(0)
  const placed: Cell[] = []
  const rowCols: number[][] = []

  function walk(r: number): boolean {
    if (r === size) return true

    // A column takes at most one star per row, so it needs at least as many
    // rows left as it still has quota.
    const rowsLeft = size - r
    for (let c = 0; c < size; c++) {
      if (stars - colCount[c] > rowsLeft) return false
    }

    const above = r > 0 ? rowCols[r - 1] : []
    const chosen: number[] = []

    function pick(from: number): boolean {
      if (chosen.length === stars) {
        rowCols[r] = [...chosen]
        if (walk(r + 1)) return true
        rowCols.pop()
        return false
      }
      const needed = stars - chosen.length
      const options = shuffled(
        rng,
        Array.from({ length: size }, (_, i) => i).filter((c) => c >= from && c + (needed - 1) * 2 < size),
      )
      for (const c of options) {
        if (colCount[c] >= stars) continue
        if (chosen.some((other) => Math.abs(other - c) <= 1)) continue
        if (above.some((prev) => Math.abs(prev - c) <= 1)) continue

        colCount[c]++
        chosen.push(c)
        placed.push({ r, c })

        // Keep the row ordered so each pick only looks rightward.
        const ordered = [...chosen].sort((a, b) => a - b)
        const next = ordered[ordered.length - 1] + 2
        if (pick(chosen.length === stars ? next : Math.max(from, c + 2))) return true

        placed.pop()
        chosen.pop()
        colCount[c]--
      }
      return false
    }

    return pick(0)
  }

  if (!walk(0)) {
    throw new Error(`no non-touching placement exists for ${size}x${size} with ${stars} stars`)
  }
  return placed
}

/**
 * Grow one territory outward from each star until the board is covered.
 *
 * Seeding from the answer buys contiguity for free: a cell is only ever claimed
 * from a neighbour already in the territory. Growth feeds whichever territory is
 * currently smallest, because picking uniformly at random lets one run away with
 * the board.
 */
function growTerritories(size: number, seeds: Cell[], rng: Rng): Regions {
  const territory: Regions = Array.from({ length: size }, () => new Array<number>(size).fill(-1))
  const frontier: { r: number; c: number; region: number }[] = []

  const claim = (r: number, c: number, region: number) => {
    territory[r][c] = region
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
      if (territory[nr][nc] === -1) frontier.push({ r: nr, c: nc, region })
    }
  }

  const counts = new Array<number>(seeds.length).fill(1)
  seeds.forEach((cell, region) => claim(cell.r, cell.c, region))

  let remaining = size * size - seeds.length
  while (remaining > 0 && frontier.length > 0) {
    let chosen = -1
    for (let sample = 0; sample < BALANCE_SAMPLES && frontier.length > 0; sample++) {
      const i = randInt(rng, frontier.length)
      const candidate = frontier[i]
      if (territory[candidate.r][candidate.c] !== -1) {
        // Already claimed: drop it and carry on.
        frontier[i] = frontier[frontier.length - 1]
        frontier.pop()
        if (chosen >= frontier.length) chosen = -1
        continue
      }
      if (chosen === -1 || counts[candidate.region] < counts[frontier[chosen].region]) chosen = i
    }
    if (chosen === -1) continue

    const next = frontier[chosen]
    frontier[chosen] = frontier[frontier.length - 1]
    frontier.pop()
    claim(next.r, next.c, next.region)
    counts[next.region]++
    remaining--
  }

  return territory
}

/** Which territories share a border. */
function adjacency(size: number, territory: Regions, count: number): Set<number>[] {
  const neighbours = Array.from({ length: count }, () => new Set<number>())
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const here = territory[r][c]
      if (c + 1 < size && territory[r][c + 1] !== here) {
        neighbours[here].add(territory[r][c + 1])
        neighbours[territory[r][c + 1]].add(here)
      }
      if (r + 1 < size && territory[r + 1][c] !== here) {
        neighbours[here].add(territory[r + 1][c])
        neighbours[territory[r + 1][c]].add(here)
      }
    }
  }
  return neighbours
}

/**
 * Pair up neighbouring territories, so each merged region holds two stars.
 *
 * A region in the two-star game needs exactly two stars *and* must stay in one
 * piece, which rules out simply seeding it from both: two seeds of the same
 * region can grow as two islands. Growing a territory per star and then merging
 * neighbouring pairs keeps contiguity, because the union of two touching
 * connected areas is connected.
 *
 * The matching is greedy from the most constrained territory outward, with
 * backtracking — a planar map of an even number of areas almost always has one,
 * and the caller regrows if it does not.
 */
function pairTerritories(neighbours: Set<number>[], rng: Rng): number[] | null {
  const partner = new Array<number>(neighbours.length).fill(-1)
  let matched = 0

  function step(): boolean {
    if (matched === neighbours.length) return true

    // Most constrained first: the territory with the fewest free neighbours.
    let pick = -1
    let fewest = Infinity
    for (let i = 0; i < neighbours.length; i++) {
      if (partner[i] !== -1) continue
      const free = [...neighbours[i]].filter((n) => partner[n] === -1).length
      if (free < fewest) {
        fewest = free
        pick = i
      }
    }
    if (pick === -1 || fewest === 0) return false

    for (const other of shuffled(rng, [...neighbours[pick]].filter((n) => partner[n] === -1))) {
      partner[pick] = other
      partner[other] = pick
      matched += 2
      if (step()) return true
      matched -= 2
      partner[pick] = -1
      partner[other] = -1
    }
    return false
  }

  return step() ? partner : null
}

/**
 * Build the region map: one region per star for Queens, or one per pair of
 * stars for Two Not Touch.
 */
function growRegions(size: number, solution: Cell[], stars: number, rng: Rng): Regions | null {
  const territory = growTerritories(size, solution, rng)
  if (stars === 1) return territory

  const partner = pairTerritories(adjacency(size, territory, solution.length), rng)
  if (!partner) return null

  // Relabel each pair to a single region id.
  const label = new Array<number>(partner.length).fill(-1)
  let next = 0
  for (let i = 0; i < partner.length; i++) {
    if (label[i] !== -1) continue
    label[i] = next
    label[partner[i]] = next
    next++
  }
  return territory.map((row) => row.map((t) => label[t]))
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

/** Star cells of the intended answer, for fast membership. */
const starSet = (size: number, solution: Cell[]): Set<number> =>
  new Set(solution.map((cell) => idOf(size, cell)))

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
function breakSolution(regions: Regions, answer: Set<number>, unwanted: Cell[], rng: Rng): boolean {
  const size = regions.length
  for (const cell of shuffled(rng, unwanted.filter((c) => !answer.has(idOf(size, c))))) {
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
export function generate(seed: number, size: number, game: GameId = 'queens'): Puzzle {
  const def = GAMES[game]
  if (!isGrid(def)) throw new Error(`${def.name} is not a grid puzzle`)
  if (!def.sizes.includes(size)) {
    throw new Error(
      `${def.name} does not offer ${size}x${size}; expected one of ${def.sizes.join(', ')}`,
    )
  }

  const { stars } = def
  const rng = mulberry32(seed)

  for (let layout = 0; layout < MAX_LAYOUTS; layout++) {
    const solution = placeSolution(size, stars, rng)
    const regions = growRegions(size, solution, stars, rng)
    // No way to pair the territories up; grow a fresh set.
    if (!regions) continue

    const answer = starSet(size, solution)

    for (let repair = 0; repair < REPAIRS_PER_LAYOUT; repair++) {
      const { solutions, nodes } = solve(regions, { cap: 2, stars })
      if (solutions.length === 1) {
        return {
          game,
          size,
          stars,
          seed,
          genVersion: GEN_VERSION,
          regions,
          solution,
          token: pickToken(rng),
          nodes,
        }
      }
      const unwanted = solutions.find((s) => !s.every((cell) => answer.has(idOf(size, cell))))
      if (!unwanted) break
      if (!breakSolution(regions, answer, unwanted, rng)) break
    }
  }

  throw new Error(`could not generate a unique ${size}x${size} ${def.name} puzzle for seed ${seed}`)
}

/** Kept for callers that only need the count. */
export { countSolutions }
