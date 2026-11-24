# JustClickIt — Production TODO

> **Status:** Phase 1 DONE 2026-11-25 (see §6 — all items checked). No code was modified for the planning document itself; the production code lives in this repo.
> **Status (original):** Planning only.
> **Source analysed:** `justclickit.html` (exported from the `justclickit` web artifact)
> **Date:** 2026-11-25
> **Goal:** Turn the current single-file prototype into a production-ready, publicly releasable web app — same concept, same monochrome neobrutalist style, in English.

---

## 1. Current-state analysis (what exists today)

### 1.1 File facts

| Item         | Finding                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| File         | `justclickit.html` — **56,645 bytes, 1,001 lines, single file**                                                                           |
| HTML markup  | Lines 1–11 (head) + ~315–359 (body: header, big button, stats, stage, grid, marquee)                                                      |
| CSS          | Lines 12–314 — **~303 lines, inline in `<style>`**, CSS variables for light/dark via `prefers-color-scheme` only (no manual theme toggle) |
| JavaScript   | Lines 360–999 — **~640 lines, inline in one `<script>`, ES5-style `var` + string-concatenated `innerHTML`**                               |
| Fonts        | Google Fonts CDN: Archivo Black, Archivo, JetBrains Mono (external dependency, not self-hosted)                                           |
| Favicon      | `<link rel="icon" href="data:,">` — i.e. **no favicon at all**                                                                            |
| SEO / social | Only `<title>JustClickIt</title>`. **No** `description`, **no** Open Graph, **no** Twitter Card, **no** `theme-color`                     |
| PWA          | **None.** No `manifest.json`, no Service Worker, no app icons, no offline support                                                         |
| Analytics    | **None**                                                                                                                                  |
| Persistence  | **None** — see §1.2                                                                                                                       |
| Backend      | **None** — fully client-side                                                                                                              |

### 1.2 State (the part that must be migrated)

Current state, line 369:

```js
var state = { clicks: 0, tried: {}, bestReaction: null, bestTap: null, bestSimon: 0 };
```

- Lives **only in memory**. Refresh = total reset: clicks, tried (0/8), best Reaction, best Tap Rush, best Memory Echo all lost.
- `renderStats()` (lines 372–383) is the only consumer; there is no save/load, no validation, no versioning.
- No streak, no achievements, no history, no per-game stats beyond the three bests above.

### 1.3 Content decks (static data, inline in JS)

| Deck      | Lines    | Count         | Notes                                                       |
| --------- | -------- | ------------- | ----------------------------------------------------------- |
| `DARES`   | 425–~450 | 24            | Random Dare                                                 |
| `FACTS`   | 451–~464 | 12            | Brain Snack                                                 |
| `JOKES`   | 465–~476 | 10            | Brain Snack                                                 |
| `RIDDLES` | 477–~486 | 9 (+answers)  | Brain Snack                                                 |
| `WYR`     | 487–~498 | 11 pairs      | Would You Rather                                            |
| `ANSWERS` | 499–~508 | 12            | The Oracle decision ball                                    |
| **Total** |          | **~78 items** | All hard-coded, no IDs, no categories, no moderation fields |

### 1.4 The 8 activities (registry + render functions)

Registry `ACTIVITIES` (lines 922–931). Each entry is `{ id, name, tag, icon, desc, render }`, rendered into `#stage` by `openActivity()` (lines 934–949), with an optional cleanup function returned by each renderer.

| #   | id         | Render fn     | Lines    | Own state / timers               | Notes for migration                         |
| --- | ---------- | ------------- | -------- | -------------------------------- | ------------------------------------------- |
| 1   | `dare`     | `actDare`     | ~510–531 | none                             | Pure pick from `DARES`                      |
| 2   | `snack`    | `actSnack`    | ~532–595 | `lastFact`, `lastJoke`, `riddle` | **WYR fake votes, see §1.5**                |
| 3   | `reaction` | `actReaction` | ~596–638 | `tries[]`, `setTimeout`          | Best = min of session tries; no persistence |
| 4   | `taprush`  | `actTapRush`  | ~639–673 | `setInterval` 10 s               | Best = max taps in session                  |
| 5   | `beat`     | `actBeat`     | ~674–744 | `beatIv`, keydown listener       | Own synth code, see §1.6                    |
| 6   | `memory`   | `actSimon`    | ~745–809 | `seq[]`, `timers[]`              | Best = `bestSimon` (longest level)          |
| 7   | `guess`    | `actGuess`    | ~810–850 | target number, chips             | No best/score persisted                     |
| 8   | `oracle`   | `actOracle`   | ~851–919 | coin/dice/ball sub-views         | Pure `Math.random()`                        |

