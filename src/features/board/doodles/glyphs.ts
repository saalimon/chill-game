import type { TokenId } from '@/game/starbattle/tokens'

export interface Glyph {
  /** Path data on a 24x24 canvas. */
  d: string
  /** Filled shapes read as solid marks; stroked ones read as pen lines. */
  mode: 'fill' | 'stroke'
  /** Stroke weight for `mode: 'stroke'`, in canvas units. */
  width?: number
  /** Spoken name, used in the board's ARIA labels. */
  label: string
}

/**
 * The drawn vocabulary.
 *
 * Every glyph is authored on the same 24x24 canvas with round caps and joins,
 * so a board full of them looks drawn by one hand. Geometry for the regular
 * shapes was computed rather than eyeballed, with a small fixed wobble baked in
 * — fixed, not random, so a glyph never changes between renders.
 *
 * Colour comes from `currentColor`, which lets a single definition be reused by
 * every cell and still follow the puzzle's ink.
 */
export const GLYPHS: Record<TokenId, Glyph> = {
  star: {
    mode: 'fill',
    label: 'star',
    d: 'M12.01 2.51L13.98 8.53L20.56 9.54L15.27 13.56L17.08 19.2L11.8 16.16L6.51 19.48L8.65 13.16L2.97 9.1L10.01 8.7Z',
  },
  flower: {
    mode: 'fill',
    label: 'flower',
    d: 'M8.48 6.73a3.46 3.25 0 1 0 6.92 0a3.46 3.25 0 1 0 -6.92 0ZM13.45 10.55a3.59 3.37 0 1 0 7.18 0a3.59 3.37 0 1 0 -7.18 0ZM11.75 16.33a3.38 3.18 0 1 0 6.76 0a3.38 3.18 0 1 0 -6.76 0ZM5.43 16.3a3.69 3.47 0 1 0 7.38 0a3.69 3.47 0 1 0 -7.38 0ZM3.58 10.44a3.46 3.25 0 1 0 6.92 0a3.46 3.25 0 1 0 -6.92 0Z',
  },
  curl: {
    mode: 'stroke',
    width: 2,
    label: 'curl',
    d: 'M4.4 17.2C4 11.4 8.2 7.4 11.7 9.6C14.8 11.5 12.1 15.9 9 14.2C6.3 12.7 8.7 8.2 13.2 8.8C16.8 9.3 19.2 12.6 19.7 16.4',
  },
  asterisk: {
    mode: 'stroke',
    width: 2,
    label: 'asterisk',
    d: 'M4 14.45L20.32 9.63M5.81 5.81L18.24 17.74M14.48 3.61L9.63 20.38',
  },
  cloud: {
    mode: 'fill',
    label: 'cloud',
    d: 'M6.2 16.6Q2.8 16.4 3.2 13.4Q3.6 10.6 6.6 10.9Q6.4 6.4 10.8 6.2Q14.8 6 15.6 9.6Q19.6 9.2 20.4 12.6Q21 16.4 17.2 16.6Z',
  },
  leaf: {
    mode: 'stroke',
    width: 1.9,
    label: 'leaf',
    d: 'M12 4.4Q19.6 10.2 12 19.6Q4.4 10.2 12 4.4ZM12 6.2L12 18.2',
  },
  moon: {
    mode: 'fill',
    label: 'moon',
    d: 'M15.6 4.5A8.6 8.6 0 1 0 15.6 19.5A7.2 7.2 0 0 1 15.6 4.5Z',
  },
  drop: {
    mode: 'fill',
    label: 'drop',
    d: 'M12 3.8Q18.6 12 18.6 15.3A6.6 6.6 0 0 1 5.4 15.3Q5.4 12 12 3.8Z',
  },
  spiral: {
    mode: 'stroke',
    width: 1.8,
    label: 'spiral',
    d: 'M12 12L12.18 12.07L12.28 12.24L12.27 12.49L12.11 12.74L11.81 12.92L11.4 12.95L10.96 12.8L10.57 12.44L10.32 11.91L10.29 11.26L10.52 10.58L11.02 9.98L11.77 9.58L12.67 9.47L13.62 9.71L14.47 10.31L15.08 11.23L15.35 12.37L15.18 13.59L14.55 14.73L13.51 15.62L12.17 16.11L10.67 16.09L9.22 15.52L8.01 14.43L7.23 12.92L7.02 11.18L7.45 9.4L8.52 7.84L10.12 6.72L12.08 6.2L14.16 6.42L16.09 7.38L17.6 9L18.48 11.11L18.57 13.46L17.81 15.75L16.25 17.69L14.06 18.99L11.49 19.46L8.85 18.99L6.49 17.59L4.72 15.4L3.8 12.67L3.9 9.73L5.04 6.95',
  },
  sprig: {
    mode: 'stroke',
    width: 1.9,
    label: 'sprig',
    d: 'M12 20.4L12 5M12 9.4Q7.4 8.4 6.4 4.8M12 9.4Q16.6 8.4 17.6 4.8M12 14.6Q7.7 13.6 6.7 10.2M12 14.6Q16.3 13.6 17.3 10.2',
  },
  berry: {
    mode: 'fill',
    label: 'berry',
    d: 'M6.1 15.2a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0 -6.6 0ZM11.3 15.2a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0 -6.6 0ZM8.7 10.2a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0 -6.6 0Z',
  },
  sun: {
    mode: 'stroke',
    width: 2,
    label: 'sun',
    d: 'M7.6 12a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M18.42 12.72L21.32 13.24M16.22 17.3L18.12 19.14M11.48 18.82L11.11 21.51M6.99 16.43L4.7 18.36M5.43 11.43L2.35 11.14M7.97 6.76L5.63 4.47M12.86 5.58L12.93 2.2M16.82 7.62L19.3 6.15',
  },
  wave: {
    mode: 'stroke',
    width: 2,
    label: 'wave',
    d: 'M3.6 14.6Q7.3 9.4 11 14.6Q14.7 19.8 18.4 14.6M3.6 9.2Q7.3 4 11 9.2Q14.7 14.4 18.4 9.2',
  },
  pinwheel: {
    mode: 'fill',
    label: 'pinwheel',
    d: 'M12 12Q16.53 17.16 20.8 12Q15.86 9.89 12 12ZM12 12Q6.84 16.53 12 20.8Q14.11 15.86 12 12ZM12 12Q7.47 6.84 3.2 12Q8.14 14.11 12 12ZM12 12Q17.16 7.47 12 3.2Q9.89 8.14 12 12Z',
  },
}
