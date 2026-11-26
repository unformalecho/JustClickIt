# JustClickIt — TODO

> Living list of remaining work. Rewritten 2026-11-26 — the old Phase 1/2/3
> production plan was deleted. Phase 1 is done and live; Phases 2 and 3 were
> declined. Only the items below are still open.

## Shipped

- **Phase 1** (2026-11-25): Vite + TypeScript, 8 games as modules, localStorage
  persistence, achievements, daily streak, GitHub Pages deploy. Live at
  https://unformalecho.github.io/JustClickIt/
- **Multi-view navigation** (2026-11-26, PR #3): Home + Let's Play, Games,
  Statistics, Achievements, Settings, About.
- **Mini Chess + hash routing** (2026-11-26, PR #4): 9th game, 6×6 vs AI
  (Chill / Unsolvable); hash routes so a refresh keeps the current view.
- **Chess AI fixes** (2026-11-26): adaptive deadline check, no move generation
  at leaf nodes.

## Open — code review P2 items

From `REVIEW.md` (2026-11-25). P0 + P1 are all fixed and merged. Re-checked
2026-11-26: 8 of 9 P2s are still relevant; P2-3 is partly fixed.

- [ ] **P2-1** — `validateState` doesn't limit implausible values
      (`src/lib/store/schema.ts`): `tried` accepts any key (`9/8` in stats),
      history `score` type unchecked (`[object Object]`), achievement values not
      checked as ISO dates (`Invalid Date`).
- [ ] **P2-2** — README mentions a "PWA manifest" that doesn't exist
      (`README.md`, deploy section). Delete or reword until a manifest exists.
- [ ] **P2-3** — Dead code (partly fixed: `el()` is now used by Mini Chess).
      Still dead: `isMuted()` / `audioNow()` in `src/lib/audio/engine.ts`;
      duplicate `.wrap` rule in `src/styles/base.css:37,43` (also a CodeFactor
      Major, see below).
- [ ] **P2-4** — Lint script still uses the ESLint 8 `--ext` flag
      (`package.json`); ESLint 9 ignores it silently. Remove the flag.
- [ ] **P2-5** — Font download in CI has no integrity check
      (`.github/workflows/deploy.yml`): `curl` from Google Fonts without SHA-256.
      Pin hashes, or vendor the fonts in the repo (~88 kB).
- [ ] **P2-6** — Would You Rather percentages are still fake
      (`src/games/snack.ts`: `34 + rand(34)`). Real fix is Phase 2 (not planned);
      otherwise make the copy an obvious joke.
- [ ] **P2-7** — Toast can't be dismissed via keyboard
      (`src/components/toast.ts`): no `tabindex`; only closable by click
      (auto-dismisses after ~4 s).
- [ ] **P2-8** — `aria-live="polite"` on the whole stage (now set in
      `src/views/game.ts`): screen readers announce large chunks on every game
      switch. Move it to a small status element, or drop it.
- [ ] **P2-9** — Misc: no favicon (`index.html` uses `data:,`); no `engines`
      field in `package.json` (README says Node 22+); "New number" in Guess the
      Number logs a scoreless history entry (`src/games/guess.ts`); no
      user-facing error surface (`src/main.ts` only logs to console).

## Open — CodeFactor leftovers

Grade A (checked 2026-11-26). The 2 Critical workflow-permission issues were
fixed (commit `4670dd2`). Remaining:

- [ ] **Major (Style)** — duplicate `.wrap` selector (`src/styles/base.css:43`).
      Same as P2-3 above.
- [ ] **Major (TypeScript)** — unused `raw` (`src/lib/store/storage.ts:24`).
      Looks like a false positive on inspection (`raw` is read after assignment);
      verify, then fix or dismiss.
- [ ] **Minor (Complexity)** — `validateState` complexity 26
      (`src/lib/store/schema.ts:89-148`). Split it up if P2-1 is fixed.

## Open — new ideas (added 2026-11-26)

- [ ] **Login (joke feature)** — a login that gives you nothing. It only
      marks your streak, then congratulates you with something like "Congrats,
      (name)! You get nothing." (and variations). No account, no backend, no
      benefit — the joke is the point.
- [ ] **Fix blue flash on tap (all UI components)** — the blue
      tap-highlight flash (profile-page flip-card case) also shows up in Tap
      Rush and other tappable UI. Fix it everywhere, same approach as the
      flip card (`-webkit-tap-highlight-color: transparent` on tappable
      components, plus the focus-ring follow-ups if the flash persists).
- [ ] **UI sound effects** — small sounds for UI actions, e.g. opening the
      ⋯ menu and other taps/clicks. Same Web Audio synth approach as the game
      sounds; respect the sound toggle.
- [ ] **Username setting** — a username field in Settings, default `@clicker`.
      Used by the login congrats message (and anywhere a name is shown).

## Not planned

- **Phase 2** (Supabase: real WYR votes, leaderboard, share cards, moderation
  queue, Party mode) — declined 2026-11-25. JustClickIt stays a fun
  boredom-killer, not a serious product.
- **Phase 3** (PWA manifest + Service Worker, favicon set, SEO / Open Graph,
  analytics) — declined 2026-11-25. Fixing the small P2-2 / favicon cleanups
  above does not mean doing Phase 3.