The big button (lines 973–996): slot-machine shuffle (11 ticks × 70 ms), picks a random activity excluding the current one, calls `openActivity()`. No debouncing beyond the `shuffling` flag, no analytics event.

### 1.5 Known fake / placeholder behaviour (must be replaced, not copied)

- **Would You Rather percentages are fake.** Lines ~577–578:
  ```js
  var mine = 34 + rand(34),
    other = 100 - mine;
  ```
  The displayed % is generated locally with `Math.random()` on every vote. There is no vote stored anywhere.
- **No anti-cheat / validation anywhere.** Scores are computed in the browser and never leave it, so any leaderboard built on top of the current code would be trivially spoofable.

### 1.6 Audio (Web Audio API, inline)

- Singleton `AudioContext` + `blip()` helper (lines 386–400): oscillator + gain envelope, used for UI clicks and game feedback.
- Beat Pad drums (lines ~700–718): `drumKick`, `drumSnare`, `drumHat`, `drumClap`, `drumTom`, `drumCymbal`, `drumBass`, `drumBlip` — all synthesised with oscillators / filtered noise buffers (`noiseBuf`, `Math.random()` white noise). Auto-beat sequencer (lines ~720–732) uses `setInterval` with hard-coded steps and random fills (`Math.random() < 0.6 / 0.3`).
- No mute/volume control, no `AudioContext` resume handling beyond line 389, no sound toggle persisted.

### 1.7 Other gaps found in the audit

- [ ] No error boundary / global error handling; a single JS error kills the whole app.
- [ ] No tests of any kind (unit, e2e, or manual checklist).
- [ ] No build step, no minification, no cache-busting, no versioning.
- [ ] Accessibility is partial: `aria-live` on stage/next-up, focus outlines exist, but no keyboard access for the big button shuffle, no reduced-motion handling beyond the `reduced` flag, no screen-reader labels for several game pads.
- [ ] No privacy policy / terms for user-generated content, no cookie/consent handling (needed once analytics + backend exist).
- [ ] Content is English-only in the app, but there is no `lang` strategy beyond `<html lang="en">` — fine, keep it English-only by design.

---

## 2. Decisions to lock before Phase 1 (30 minutes, do not skip)

These block later phases. Decide once, write the answers at the top of this file.

- [ ] **Backend choice:** Supabase (recommended — Postgres + Auth optional + Realtime + RLS) **or** Firebase (Firestore + Auth). Default in this TODO: **Supabase**.
- [x] **Hosting:** **GitHub Pages — decided 2026-11-25.** No separate hosting service (no Vercel / Netlify / Cloudflare Pages). Static site only, deployed from the GitHub repo via GitHub Actions (`actions/deploy-pages`). Implications, do not forget:
  - Repo must be **public** for free GitHub Pages (private-repo Pages needs a paid plan). If the code must stay private, this decision needs revisiting.
  - Vite `base` must be `/<repo-name>/` (e.g. `/justclickit/`), not `/`. Same for PWA `start_url` / `scope`, manifest icons, and `og:url` / `og:image` (absolute `https://<user>.github.io/<repo>/...` URLs).
  - No server-side code on the host: Supabase (external) still works fine, because all backend calls are client-side. No preview deployment per PR like Vercel — test previews locally with `npm run preview` instead.
  - Add `.github/workflows/deploy.yml` (checkout → `npm ci` → `npm run build` → upload `dist/` → deploy-pages). Deploy on push to `main` only.
- [ ] **Domain:** `https://<user>.github.io/<repo>/` for launch; custom domain later (via repo Settings → Pages → Custom domain + `public/CNAME`, and update `og:url` / canonical).
- [ ] **Analytics:** Umami (self-hosted or cloud) **or** Plausible (cloud). Pick one; both are privacy-friendly, no cookies.
- [ ] **Identity for leaderboards:** anonymous device ID (UUID in `localStorage`, no login) **or** optional display name only (no account) **or** full auth. Recommended for launch: **anonymous device ID + optional display name, no password**.
- [ ] **Moderation policy for UGC:** manual approval queue only (recommended for launch) vs. auto-approve + report button. Who approves, and how often?
- [ ] **Content licence / safety:** minimum age, no personal data in dares/prompts, blocklist of words/topics.

