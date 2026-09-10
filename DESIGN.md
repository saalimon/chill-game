# Chill Game — art direction

Paper on a desk.

A sage-green ground, a sheet of cream paper pinned to it, and marks made in a
few coloured pens. Every surface in the app is one of those three things, so the
palette is built from the ground, the paper, and the pens used on it.

This replaces an earlier Miro-derived system (white canvas, geometric sans, pill
buttons). Nothing of it remains in the code.

## Palette

| Token | Light | Lamplight | Use |
|---|---|---|---|
| `--ground` | `#929c6f` | `#23261d` | The desk. Page background, with a faint grain. |
| `--paper` | `#f7f2e6` | `#cdc2a6` | Sheets: the board, cards, stat tiles. |
| `--paper-shade` | `#e4dcc7` | `#b3a686` | Chips and buttons cut from the same sheet. |
| `--ink` | `#2f3d4a` | `#2a3340` | Every drawn line and most text. |
| `--kraft` | `#d8c3a2` | — | The daily puzzle's sticker. |
| `--pen-pink` | `#e0466b` | | Pins, and one of the doodle inks. |
| `--pen-blue` | `#7d9ac2` | | The sheet's pin, rule dots, focus rings. |
| `--pen-yellow` | `#d9b93f` | | A doodle ink. |
| `--pen-red` | `#d0442f` | | Wrong guesses only. |

Nine region washes (`--region-0` … `--region-8`) sit deliberately close to the
paper: wheat, blush, sage mist, periwinkle, sand, celadon, mauve, sky, olive
cream. **The drawn line, not the colour, is what separates one region from the
next.** That keeps the board readable for colourblind players and stops a
nine-colour grid from turning loud.

### Lamplight, not dark mode

The dark theme dims the paper and darkens the desk; the ink stays ink. Inverting
to pale ink on a dark sheet would throw away the paper the whole design rests on.

## Type

Two voices, and the split carries meaning — printed labels versus handwritten
marks.

- **Caveat** (`--font-hand`) — the wordmark, headings, the clock, board labels,
  button text, and the how-to-play notes. Anything a person would have written
  on the sheet.
- **Hanken Grotesk** (`--font-body`) — body copy and small print, where
  legibility at 12–14px matters more than character.

Both are self-hosted, latin subset only, so they work offline.

## Drawing

Nothing on the board is a CSS border. `src/features/board/paper/` traces each
region's outline and draws it as SVG, and the ink layer sits over the grid of
cell buttons taking no pointer events.

Three rules hold it together:

1. **Fill and stroke come from the same path.** A CSS background has a straight
   edge; a wobbly line over it leaves a visible straight seam alongside the drawn
   one.
2. **Wobble belongs to the edge, not the region.** Two neighbouring regions share
   a boundary and walk it in opposite directions. The jitter is seeded from the
   edge's own coordinates so both draw the identical line — otherwise their fills
   part company and paper shows through the gap.
3. **Corners are hard points.** Each edge is smoothed on its own and the runs are
   joined end to end. Smoothing straight through a corner rounds it away, and a
   grid of rounded-off regions stops reading as squares.

Wobble is seeded from the puzzle seed, so a given board always draws identically
— the same determinism the replay format relies on.

## Doodles

Fourteen glyphs in `src/features/board/doodles/glyphs.ts`, all on a 24×24 canvas
with round caps and joins, coloured by `currentColor`. Each puzzle picks a glyph
and a pen, both seeded.

They replaced emoji: system emoji are glossy, multicoloured, and render
differently on every platform, none of which sits on hand-drawn paper. A board
draws its glyph up to 81 times, so each is defined once as an SVG `<symbol>` and
referenced with `<use>`.

## Texture and depth

The system is flat apart from paper lifting off the desk. Sheets get a soft drop
shadow and slightly unequal corner radii so they read as cut by hand. Pins are
drawn circles with a highlight and a cast shadow.

The desk's grain is a small tiled SVG `data:` URI at low opacity — **not** a live
`feTurbulence` filter, which over a full-screen layer costs real battery on a
phone.

## Copy

Sentence case, plain verbs. A broken rule is information, not an error: the game
has three guesses and no scolding. Empty and finished states say what to do next.
