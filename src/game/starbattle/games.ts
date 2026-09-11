/** The puzzles this app knows how to make. */
export const GAME_IDS = ['queens', 'twoNotTouch'] as const
export type GameId = (typeof GAME_IDS)[number]

export interface GameDef {
  id: GameId
  name: string
  /** Stars per row, per column and per region. */
  stars: number
  /** Board sizes offered, easiest first. */
  sizes: readonly number[]
  blurb: string
  rules: { line: string; colour: string; touching: string }
}

export const GAMES: Record<GameId, GameDef> = {
  queens: {
    id: 'queens',
    name: 'Queens',
    stars: 1,
    sizes: [5, 6, 7, 8, 9],
    blurb:
      'One doodle in every row, every column and every colour — and no two may touch, not even at the corners.',
    rules: { line: 'one per row & column', colour: 'one per colour', touching: 'no touching' },
  },
  twoNotTouch: {
    id: 'twoNotTouch',
    name: 'Two Not Touch',
    stars: 2,
    // Below 8x8 there is no legal placement at all: two stars per row must sit
    // two columns apart, and the column quota then has nowhere left to go.
    sizes: [8, 9, 10],
    blurb:
      'Two doodles in every row, every column and every colour — and no two may touch, not even at the corners.',
    rules: { line: 'two per row & column', colour: 'two per colour', touching: 'no touching' },
  },
}

export const gameOf = (id: GameId): GameDef => GAMES[id]