---

## 3. Target folder structure (Vite)

```
justclickit/
├── TODO.md                     # this file
├── README.md                   # setup, scripts, deploy, env vars
├── .github/workflows/deploy.yml # GitHub Pages: build Vite → deploy dist/ (push to main)
├── package.json                # vite, workbox / vite-plugin-pwa, vitest, playwright
├── vite.config.ts              # build, PWA plugin, env, base path
├── index.html                  # entry only: meta/OG/PWA tags, <div id="app">, script module
├── public/
│   ├── manifest.webmanifest    # PWA manifest
│   ├── favicon.svg             # neobrutalist favicon (also .ico + apple-touch-icon.png)
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-512-maskable.png
│   │   └── apple-touch-icon.png
│   ├── og-image.png            # 1200×630 Open Graph image
│   └── robots.txt
├── src/
│   ├── main.ts                 # bootstrap: mount app, register SW, init store, analytics
│   ├── app.ts                  # shell: header, big button, stats bar, stage, grid, marquee
│   ├── styles/
│   │   ├── tokens.css          # CSS variables (light/dark, neobrutalist shadows)
│   │   ├── base.css
│   │   ├── components.css      # buttons, cards, tiles, pads, toast
│   │   └── games.css           # per-game layout (or split per game)
│   ├── lib/
│   │   ├── random.ts           # seeded / non-seeded helpers, no-repeat pick
│   │   ├── audio/
│   │   │   ├── engine.ts       # AudioContext singleton, resume, mute, volume
│   │   │   ├── blips.ts        # UI blips
│   │   │   └── drums.ts        # kick/snare/hat/clap/tom/cymbal/bass (from actBeat)
│   │   ├── store/
│   │   │   ├── schema.ts       # Zod-style schema + version, see §4
│   │   │   ├── storage.ts      # localStorage load/save, migration, corruption recovery
│   │   │   └── achievements.ts # definitions + unlock check
│   │   ├── analytics.ts        # Umami/Plausible wrapper, event names, consent flag
│   │   ├── share.ts            # Canvas score-card renderer + Web Share API + clipboard
│   │   └── party.ts            # Pass & Play session state (players, turns, scores)
│   ├── data/
│   │   ├── dares.json          # 24 existing dares, each with { id, text, category }
│   │   ├── facts.json          # 12 facts
│   │   ├── jokes.json          # 10 jokes
│   │   ├── riddles.json        # 9 riddles { id, q, a }
│   │   ├── wyr.json            # 11 pairs { id, a, b } — votes live in DB, not here
│   │   └── oracle.json         # 12 decision-ball answers
│   ├── games/
│   │   ├── types.ts            # Game module interface: { id, name, tag, icon, desc, mount(el, ctx), unmount() }
│   │   ├── registry.ts         # the 8 games, in order
│   │   ├── dare.ts
│   │   ├── snack.ts            # incl. Would You Rather (real votes)
│   │   ├── reaction.ts
│   │   ├── taprush.ts
│   │   ├── beat.ts
│   │   ├── memory.ts
│   │   ├── guess.ts
│   │   └── oracle.ts
│   ├── components/
│   │   ├── toast.ts            # achievement toast queue
│   │   ├── stats-bar.ts
│   │   ├── leaderboard.ts      # daily global board (Phase 2)
│   │   └── share-card.ts       # Canvas card preview + download
│   └── sw.ts                   # Service Worker (via vite-plugin-pwa / Workbox)
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql        # tables in §5
│   └── seed.sql                # WYR pairs + starter dares/prompts (approved)
└── tests/
    ├── unit/                   # store schema, achievements, streak, party scoring
    └── e2e/                    # Playwright: big button → each game → share → PWA install
```

**Migration rule:** every file moved out of `justclickit.html` must keep the exact current behaviour first (parity), then get its improvement in the same phase's checklist. No behaviour change hidden inside a move.

---

## 4. Local data schema (localStorage, Phase 1)

Key: `justclickit:v1` (single JSON object, versioned). Validate on load; on schema mismatch or corrupt JSON, back up the raw string to `justclickit:v1:corrupt:<timestamp>` and start fresh — never crash the app.

