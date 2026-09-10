import { randInt, type Rng } from './rng'

/**
 * Tokens a board can be played with. Chosen to stay legible when shrunk to a
 * 9x9 cell on a phone, and to read as calm rather than busy.
 */
export const EMOJI_POOL = [
  '🍄', '🌸', '🐢', '🌻', '🦔', '🍋', '🐚', '🌵',
  '🧊', '🍁', '🦭', '🫐', '🌙', '🐝', '🍉', '🪴',
] as const

export function pickEmoji(rng: Rng): string {
  return EMOJI_POOL[randInt(rng, EMOJI_POOL.length)]
}
