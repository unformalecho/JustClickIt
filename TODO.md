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

- [x] **P2-1** — `validateState` doesn't limit implausible values
      (`src/lib/store/schema.ts`): `tried` accepts any key (`9/8` in stats),
      history `score` type unchecked (`[object Object]`), achievement values not
      checked as ISO dates (`Invalid Date`). Fixed 2026-11-26: `tried`/`triedAt`/history keys limited to the 9 known game
      ids, history `score` must be a finite number or a short outcome string
      (chess `win`/`loss`/`draw`), `at` and achievement values must be valid
      ISO timestamps; `validateState` split into per-section helpers.
- [x] **P2-2** — README mentions a "PWA manifest" that doesn't exist
      (`README.md`, deploy section). Delete or reword until a manifest exists.
      Fixed 2026-11-27: deploy section now says
      "The fonts and asset URLs all use the same base" — no manifest claim
      remains (it was the only mention in the README; no manifest references
      in src/, index.html or the Vite config).
- [x] **P2-3** — Dead code (partly fixed: `el()` is now used by Mini Chess).
      Fixed 2026-11-27: `isMuted()` and
      `audioNow()` removed from `src/lib/audio/engine.ts` (grep-verified zero
      usages in src/ and tests/); duplicate `.wrap` rule in
      `src/styles/base.css` merged into a single rule (also closes the
      CodeFactor Major below). `el()` left alone — it is used by Mini Chess.
- [x] **P2-4** — Lint script still uses the ESLint 8 `--ext` flag
      (`package.json`); ESLint 9 ignores it silently. Remove the flag.
      Fixed 2026-11-26: script is now `eslint src tests`,
      lint still passes.
- [x] **P2-5** — Font download in CI has no integrity check
      (`.github/workflows/deploy.yml`): `curl` from Google Fonts without SHA-256.
      Pin hashes, or vendor the fonts in the repo (~88 kB).
      Fixed 2026-11-27: the three font downloads
      are now verified with `sha256sum -c` against pinned hashes, obtained by
      downloading the exact CI URLs (Archivo and Archivo Black match the local
      copies; JetBrains Mono's upstream file has since grown from 31,432 to
      40,404 bytes, so the pinned hash is the current upstream one).
      This edit also re-aligned the workflow's permissions block with main
      (commit `4670dd2`).
- [ ] **P2-6** — Would You Rather percentages are still fake
      (`src/games/snack.ts`: `34 + rand(34)`). Real fix is Phase 2 (not planned);
      otherwise make the copy an obvious joke. Lio's idea (2026-11-26): widen
      the random split (e.g. 5–95) so any split is possible as long as it sums
      to 100 — currently clamped to 34–67, so the split always looks close.
      Still simulated either way; real votes need Phase 2 (declined).
- [x] **P2-7** — Toast can't be dismissed via keyboard
      (`src/components/toast.ts`): no `tabindex`; only closable by click
      (auto-dismisses after ~4 s). Fixed 2026-11-26:
      each toast now has a focusable ✕ dismiss button (styled in base.css);
      clicking the toast still dismisses. Covered by an e2e assertion.
- [x] **P2-8** — `aria-live="polite"` on the whole stage (now set in
      `src/views/game.ts`): screen readers announce large chunks on every game
      switch. Move it to a small status element, or drop it. Fixed 2026-11-26: dropped — the router already moves focus to
      the stage heading on every switch, so the switch is announced that way;
      the toast host keeps its own live region for announcements. Covered by
      an e2e assertion.
- [ ] **P2-9** — Misc: no favicon (`index.html` uses `data:,`); no `engines`
      field in `package.json` (README says Node 22+); "New number" in Guess the
      Number logs a scoreless history entry (`src/games/guess.ts`); no
      user-facing error surface (`src/main.ts` only logs to console).

## Open — CodeFactor leftovers

Grade A (checked 2026-11-26). The 2 Critical workflow-permission issues were
fixed (commit `4670dd2`). Remaining:

- [x] **Major (Style)** — duplicate `.wrap` selector (`src/styles/base.css:43`).
      Same as P2-3 above. Fixed with the P2-3 fix (2026-11-27):
      single `.wrap` rule now.
- [ ] **Major (TypeScript)** — unused `raw` (`src/lib/store/storage.ts:24`).
      Looks like a false positive on inspection (`raw` is read after assignment);
      verify, then fix or dismiss.
- [x] **Minor (Complexity)** — `validateState` complexity 26
      (`src/lib/store/schema.ts:89-148`). Split it up if P2-1 is fixed.
      Done with the P2-1 fix (2026-11-26): validation is now
      split into per-section helpers (`validateTried`, `validateHistory`, …).

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