```ts
type LocalStateV1 = {
  version: 1;
  deviceId: string; // UUID, created once, used for leaderboard (anonymous)
  displayName?: string; // optional, user-set, max 20 chars
  clicks: number;
  tried: Record<string, true>; // game id -> tried, e.g. { dare: true, ... }
  triedAt: Record<string, string>; // game id -> ISO date first tried
  best: {
    reactionMs: number | null; // lower is better
    tapRush: number | null; // higher is better
    memoryLevel: number; // highest level reached
    guessFewest?: number | null;
  };
  history: Array<{ gameId: string; at: string; score?: number | string }>; // last 50, newest first
  achievements: Record<string, string>; // achievement id -> ISO date unlocked
  streak: {
    lastVisit: string | null; // YYYY-MM-DD, local date
    count: number; // consecutive days
    best: number;
  };
  settings: {
    theme: 'system' | 'light' | 'dark';
    sound: boolean;
    reducedMotion: boolean; // default: respect prefers-reduced-motion
  };
  party?: {
    // Phase 1, §7.4 — kept local, session only
    players: string[];
    scores: Record<string, number>;
  };
};
```

- [x] Write `schema.ts` with runtime validation (Zod or hand-rolled validator + tests).
- [x] Write `storage.ts`: `load()`, `save()` (debounced, e.g. 150 ms), `migrate()` for future `v2`, `reset()` with confirm.
- [x] Keep the existing stats bar rendering, but source it from the store (no direct `state.clicks` mutation from game code).

---

## 5. Database schema (Supabase / Postgres, Phase 2)

Recommended: **Supabase**. If Firebase is chosen instead, translate each table to a Firestore collection with the same fields.

```sql
-- Would You Rather: one row per pair (seeded from src/data/wyr.json)
create table wyr_pairs (
  id          text primary key,          -- e.g. 'wyr-01', stable across deploys
  option_a    text not null,
  option_b    text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- One vote per device per pair. Upsert on (pair_id, device_id).
create table wyr_votes (
  pair_id     text not null references wyr_pairs(id),
  device_id   text not null,             -- anonymous UUID from localStorage
  choice      smallint not null check (choice in (0, 1)),
  voted_at    timestamptz not null default now(),
  primary key (pair_id, device_id)
);

-- Global Daily Leaderboard: one row per device per game per day.
-- Score is the player's BEST for that day; update only if better.
create table leaderboard_daily (
  day         date not null,             -- UTC date
  game        text not null check (game in ('reaction', 'taprush')),
  device_id   text not null,
  display_name text,                     -- optional, max 20 chars, sanitised
  score       numeric not null,          -- reaction: ms (lower wins); taprush: taps (higher wins)
  updated_at  timestamptz not null default now(),
  primary key (day, game, device_id)
);
create index on leaderboard_daily (day, game, score);

-- User-generated content: dares + prompts, approval queue.
create table submissions (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('dare', 'wyr', 'fact', 'joke', 'riddle')),
  text_a      text not null,             -- dare text / WYR option A / fact / joke / riddle question
  text_b      text,                      -- WYR option B / riddle answer, null otherwise
  device_id   text not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason      text,                      -- moderator note on rejection
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Optional: aggregated WYR counts as a view (avoid counting votes on every read).
create view wyr_results as
  select pair_id,
         count(*) filter (where choice = 0) as votes_a,
         count(*) filter (where choice = 1) as votes_b
  from wyr_votes group by pair_id;
```

**Security (RLS — do not skip):**

- [ ] `wyr_pairs`: public read-only (`select` for all, no insert/update/delete from client).
- [ ] `wyr_votes`: public insert + update own row only (`device_id` = caller's device ID passed as a claim/header — document the exact mechanism; never trust a client-supplied `device_id` for _other_ devices' rows). Rate-limit: 1 vote per pair per device (enforced by PK) + server-side throttle.
- [ ] `leaderboard_daily`: public read; insert/update only for the caller's own `device_id`, and only if the new score is better than the stored one (enforce in a Postgres function / Edge Function, not in client JS).
- [ ] `submissions`: public insert (with rate limit, e.g. max 5/day/device); **no** public read of pending rows; approved rows readable only via a separate approved-content view/table.
- [ ] Enable RLS on every table before launch. Test with an anonymous key: try to read pending submissions, overwrite someone else's leaderboard row, and vote twice — all three must fail.

---

## 6. Phase 1 — Foundation & Local

**Goal:** Same app, modular codebase, data survives refresh, achievements + streak work offline. No backend yet.
**Exit criteria:** `npm run build` passes, all 8 games behave identically to the prototype, refresh keeps clicks/records/streak, Lighthouse PWA checks are _not_ yet required (Phase 3).

### 6.1 Project setup

