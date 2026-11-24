# JustClickIt

**One giant button. Eight tiny distractions. Zero productivity guaranteed.**

JustClickIt is a monochrome, neobrutalist web app for bored people. Press the big
button and take whatever the boredom gods hand you — a dare, a drum kit, a reflex
test, a tiny oracle. All in English, all client-side.

> **Phase 1 is complete** (see `TODO.md` §6). The app is a Vite + TypeScript
> project with persistent local state, achievements, and a daily streak.
> Phase 2 (Supabase backend, leaderboard, sharing, Party mode) and Phase 3
> (PWA, SEO/Open Graph, analytics) are **not** built yet.

## The eight distractions

| #   | Game             | What it does                            |
| --- | ---------------- | --------------------------------------- |
| 1   | Random Dare      | 24 missions, no take-backs              |
| 2   | Brain Snack      | Facts, jokes, riddles, Would You Rather |
| 3   | Reaction Test    | Wait for the flip, tap instantly        |
| 4   | Tap Rush         | 10 seconds, as many taps as possible    |
| 5   | Beat Pad         | 8 Web Audio drums + auto-beat sequencer |
| 6   | Memory Echo      | Simon-style pattern game                |
| 7   | Guess the Number | 1–100 with thermal hints                |
| 8   | The Oracle       | Coin flip, dice roll, decision ball     |

## Setup

Requires **Node.js 22+** and npm.

```bash
npm ci
npm run dev      # local dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

## Scripts

| Script             | What it does                               |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Vite dev server                            |
| `npm run build`    | `tsc -b && vite build`                     |
| `npm run preview`  | Serve `dist/` (used by the e2e tests)      |
| `npm test`         | Vitest unit tests                          |
| `npm run test:e2e` | Playwright smoke tests (Chromium + mobile) |
| `npm run lint`     | ESLint                                     |
| `npm run format`   | Prettier (write)                           |

## GitHub Pages (hosting decision — locked)

The site is deployed to **GitHub Pages** from `main` via
`.github/workflows/deploy.yml` (checkout → `npm ci` → `npm run build` →
deploy `dist/`).

- **Base path:** Vite `base` is `/JustClickIt/` (repo name). The site lives at
  `https://<user>.github.io/JustClickIt/`. The PWA manifest, fonts and asset
  URLs all use the same base — do not change it to `/` unless the repo is
  renamed or a custom domain is added.
- **Repo must be public** for free GitHub Pages. A private repo needs a paid
  plan; if the code must stay private, revisit this decision.
- There is **no server** on the host. Everything is static + client-side;
  the Phase 2 backend (Supabase) is external and called from the browser.
- No per-PR preview deployments: test previews locally with `npm run preview`.

## Data & privacy (Phase 1)

- All progress is stored **locally** in `localStorage` under the key
  `justclickit:v1` (versioned, validated on load). Corrupt data is backed up
  to `justclickit:v1:corrupt:<timestamp>` and the app starts fresh — it never
  crashes on bad stored data.
- Stored: total clicks, distractions tried, best scores (Reaction, Tap Rush,
  Memory Echo, Guess the Number), play history (last 50), achievements,
  daily streak, theme/sound settings, and an anonymous device ID (created
  once, used later for the Phase 2 leaderboard — no account, no login).
- **Clear my data** (in the app toolbar) wipes everything after a confirm.
- No analytics, no tracking, no network requests except the self-hosted fonts
  (which are served from this same site).

## Achievements

11 badges: First Click, Explorer (4 distractions), Completionist (all 8),
Lightning (reaction < 180 ms), Fast Fingers (Tap Rush ≥ 70), Echo Master
(Memory Echo level 8), Lucky Guesser (≤ 4 guesses), Beatmaker (10 pad hits
or 5 auto-beats), Oracle Believer (10 asks), 3-Day Streak, 7-Day Streak.
Unlocks show a toast once and are listed in the Achievements modal.

## Project layout

```
index.html                  # shell markup + meta (title/description only)
src/
  main.ts                   # bootstrap: store, theme, error handler
  app.ts                    # shell wiring: big button, stats, modals, toolbar
  styles/                   # tokens.css, fonts.css, base.css, components.css, games.css
  lib/
    random.ts  dom.ts  fx.ts          # helpers + confetti
    audio/ engine.ts blips.ts drums.ts # Web Audio synth
    store/ schema.ts storage.ts achievements.ts
    streak.ts               # local-date daily streak
    data.ts                 # typed access to the JSON decks
  data/                     # dares/facts/jokes/riddles/wyr/oracle JSON (76 items)
  games/                    # types.ts, registry.ts + one module per game
  components/toast.ts       # achievement toast queue
tests/
  unit/                     # schema, storage, streak, achievements, random, data
  e2e/smoke.spec.ts         # Playwright: load, big button, all 8 games, persistence
```

## Content note (parity with the prototype)

The content decks were extracted verbatim from the original single-file
prototype (`justclickit.html`, 1,001 lines). Actual counts: **24 dares,
12 facts, 10 jokes, 8 riddles, 10 Would You Rather pairs, 12 Oracle
answers = 76 items**. (The planning TODO said 9 riddles / 11 WYR pairs;
the file itself has 8 / 10 — the tests assert the real counts.)

Known placeholder carried over from the prototype (to be replaced in
Phase 2): Would You Rather percentages are locally generated
(`34 + rand(34)`), not real votes.

## Still to do (Phase 2 / 3)

- Phase 2: Supabase (real WYR votes, Global Daily Leaderboard, Share Result
  cards, Submit-a-Dare moderation queue, Party / Pass & Play).
- Phase 3: PWA manifest + Service Worker, favicon set, SEO / Open Graph,
  privacy-friendly analytics (Umami / Plausible).
- See `TODO.md` for the full phased checklist.
