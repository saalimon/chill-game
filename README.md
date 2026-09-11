# Chilled

A small collection of calm puzzle games, built as an installable PWA, drawn as
marks on a sheet of paper. Two games so far: **Queens** and **Two Not Touch**.

Live at **https://deduq.dev/chill-game/**

## The games

Both are played on an n×n grid divided into n irregular colour regions, and both
are played the same way:

- **Tap** a square to rule it out (grey ✕)
- **Double tap** to place the doodle
- A wrong guess is stamped with a red ✕ and costs one of three guesses

**Queens** — one doodle in every row, column and region, none touching, not even
diagonally. Boards from 5×5 to 9×9.

**Two Not Touch** — *two* in every row, column and region, still none touching.
Boards from 8×8 to 10×10. There is no smaller board: two stars in a row must sit
two columns apart, and below 8×8 the column quota then has nowhere left to go.
That bound is asserted in the tests rather than assumed.

A daily puzzle rotates between the two games, and is the same board for everyone.

### Queens, not Star Battle

An earlier version called the one-per-line game "Star Battle". That name — and
"Two Not Touch" — conventionally means the *two*-star puzzle, so the original
game is now Queens and Two Not Touch is a genuinely separate one.

### Why the regions are irregular

Row, column and no-touching constraints are identical on every board, so the
region layout is the only thing that differs between one puzzle and the next —
it carries all the information. Fixed 3×3 boxes would make every 9×9 board the
same board, with many valid answers and nothing to deduce.

## Running it

Node 22 or newer.

```bash
git clone git@github.com:saalimon/chill-game.git
cd chill-game
npm install

npm run dev        # http://localhost:5173/chill-game/
npm test           # the full suite
npm run typecheck
npm run build      # then: npm run preview
```

The dev server lives under `/chill-game/`, not `/`, because the app is served
from a project path in production and every built asset path is absolute.

Firebase is optional. Without credentials the game plays normally and keeps
progress on the device; add them to enable sign-in and cross-device sync.

## How it fits together

```
src/game/starbattle/   pure puzzle logic — no React, no Firebase, no Math.random
src/features/session/  board state: taps, undo, hints, lives, the play clock
src/features/board/    the board, its controls, and the drawing
  paper/               region outlines and the hand-drawn ink layer
  doodles/             the glyph set
src/lib/firebase/      auth, database writes, and the offline outbox
src/shell/             home screen and routes
src/styles/            palette and type tokens
```

### Drawing the board

Nothing on the board is a CSS border. Each region's outline is traced from the
grid and drawn as SVG, with the jitter seeded from the puzzle seed so a board
always looks the same.

Two details make it work. The wobble belongs to the *edge* rather than the
region, so two neighbours sharing a boundary draw the identical line instead of
parting company and letting paper show through. And each edge is smoothed on its
own, so corners stay hard — smoothing straight through them rounds a grid of
squares into blobs.

See [DESIGN.md](DESIGN.md) for the full art direction.

### One engine, two games

The games differ by a single number: stars per row, column and region. The
solver, the region growth, the uniqueness repair, difficulty and the daily all
take it as a parameter rather than being written twice.

Two places needed real work rather than a parameter:

- **Region growth.** A two-star region needs exactly two stars *and* must stay in
  one piece, which rules out seeding it from both — two seeds of one region can
  grow as two islands. Instead a territory is grown per star and neighbouring
  territories are then paired up; the union of two touching connected areas is
  connected, so contiguity survives.
- **Solver pruning.** Two stars per line explodes the search. Precomputing how
  many cells each region still has available below the current row takes 10×10
  generation from a 154ms median to 23ms, and its worst case from 970ms to
  112ms — the difference between a visible freeze and none.

### Generating a puzzle

A board must have exactly one solution, or it isn't a puzzle. Random region
layouts almost never do — measured across 2,000 layouts per size, only 0.4% were
unique at 7×7 and 0.05% at 9×9, so rerolling until one lands is hopeless.

Instead a layout is *carved* into shape. The answer is chosen first, regions are
grown outward from it, and then the solver repeatedly reports a solution we
don't want while one region boundary moves to rule it out. Moving a square that
the unwanted solution uses — but the intended one does not — into a neighbouring
region gives that region two of the unwanted solution's emojis, which kills it,
while the intended answer survives untouched because its own squares never move.

Regions are grown by feeding whichever is currently smallest. Growing them purely
at random let one region swallow the board: measured over 200 boards, the largest
averaged 15 of 49 cells at 7×7 against an ideal of 7, and could reach half the
grid while others stayed a single cell. Sampling a few frontier cells and
choosing the hungriest region brings the largest down to ~12 while keeping the
shapes irregular.