- [x] Init Vite project (vanilla TS template) in the folder structure from §3.
- [x] Set Vite `base: '/<repo-name>/'` for GitHub Pages (see §2) and add the deploy workflow `.github/workflows/deploy.yml` early, so every later phase can be previewed on the real Pages URL.
- [x] Add `package.json` scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `format`.
- [x] Add TypeScript strict mode, ESLint + Prettier.
- [x] Set up Vitest (unit) + Playwright (e2e, Chromium + mobile viewport).
- [x] Add `.env.example` (no secrets in Phase 1; placeholder keys for Phase 2).

### 6.2 Split the single file (parity first)

- [x] Extract CSS (lines 12–314) → `src/styles/tokens.css` + `base.css` + `components.css` + `games.css`. Keep the exact neobrutalist look: hard shadows, Archivo Black headings, JetBrains Mono numbers.
- [x] Extract the shell markup (header, big button, stats, stage, grid, marquee) → `src/app.ts` + `index.html` skeleton.
- [x] Extract content decks → `src/data/*.json` with stable `id`s (see §1.3). Keep the exact 24 / 12 / 10 / 9 / 11 / 12 items.
- [x] Extract the game registry → `src/games/registry.ts` + `types.ts` with the `mount(el, ctx) / unmount()` interface. Each current `actX(stage)` becomes a module that returns its cleanup function.
- [x] Extract audio → `src/lib/audio/engine.ts` (singleton, resume, mute), `blips.ts`, `drums.ts` (the 8 drum synths + auto-beat). No behaviour change.
- [x] Extract helpers (`$`, `$$`, `rand`, `pick`, confetti) → `src/lib/random.ts` + a small `dom.ts` / `fx.ts`.
- [x] Delete the old `justclickit.html` only after the Vite build renders identically (screenshot diff: desktop + 390 px mobile, light + dark). — N/A in this repo: the source file lives outside the repo (`~/workspace/your_files/justclickit/justclickit.html`) and was left untouched per the Phase 1 constraints; parity was verified by screenshot (desktop light + 390px dark) and e2e.
- [x] Self-host fonts: download Archivo / Archivo Black / JetBrains Mono (WOFF2), serve from `public/fonts/`, remove the Google Fonts CDN link. Fallback stack stays `system-ui, sans-serif`.

### 6.3 State → localStorage

- [x] Implement `src/lib/store/schema.ts` + `storage.ts` per §4 (key `justclickit:v1`, versioned, corrupt-data backup + fresh start).
- [x] Migrate all reads/writes: `clicks`, `tried`, `bestReaction`, `bestTap`, `bestSimon` (+ add `guessFewest`).
- [x] Persist on every meaningful event (game completion, new best, click) — debounced save, no save-on-every-keypress.
- [x] Add a History view (last 50 activities, from `history[]`): game, time, score. Add a "Clear my data" button with confirm.
- [x] Add a manual theme toggle (System / Light / Dark) persisted in `settings.theme`; keep `prefers-color-scheme` as the System default. Add a sound on/off toggle persisted in `settings.sound`.

### 6.4 Achievements / Badges + toasts

- [x] Define the achievement list in `src/lib/store/achievements.ts` (id, name, description, icon, check function). Starter set:
  - [x] `first-click` — Click the big button for the first time.
  - [x] `explorer-4` — Try 4 different distractions.
  - [x] `completionist` — Try all 8 distractions.
  - [x] `lightning` — Reaction Test best **< 180 ms**.
  - [x] `fast-fingers` — Tap Rush **≥ 70 taps** in 10 s.
  - [x] `echo-8` — Memory Echo reach **level 8**.
  - [x] `lucky-guesser` — Guess the Number in **≤ 4 guesses**.
  - [x] `beatmaker` — Play the Beat Pad **10 times** (or start Auto-beat 5 times).
  - [x] `oracle-believer` — Ask The Oracle **10 times**.
  - [x] `streak-3` / `streak-7` — 3-day / 7-day daily streak.
- [x] Implement unlock check after every game event + on load (for streak achievements).
- [x] Build the toast component (`src/components/toast.ts`): queue, auto-dismiss ~4 s, accessible (`role="status"`), no stacking overflow, respects reduced motion.
- [x] Build an Achievements view/modal: locked vs. unlocked, progress (e.g. "6/8 distractions tried"), unlock date.
- [x] Do not spam: one toast per unlock, never re-toast an already-unlocked achievement.

### 6.5 Daily Streak

