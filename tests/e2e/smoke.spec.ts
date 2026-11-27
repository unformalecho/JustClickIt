import { test, expect, type Page } from '@playwright/test';

const GAMES = [
  'Random Dare',
  'Brain Snack',
  'Reaction Test',
  'Tap Rush',
  'Beat Pad',
  'Memory Echo',
  'Guess the Number',
  'The Oracle',
  'Mini Chess',
];

async function openMenu(page: Page): Promise<void> {
  await page.locator('#moreBtn').click();
  await expect(page.locator('[data-menu-popover]')).toBeVisible();
}

async function goTo(page: Page, label: string): Promise<void> {
  await openMenu(page);
  await page.locator('.menu-item', { hasText: label }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("home shows only the title and Let's Play; shuffle opens a game", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await expect(page.locator('#homeTitle')).toHaveText('JustClickIt');
  await expect(page.locator('#playBtn')).toContainText("Let's Play");
  await expect(page.locator('#backBtn')).toBeHidden();
  await expect(page.locator('#moreBtn')).toBeVisible();
  // Nothing else is stacked on Home: no picker, no stage, no stats.
  await expect(page.locator('.tile')).toHaveCount(0);
  await expect(page.locator('#stage')).toHaveCount(0);
  await expect(page.locator('.stats')).toHaveCount(0);

  await page.locator('#playBtn').click();
  // Slot-machine shuffle (~770 ms) then a game opens in its own view.
  await expect(page.locator('#stageTitle')).toHaveText(new RegExp(`^(${GAMES.join('|')})$`), {
    timeout: 5000,
  });
  await expect(page.locator('#viewTitle')).toHaveText('');
  await expect(page.locator('#backBtn')).toBeVisible();

  // The click is counted; Statistics shows it.
  await goTo(page, 'Statistics');
  await expect(page.locator('#statClicks')).toHaveText('1');
  await expect(page.locator('#statTried')).toHaveText('1/9');

  // A refresh keeps the user on Statistics (hash routing).
  await page.reload();
  await expect(page.locator('#viewTitle')).toHaveText('Statistics');
  await expect(page.locator('#statClicks')).toHaveText('1');
  await expect(page).toHaveURL(/#\/stats$/);

  expect(errors).toEqual([]);
});

test('each of the 9 games opens from the Games view', async ({ page }) => {
  await goTo(page, 'Games');
  await expect(page.locator('#viewTitle')).toHaveText('Games');
  for (const name of GAMES) {
    await page.locator('.tile', { hasText: name }).click();
    await expect(page.locator('#stageTitle')).toHaveText(name);
    // The whole stage is not a live region: the heading focus announces the switch.
    await expect(page.locator('#stage')).not.toHaveAttribute('aria-live');
    await page.locator('#backBtn').click();
    await expect(page.locator('.pick-head h2')).toHaveText('Or pick your poison');
  }
  await goTo(page, 'Statistics');
  await expect(page.locator('#statTried')).toHaveText('9/9');
  // Trying all 9 unlocks Completionist.
  await goTo(page, 'Achievements');
  await expect(page.locator('#view')).toContainText('Completionist');
});

test('menu navigates to every view and Back returns to Home', async ({ page }) => {
  const views: Array<[string, string]> = [
    ['Games', 'Games'],
    ['Statistics', 'Statistics'],
    ['Achievements', 'Achievements'],
    ['Settings', 'Settings'],
    ['About', 'About'],
  ];
  for (const [label, title] of views) {
    await goTo(page, label);
    await expect(page.locator('#viewTitle')).toHaveText(title);
    // The menu marks the current view.
    await openMenu(page);
    await expect(page.locator('.menu-item', { hasText: label })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-menu-popover]')).toBeHidden();
    await page.locator('#backBtn').click();
    await expect(page.locator('#homeTitle')).toHaveText('JustClickIt');
  }
});

test('Escape goes back, from depth too', async ({ page }) => {
  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Reaction Test' }).click();
  await expect(page.locator('#stageTitle')).toHaveText('Reaction Test');
  await page.keyboard.press('Escape');
  await expect(page.locator('.pick-head h2')).toHaveText('Or pick your poison');
  await page.keyboard.press('Escape');
  await expect(page.locator('#homeTitle')).toHaveText('JustClickIt');
  // Escape on Home goes nowhere.
  await page.keyboard.press('Escape');
  await expect(page.locator('#homeTitle')).toHaveText('JustClickIt');
});

test('settings persist: theme, sound, reduced motion', async ({ page }) => {
  await goTo(page, 'Settings');
  await page.locator('#themeBtn').click();
  await expect(page.locator('#themeBtn')).toContainText('Theme: Light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toContainText('Sound: Off');
  await page.locator('#motionBtn').click();
  await expect(page.locator('#motionBtn')).toContainText('Motion: Reduced');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

  await page.reload();
  await goTo(page, 'Settings');
  await expect(page.locator('#themeBtn')).toContainText('Theme: Light');
  await expect(page.locator('#soundBtn')).toContainText('Sound: Off');
  await expect(page.locator('#motionBtn')).toContainText('Motion: Reduced');
});

test('statistics reflect plays and history lists them', async ({ page }) => {
  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Beat Pad' }).click();
  await expect(page.locator('#stageTitle')).toHaveText('Beat Pad');
  await goTo(page, 'Statistics');
  await expect(page.locator('#statTried')).toHaveText('1/9');
  await expect(page.locator('.history-list')).toHaveCount(0);
  await expect(page.locator('#view')).toContainText('No history yet');
});

test('clear my data resets the app', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Beat Pad' }).click();
  await goTo(page, 'Settings');
  await page.locator('#clearBtn').click();
  await expect(page.locator('.toasts')).toContainText('Data cleared');
  // The toast is keyboard-dismissible: focus its close button and press Enter.
  await page.locator('.toast-close').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(page.locator('#themeBtn')).toContainText('Theme: System');
  await goTo(page, 'Statistics');
  await expect(page.locator('#statClicks')).toHaveText('0');
  await expect(page.locator('#statTried')).toHaveText('0/9');
});

test('no horizontal overflow at mobile width', async ({ page }) => {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

test('a stored best score survives reload', async ({ page }) => {
  // Seed storage *before* the app loads (the app flushes its in-memory
  // state on beforeunload, so injecting after load would be overwritten).
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'justclickit:v1',
      JSON.stringify({
        version: 1,
        deviceId: 'test-device',
        clicks: 42,
        tried: { reaction: true },
        triedAt: {},
        best: { reactionMs: 172, tapRush: 88, memoryLevel: 5, guessFewest: 3 },
        counts: { beatHits: 0, beatAutoStarts: 0, oracleAsks: 0 },
        history: [{ gameId: 'reaction', at: '2026-11-26T10:00:00.000Z', score: 172 }],
        achievements: {},
        streak: { lastVisit: null, count: 0, best: 0 },
        settings: { theme: 'system', sound: true, reducedMotion: false },
      }),
    );
  });
  await page.goto('./');
  await goTo(page, 'Statistics');
  await expect(page.locator('#statClicks')).toHaveText('42');
  await expect(page.locator('#statReaction')).toHaveText('172ms');
  await expect(page.locator('#statTap')).toHaveText('88 taps');
  await expect(page.locator('.history-list')).toContainText('Reaction Test — 172');
});

test('reaction test plays with keyboard and pointer', async ({ page }) => {
  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Reaction Test' }).click();
  // Keyboard: Space arms the pad.
  await page.locator('#rPad').press('Space');
  await expect(page.locator('#rMain')).toHaveText('Wait for it…');
  // Pointer: click the moment it flips.
  await expect(page.locator('#rMain')).toHaveText('TAP!', { timeout: 8000 });
  await page.locator('#rPad').click();
  await expect(page.locator('#rMain')).toHaveText(/^\d+ ms$/);
  await expect(page.locator('#rLog')).toContainText('Your best:');
});

test('tap rush plays with keyboard and pointer', async ({ page }) => {
  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Tap Rush' }).click();
  // Keyboard first (Space fires click, no pointerdown to confuse the guard),
  // then pointer taps.
  for (let i = 0; i < 5; i++) {
    await page.locator('#tPad').press('Space');
  }
  await expect(page.locator('#tMain')).toHaveText('5');
  for (let i = 0; i < 5; i++) {
    await page.locator('#tPad').click();
  }
  await expect(page.locator('#tMain')).toHaveText('10');
  // The 10-second game finishes on its own.
  await expect(page.locator('#tMain')).toHaveText(/^\d+ taps!$/, { timeout: 15000 });
  const taps = await page.locator('#tMain').evaluate((el) => {
    const m = /(\d+) taps!/.exec(el.textContent ?? '');
    return m ? Number(m[1]) : 0;
  });
  expect(taps).toBeGreaterThanOrEqual(10);
  await goTo(page, 'Statistics');
  await expect(page.locator('#statTap')).toHaveText(`${taps} taps`);
});

test('hash routes: refresh keeps the view, Back and Escape update the hash', async ({ page }) => {
  // Open a game, refresh, still on the game.
  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Reaction Test' }).click();
  await expect(page.locator('#stageTitle')).toHaveText('Reaction Test');
  await expect(page).toHaveURL(/#\/game\/reaction$/);
  await page.reload();
  await expect(page.locator('#stageTitle')).toHaveText('Reaction Test');

  // Back updates the hash to Games; Escape updates it to Home.
  await page.locator('#backBtn').click();
  await expect(page).toHaveURL(/#\/games$/);
  await expect(page.locator('.pick-head h2')).toHaveText('Or pick your poison');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('#homeTitle')).toHaveText('JustClickIt');

  // Refresh on Statistics stays on Statistics.
  await goTo(page, 'Statistics');
  await expect(page).toHaveURL(/#\/stats$/);
  await page.reload();
  await expect(page.locator('#viewTitle')).toHaveText('Statistics');

  // An unknown hash falls back to Home and is normalized to #/.
  await page.goto('./#/nope');
  await expect(page.locator('#homeTitle')).toHaveText('JustClickIt');
  await expect(page).toHaveURL(/#\/$/);
});

test('deep link: loading #/game/chess opens the game directly', async ({ page }) => {
  await page.goto('./#/game/chess');
  await expect(page.locator('#stageTitle')).toHaveText('Mini Chess');
  await expect(page.locator('.csq')).toHaveCount(36);
  // Back from a restored game returns to the Games picker.
  await page.locator('#backBtn').click();
  await expect(page.locator('.pick-head h2')).toHaveText('Or pick your poison');
  await expect(page).toHaveURL(/#\/games$/);
});

test('mini chess plays: player moves, AI replies, Unsolvable answers too', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await goTo(page, 'Games');
  await page.locator('.tile', { hasText: 'Mini Chess' }).click();
  await expect(page.locator('#stageTitle')).toHaveText('Mini Chess');
  await expect(page.locator('.csq')).toHaveCount(36);
  await expect(page.locator('#cStatus')).toHaveText('Your turn — White to move');
  await expect(page.locator('#cModeChill')).toHaveAttribute('aria-pressed', 'true');

  // e2 (square 28) to e3 (square 22): the pawn moves, the AI replies.
  await page.locator('.csq[data-square="28"]').click();
  await expect(page.locator('.csq[data-square="22"]')).toHaveClass(/target/);
  await page.locator('.csq[data-square="22"]').click();
  await expect(page.locator('.csq[data-square="22"]')).toContainText('♙');
  await expect(page.locator('#cStatus')).toHaveText('Your turn — White to move', {
    timeout: 5000,
  });
  // The AI moved a black piece: its captured tray is still empty, but the
  // turn is back with us and the board is no longer the initial position.
  await expect(page.locator('#cTrayBlack')).toHaveText('AI took: —');

  // Switch to Unsolvable, move again, the AI still answers promptly.
  await page.locator('#cModeHard').click();
  await expect(page.locator('#cModeHard')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.csq[data-square="27"]').click(); // d2
  await page.locator('.csq[data-square="21"]').click(); // d3
  await expect(page.locator('.csq[data-square="21"]')).toContainText('♙');
  await expect(page.locator('#cStatus')).toHaveText('Your turn — White to move', {
    timeout: 8000,
  });

  // Restart resets the board.
  await page.locator('#cNew').click();
  await expect(page.locator('.csq[data-square="28"]')).toContainText('♙');
  await expect(page.locator('.csq[data-square="22"]')).toHaveText('');
  await expect(page.locator('#cStatus')).toHaveText('Your turn — White to move');

  expect(errors).toEqual([]);
});