Generation is deterministic from a seed and takes ~15ms at 9×9 (median), so
puzzles are made on the device, offline, with no bank to ship.

### Sound

Six short sounds — tap, mark, place, wrong, solved, lost — synthesised with the
Web Audio API rather than shipped as files, so there is nothing to precache for
offline play. Everything is quiet and soft-edged; a wrong guess is a low thud,
not an alarm.

What plays is decided by diffing the session rather than by the actions, which
keeps the reducer pure. Muting is on the game screen and is remembered. If the
browser has no audio engine, or blocks it, the game plays in silence rather than
failing.

### Staying up to date

A service-worker app serves itself from cache, which is what makes it work on a
plane and also what makes a stale copy so sticky: an installed PWA left open can
keep running an old build indefinitely.

`src/lib/pwa/updates.ts` registers the worker itself rather than letting the
plugin inject a script, so the app can decide what to do about a new one. It
checks on load, whenever the app returns to the foreground, and hourly.

**A new build is taken automatically only from the games list.** Reloading in the
middle of a puzzle would throw away the board being worked on, so everywhere else
a small banner waits for the player to pick the moment.

A first install is deliberately not treated as an update — the very first worker
taking control would otherwise reload the page on someone's first visit.

**Force refresh**, at the bottom of the games list, is the escape hatch: it
unregisters every worker, deletes every cache and reloads. That recovers a copy
stuck on an old build, including one whose worker is scoped to a path the app no
longer lives at.

### Storage

Because generation is deterministic, a stored solve is a seed plus a move list —
a few hundred bytes, no grid. `genVersion` records which generator built it, so
changing generation can't silently turn an old replay into a different puzzle.

```
users/$uid/profile     display name, guest or not
users/$uid/stats       totals, streak, best time per size
users/$uid/solves/$id  size, seed, time, hints, difficulty
users/$uid/replays/$id seed + moves
daily/$date            the day's board
dailyResults/$date/$uid
```

Replays sit beside `solves`, not inside them: the Realtime Database returns
whole subtrees, so nesting would make "show my history" download every move ever
made.

Solves are banked in a `localStorage` outbox before they are sent. The Realtime
Database web SDK only queues writes in memory, so closing the tab while offline
would otherwise lose a puzzle that was just finished.

## Tests

```bash
npm test
```

267 tests, and the weight sits on the engine because that is the part that can
silently produce a broken puzzle. Across 40 seeds × 5 board sizes, every
generated board is asserted to have exactly one solution, `size` contiguous
regions holding exactly one emoji each, an answer obeying all three rules, and
byte-identical output when generated twice — determinism being the assumption the
entire replay format rests on. A budget test fails the build if 9×9 generation
drifts past 150ms, which is the thing that would force the work into a worker.

The drawing is tested too, since it is geometry rather than styling: region
outlines close into rings and account for every boundary edge, a region enclosing
another yields two rings, and a shared edge drifts identically from both sides.

The rest covers session rules (taps, undo, hints, lives), streak arithmetic
across month and leap-day boundaries, the offline outbox, sound (including that
it stays silent when muted and survives a browser with no audio engine), and the
board's interaction through the rendered DOM.

## Deploying

Pushing to `master` runs `.github/workflows/deploy.yml`, which typechecks, tests,
builds and publishes to GitHub Pages.

One-time setup in the repository:

1. **Settings → Pages → Source: GitHub Actions**, and tick **Enforce HTTPS** —
   the service worker only registers over HTTPS, so installing and offline play
   depend on it
2. **Settings → Secrets and variables → Actions** — add the `VITE_FIREBASE_*`
   values from `.env.example` (optional; without them the app is device-only)
3. In the Firebase console, add `deduq.dev` to **Authentication → Settings →
   Authorized domains** (the repo is published through the account's custom
   domain, so `saalimon.github.io` redirects there and is not the origin the
   browser sees)
4. Publish `database.rules.json` to the Realtime Database

### Renaming the repository

The published path is the repository name, so a rename has to be matched in
`vite.config.ts` — `base`, and the manifest's `start_url` and `scope` — or every
absolute asset path 404s under the new name.

Two things a rename does not carry over: the old Pages path stops resolving
rather than redirecting, and an already-installed PWA keeps a service worker
scoped to the old path, so it goes on serving the old cached app until it is
reinstalled.

The Firebase web config is public by design — the app is protected by the
database rules and the authorised-domains list, not by hiding those values.