- [x] On every app open, compute local date (`YYYY-MM-DD`): if today == `lastVisit`, do nothing; if today == `lastVisit + 1 day`, `count++`; otherwise reset `count = 1`. Update `best` if needed.
- [x] Show streak in the stats bar (e.g. "🔥 3-day streak") and on the Achievements view.
- [x] Handle timezone edge cases: use local date, document it; do not use UTC for streaks.
- [x] Unit-test the streak logic (same day, next day, gap day, month/year boundary, corrupt `lastVisit`).

### 6.6 Quality gate for Phase 1

- [x] Unit tests pass: store schema validation, streak, achievements, no-repeat pick.
- [x] E2E smoke test passes: load → click big button → each of the 8 games opens → a best score persists after reload.
- [x] No console errors; no external requests except fonts (until self-hosted) — verify in DevTools Network tab.
- [x] Mobile 390 px: no horizontal overflow; big button and pads are thumb-reachable.

---

## 7. Phase 2 — Social & Backend

**Goal:** The app stops faking social proof. Real votes, a real daily leaderboard, shareable results, and safe user-generated content.
**Prerequisite:** §2 decisions locked (Supabase, hosting, identity model, moderation policy).
**Exit criteria:** WYR shows real percentages, leaderboard shows real (other) players, a shared score card renders correctly, a submitted dare cannot appear publicly without approval.

### 7.1 Supabase setup

- [ ] Create Supabase project (dev + prod, separate keys).
- [ ] Apply migration `001_init.sql` (§5). Enable RLS on all tables.
- [ ] Seed `wyr_pairs` from `src/data/wyr.json` (11 pairs, stable IDs `wyr-01`…`wyr-11`).
- [ ] Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon key only in the client — never the service-role key).
- [ ] Add a `src/lib/supabase.ts` client wrapper with offline fallback: if the backend is unreachable, the app must still work locally (show "Offline — votes/scores will sync later" state, queue nothing silently).

### 7.2 Would You Rather — real voting

- [ ] Replace the fake percentage code (current lines ~577–578) with: on vote, upsert into `wyr_votes` (`pair_id`, `device_id`, `choice`); then read counts from `wyr_results` and render real percentages.
- [ ] Prevent double-voting: PK `(pair_id, device_id)` + disable the buttons after voting + show "You voted" state on revisit (read the device's existing vote on load).
- [ ] Show vote totals ("1,234 votes") alongside percentages. Handle the 0-vote case ("Be the first to vote").
- [ ] Handle loading / error / offline states for the WYR card (skeleton, retry, "votes unavailable offline").

### 7.3 Global Daily Leaderboard

- [ ] After a Reaction Test or Tap Rush game ends, if the score beats the player's local best, submit it to `leaderboard_daily` (day = UTC date, game, device, optional display name, score). Only submit on a new personal best — do not spam the table per attempt.
- [ ] Add a Leaderboard view: tabs for Reaction (fastest first, ascending ms) and Tap Rush (most taps first, descending), top 20 per day, with the player's own row highlighted ("You — #7").
- [ ] Add an optional display-name prompt (max 20 chars, sanitised, stored locally). No login required for launch.
- [ ] Anti-cheat (minimum viable, document the limits honestly): server-side "only improve your own row" rule (§5), reject impossible scores (e.g. reaction < 80 ms, Tap Rush > 200 taps / 10 s), rate-limit submissions per device per day. Note in README: client-side scores can never be fully trusted; this is a fun board, not a competition with prizes.
- [ ] Daily reset: board is per UTC day; show "Resets in HH:MM" and yesterday's winners (read-only, from the previous day's rows).

### 7.4 Share Result

- [ ] Build `src/lib/share.ts` + `src/components/share-card.ts`: render a 1080×1080 (and 1200×630 for OG) Canvas card in the neobrutalist style — JustClickIt wordmark, game name, score, best badge, date, QR / short URL if available.
- [ ] Add "Share result" buttons on game completion screens (Reaction, Tap Rush, Memory Echo, Guess, Party). Flow: generate card → preview → Download PNG / Copy link / native Share (`navigator.share`, with clipboard fallback).
- [ ] Add "Copy result as text" (e.g. `I got 172ms on Reaction Test in JustClickIt! Can you beat it? — <link>`).
- [ ] Test the card on light + dark, long display names, and the smallest/largest scores. Ensure text never overflows the card.

### 7.5 User-generated content ("Submit a Dare / Prompt")

