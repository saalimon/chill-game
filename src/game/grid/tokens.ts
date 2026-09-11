import { randInt, type Rng } from './rng'

/**
 * The doodles a board can be played with.
 *
 * These are names only — the drawing lives in the view layer
 * (`src/features/board/doodles/`), so the engine stays free of presentation and
 * a puzzle can be replayed without knowing how its glyph looks.
 */
export const TOKEN_IDS = [
  'star',
  'flower',
  'curl',
  'asterisk',
  'cloud',
  'leaf',
  'moon',
  'drop',
  'spiral',
  'sprig',
  'berry',
  'sun',
  'wave',
  'pinwheel',
] as const
export type TokenId = (typeof TOKEN_IDS)[number]

/** The coloured pens a glyph can be drawn with. */
export const TOKEN_INKS = ['pink', 'blue', 'ink', 'yellow'] as const
export type TokenInk = (typeof TOKEN_INKS)[number]

export interface Token {
  id: TokenId
  ink: TokenInk
}

export function pickToken(rng: Rng): Token {
  return {
    id: TOKEN_IDS[randInt(rng, TOKEN_IDS.length)],
    ink: TOKEN_INKS[randInt(rng, TOKEN_INKS.length)],
  }
}
