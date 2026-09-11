/**
 * Seeded pseudo-random number generator.
 *
 * Every random choice in the puzzle engine flows through here. Nothing in
 * `src/game/grid/` may call `Math.random`, because a stored solve is only
 * a seed plus a move list — a board has to be reconstructible from its seed
 * alone, forever.
 */
export type Rng = () => number

/** mulberry32: small, fast, and stable across JS engines. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer in [0, max). */
export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max)
}

/** Fisher-Yates on a copy; the input is left untouched. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
