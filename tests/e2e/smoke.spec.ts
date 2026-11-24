import { test, expect } from '@playwright/test';

const GAMES = [
  'Random Dare',
  'Brain Snack',
  'Reaction Test',
  'Tap Rush',
  'Beat Pad',
  'Memory Echo',
  'Guess the Number',
  'The Oracle',
];

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('loads without console errors and the big button launches a game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await expect(page.locator('h1')).toContainText('Bored?');
  await expect(page.locator('#statClicks')).toHaveText('0');

  await page.locator('#bigBtn').click();
  // Slot-machine shuffle (~770 ms) then a game opens on the stage.
  await expect(page.locator('#stageTitle')).not.toHaveText('The Stage', { timeout: 5000 });
  await expect(page.locator('#statClicks')).toHaveText('1');

  // Clicks survive a reload (localStorage persistence).
  await page.reload();
  await expect(page.locator('#statClicks')).toHaveText('1');
  await expect(page.locator('#statTried')).toHaveText('1/8');

  expect(errors).toEqual([]);
});

test('each of the 8 games opens from the picker grid', async ({ page }) => {
  for (const name of GAMES) {
    await page.locator('.tile', { hasText: name }).click();
    await expect(page.locator('#stageTitle')).toHaveText(name);
  }
  await expect(page.locator('#statTried')).toHaveText('8/8');
  // Trying all 8 unlocks Completionist.
  await page.locator('#achBtn').click();
  await expect(page.locator('.modal')).toContainText('Completionist');
});

test('theme toggle, achievements and history modals work', async ({ page }) => {
  await page.locator('#themeBtn').click();
  await expect(page.locator('#themeBtn')).toContainText('Theme: Light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('#themeBtn')).toContainText('Theme: Light');

  await page.locator('#achBtn').click();
  await expect(page.locator('.modal')).toContainText('Achievements');
  await expect(page.locator('.modal')).toContainText('First Click');
  await page.keyboard.press('Escape');

  await page.locator('#histBtn').click();
  await expect(page.locator('.modal')).toContainText('No history yet');
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
        tried: {},
        triedAt: {},
        best: { reactionMs: 172, tapRush: 88, memoryLevel: 5, guessFewest: 3 },
        counts: { beatHits: 0, beatAutoStarts: 0, oracleAsks: 0 },
        history: [],
        achievements: {},
        streak: { lastVisit: null, count: 0, best: 0 },
        settings: { theme: 'system', sound: true, reducedMotion: false },
      }),
    );
  });
  await page.goto('./');
  await expect(page.locator('#statClicks')).toHaveText('42');
  await expect(page.locator('#statReaction')).toHaveText('172ms');
  await expect(page.locator('#statTap')).toHaveText('88 taps');
});
