/** Every game this app knows how to play. */
export const GAME_IDS = ['queens', 'twoNotTouch', 'tally'] as const
export type GameId = (typeof GAME_IDS)[number]

interface CommonDef {
  id: GameId
  name: string
  blurb: string
}

/**
 * A grid puzzle: one generated board, solved once.
 *
 * Queens and Two Not Touch differ only in how many stars each line takes.
 */
export interface GridGameDef extends CommonDef {
  kind: 'grid'
  /** Stars per row, per column and per region. */
  stars: number
  /** Board sizes offered, easiest first. */
  sizes: readonly number[]
  rules: { line: string; colour: string; touching: string }
}

/** A run: rounds played in sequence until the run is won or lost. */
export interface RunGameDef extends CommonDef {
  kind: 'run'
  /** Run lengths offered, shortest first. `rounds` is how many marks to beat. */
  lengths: readonly { id: string; name: string; rounds: number }[]
}

/**
 * Games come in two shapes, and a single record could only describe both by
 * carrying fields that are meaningless to one of them. The discriminant lets a
 * screen ask what kind of game it is holding rather than assume a size picker.
 */
export type GameDef = GridGameDef | RunGameDef

export const GAMES: Record<GameId, GameDef> = {
  queens: {
    kind: 'grid',
    id: 'queens',
    name: 'Queens',
    stars: 1,
    sizes: [5, 6, 7, 8, 9],
    blurb:
      'One doodle in every row, every column and every colour — and no two may touch, not even at the corners.',
    rules: { line: 'one per row & column', colour: 'one per colour', touching: 'no touching' },
  },
  twoNotTouch: {
    kind: 'grid',
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
  tally: {
    kind: 'run',
    id: 'tally',
    name: 'Tally',
    blurb:
      'Deal your cards across the page and score the best hands you can. Beat the mark before the deals run out, then take a new card into your deck.',
    lengths: [{ id: 'short', name: 'Short', rounds: 8 }],
  },
}

export const gameOf = (id: GameId): GameDef => GAMES[id]

/** Narrowing helpers, so callers do not repeat the discriminant check. */
export const isGrid = (game: GameDef): game is GridGameDef => game.kind === 'grid'
export const isRun = (game: GameDef): game is RunGameDef => game.kind === 'run'

/** The grid puzzles, for screens and routes that only make sense for them. */
export const gridGames = (): GridGameDef[] => GAME_IDS.map((id) => GAMES[id]).filter(isGrid)
