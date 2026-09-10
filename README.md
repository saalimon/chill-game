# Chilled

A small collection of calm puzzle games, built as an installable PWA. It ships
with one game: **Emoji Star Battle**.

Live at https://deduq.dev/chilled-game/

## The game

An n×n grid is divided into n irregular colour regions. Place one emoji in every
row, every column and every region — and no two emojis may touch, not even
diagonally.

- **Tap** a square to rule it out (grey ✕)
- **Double tap** to place the emoji
- A wrong guess is stamped with a red ✕ and costs one of three guesses

Boards run from 5×5 to 9×9, plus a daily puzzle that is the same for everyone.

### Why the regions are irregular

Row, column and no-touching constraints are identical on every board, so the
region layout is the only thing that differs between one puzzle and the next —
it carries all the information. Fixed 3×3 boxes would make every 9×9 board the
same board, with many valid answers and nothing to deduce.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173/chilled-game/
npm test           # the full suite
npm run typecheck
npm run build
```

Firebase is optional. Without credentials the game plays normally and keeps
progress on the device; add them to enable sign-in and cross-device sync.

## How it fits together

```
src/game/starbattle/   pure puzzle logic — no React, no Firebase, no Math.random
src/features/session/  board state: taps, undo, hints, lives, the play clock
src/features/board/    the board and its controls
src/lib/firebase/      auth, database writes, and the offline outbox
src/shell/             home screen and routes
```

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

Generation is deterministic from a seed and takes 1.6ms at 9×9 (median), so
puzzles are made on the device, offline, with no bank to ship.

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

The Firebase web config is public by design — the app is protected by the
database rules and the authorised-domains list, not by hiding those values.