- [ ] Build a submission form (modal or dedicated view): kind selector (Dare / Would You Rather / Fact / Joke / Riddle), text fields with character limits, preview before submit.
- [ ] Client validation: non-empty, length limits, blocklist filter (basic profanity / personal-data patterns — list the patterns in code, keep them editable).
- [ ] Server: insert into `submissions` with `status='pending'`, rate limit 5/day/device. Never insert directly into the public content tables.
- [ ] Moderation queue (minimum viable for launch): a simple admin view — Supabase Table Editor + a documented checklist is acceptable for v1; a dedicated admin page is a follow-up, not a launch blocker. Document who reviews and the SLA (e.g. within 48 h).
- [ ] Approval flow: approved rows are copied into the public content source (seeded JSON for the next deploy, or a `content_approved` table read at runtime — pick one and document it). Rejected rows get a `reason`, never shown publicly.
- [ ] Add a Report button on user-submitted content ("Report this dare") that flags the item for re-review.

### 7.6 Party / Pass & Play mode

- [ ] Add a Party mode entry point (from the home screen, not inside a single game).
- [ ] Setup screen: add 2–8 players (names, max 12 chars), pick which games are in the rotation (default: Reaction, Tap Rush, Memory Echo, Guess), pick rounds (1–3).
- [ ] Turn flow: one player at a time, full-screen "Player X — your turn" interstitial, pass the device, play, record score, next player. No player sees the previous player's target (Guess the Number gets a fresh number per player).
- [ ] Session scoreboard: live table (player × game × total), stored locally for the session only, with a winner screen + confetti + "Share party result" (Canvas card with the final standings).
- [ ] Scoring normalisation (document the rule): each game contributes a 0–100 normalised score per round (e.g. Reaction: faster = higher; Tap Rush: taps scaled; Memory: level × 10; Guess: fewer guesses = higher). Keep the formula in one place (`src/lib/party.ts`) with unit tests.
- [ ] Edge cases: player leaves mid-party (remove + recalc), same device rotation, reduced-motion, and a clear "End party" that asks for confirmation.

### 7.7 Quality gate for Phase 2

- [ ] RLS tests pass (anonymous key cannot read pending submissions, overwrite others' rows, or vote twice).
- [ ] Leaderboard e2e: two different device IDs submit scores; both appear in the correct order.
- [ ] Share card: PNG downloads and opens correctly; text copy works; `navigator.share` fallback works where unsupported.
- [ ] UGC: a submitted dare stays invisible until approved; an approved dare appears in the next content load.
- [ ] App still fully usable with the backend down (local games, local bests, WYR shows offline state).

---

## 8. Phase 3 — PWA, SEO & Polish

**Goal:** Installable, offline-capable, discoverable, measurable — ready for a public link.
**Exit criteria:** Lighthouse PWA + SEO + Best Practices all green (or documented exceptions), install prompt works on Android + iOS (Add to Home Screen instructions), offline reload works.

### 8.1 PWA

- [ ] Add `public/manifest.webmanifest`: name `JustClickIt`, short name `JustClickIt`, `display: standalone`, `background_color` + `theme_color` matching the theme, `start_url: /`, `scope: /`, icons 192 / 512 / 512 maskable (any-maskable, safe zone respected).
- [ ] Generate app icons from the neobrutalist wordmark (no emoji as the icon): 192, 512, maskable 512, Apple touch 180. Verify the maskable icon is not cropped on Android.
- [ ] Add Service Worker via `vite-plugin-pwa` (Workbox): precache the app shell + fonts + data JSON; runtime-cache nothing else by default. Versioned cache, old-cache cleanup on activate.
- [ ] Offline support: full app works offline after first visit (all 8 games, local bests, achievements, streak). Backend features degrade gracefully (§7.1) — show an offline badge, do not error.
- [ ] Add an install prompt: custom "Install JustClickIt" button (beforeinstallprompt) + iOS instructions (Share → Add to Home Screen) when the prompt API is unavailable.
- [ ] Test: install on Android Chrome, reload offline (airplane mode), update flow (new version → "Update available" toast → reload).

### 8.2 SEO & social

- [ ] `index.html` head: `title` ("JustClickIt — Click. Play. Stop Being Bored."), `description` (~150 chars), `keywords` (light), `canonical` (once the domain is known), `theme-color`, `robots` (`index, follow`).
- [ ] Open Graph: `og:type=website`, `og:title`, `og:description`, `og:image` (1200×630, absolute URL), `og:url`, `og:site_name`.
- [ ] Twitter Card: `summary_large_image` with the same title/description/image.
- [ ] Favicon set: `favicon.svg` (neobrutalist "J!" / click mark), `favicon.ico`, `apple-touch-icon.png`. Remove the current `data:,` placeholder.
- [ ] `public/robots.txt` + `sitemap.xml` (single-page app: one URL, plus the canonical domain).
- [ ] Validate with: Open Graph preview tools, Twitter Card Validator, and a link-preview test in WhatsApp / Telegram / Discord.

### 8.3 Analytics (privacy-friendly)

- [ ] Integrate Umami **or** Plausible (per §2 decision) via the official script tag, no cookies, no personal data, IP anonymisation on.
- [ ] Track events (names must match exactly across the codebase — define them in `src/lib/analytics.ts`):
  - [ ] `big_button_click`
  - [ ] `game_open` — with `game` property
  - [ ] `game_complete` — with `game` + `score` (score as a number, no device ID)
  - [ ] `achievement_unlocked` — with `achievement` id
  - [ ] `share_click` — with `game` + `method` (download / copy / native)
  - [ ] `party_start` / `party_complete`
  - [ ] `pwa_install` (prompt accepted)
- [ ] Add a visible privacy note (footer): what is tracked (anonymous clicks/completions), what is not (no accounts, no location, no ads), and a link to the analytics dashboard policy if public.
- [ ] Respect Do Not Track where the tool supports it; document the choice.
- [ ] Verify events fire in the Network tab (no ad-blocker false negatives in testing — test with and without a blocker, document both).

### 8.4 Polish & accessibility

- [ ] Full keyboard support: big button (Enter/Space), game pads, tiles, and modals are reachable and operable by keyboard; visible focus states everywhere.
- [ ] Reduced-motion: honour `prefers-reduced-motion` for confetti, slot shuffle, and tile flips (already partially present — finish it everywhere).
- [ ] Colour contrast: verify the monochrome palette passes WCAG AA for body text in both themes.
- [ ] Copy pass (English, final): no placeholder text, no "probably" jokes that confuse new users in the WYR results, consistent tone.
- [ ] Loading / error states for every async view (WYR, leaderboard, share card): skeleton, retry, empty state.
- [ ] Performance budget: initial JS ≤ 150 KB gzipped, LCP < 2.5 s on a mid-range phone, no layout shift on the big button / stats bar.

### 8.5 Release checklist (launch day)

- [ ] `npm run build` + `npm run preview` clean; `npm test` + e2e green.
- [ ] Deploy to **GitHub Pages** from `main` via the GitHub Actions workflow (`.github/workflows/deploy.yml`); verify the live `https://<user>.github.io/<repo>/` URL serves the new build (not a cached old one).
- [ ] Smoke-test the production URL on: Android Chrome, iOS Safari, desktop Chrome/Firefox/Safari.
- [ ] Verify: manifest installable, offline reload, OG preview, analytics events arriving, leaderboard + WYR live, share card downloads.
- [ ] Write the launch notes: what is new vs. the prototype, known limitations (anonymous leaderboard, no accounts yet).
- [ ] Tag the release in git (`v1.0.0`) and keep the prototype `justclickit.html` in the repo history only (not served).

---

## 9. What is deliberately out of scope for v1.0

- User accounts / login / passwords.
- Real-time multiplayer over the network (Party mode is local Pass & Play only).
- Payments, ads, or subscriptions.
- Push notifications.
- A native app wrapper (Capacitor / TWA) — revisit only after the PWA is proven.
- New games beyond the 8 (suggest them in the backlog, do not build them in this plan).

**Backlog (after v1.0, not in this TODO):** more games, weekly leaderboard, content packs, i18n (Indonesian), TWA / Play Store listing.

---

## 10. Suggested order of work (if time is short)

1. Phase 1.2 (split the file) → 1.3 (localStorage) → 1.4 (achievements) → 1.5 (streak).
2. Phase 2.1–2.2 (Supabase + real WYR) → 2.3 (leaderboard) → 2.4 (share).
3. Phase 2.5 (UGC) + 2.6 (Party) — can be swapped in order.
4. Phase 3.1 (PWA) → 3.2 (SEO) → 3.3 (analytics) → 3.4 (polish) → 3.5 (release).

> If only one phase can ship: ship **Phase 1**. It is the only phase that makes the app feel like a real product on its own (data survives, progress matters). Phase 2 makes it social; Phase 3 makes it releasable.
