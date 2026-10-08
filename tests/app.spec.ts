import { test, expect } from '@playwright/test';

const sheetPattern = '**/macros/s/*/exec';
test('street tiles render; map zoom, drag, landmarks, fullscreen and reset work', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Real public map tiles, with a mocked sheet to avoid changing the owner's log.
  await page.route(sheetPattern, (route) => route.fulfill({ json: [{ id: 2, date: '2026-10-07T07:00:00.000Z', miles: 3 }] }));
  await page.goto('/');
  await expect(page.locator('.real-map-shell')).toHaveAttribute('data-map-status', 'ready', { timeout: 30_000 });
  expect(await page.locator('.leaflet-tile-loaded').evaluateAll((tiles) => tiles.filter((tile) => tile instanceof HTMLImageElement && tile.naturalWidth > 0).length)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Expand adventure map fullscreen' }).click();
  await expect(page.locator('.journey-map-card')).toHaveClass(/expanded/);
  await page.getByRole('button', { name: 'My runner', exact: true }).click();
  await expect(page.getByText('You are here', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const map = page.locator('.real-map-canvas');
  const bounds = await map.boundingBox();
  if (bounds && testInfo.project.name === 'desktop') {
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 100, bounds.y + bounds.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    await page.mouse.wheel(0, -300);
  }
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  const marker = page.locator('.journey-landmark-marker').first();
  await marker.click();
  await expect(page.locator('.landmark-popup strong')).toBeVisible();
  await expect(page.locator('.landmark-popup')).toContainText('road miles');
  await page.getByRole('button', { name: 'Close fullscreen adventure map' }).click();
  await expect(page.locator('.journey-map-card')).not.toHaveClass(/expanded/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/map-${testInfo.project.name}.png`, fullPage: true });
});

test('confirmed add, edit, delete and checkpoint celebration sync without losing dates', async ({ page }) => {
  let runs = [{ id: 2, date: '2026-10-07T07:00:00.000Z', miles: 8 }];
  const writes: string[] = [];
  await page.route(sheetPattern, async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['content-type']).toBe('text/plain;charset=utf-8');
      const body = route.request().postDataJSON();
      writes.push(body.action);
      if (body.action === 'add') runs.push({ id: runs.length + 2, date: body.date, miles: body.miles });
      if (body.action === 'update') runs = runs.map((run) => run.id === body.id ? { ...run, date: body.date, miles: body.miles } : run);
      if (body.action === 'delete') runs = runs.filter((run) => run.id !== body.id).map((run, index) => ({ ...run, id: index + 2 }));
      await route.fulfill({ json: { ok: true } });
    } else await route.fulfill({ json: runs });
  });
  await page.goto('/');
  await expect(page.locator('.odometer-number')).toHaveText('8');
  await page.getByLabel('Run date', { exact: true }).fill('2026-10-08');
  await page.getByLabel('Miles run', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Launch run', exact: true }).click();
  await expect(page.locator('.odometer-number')).toHaveText('11');
  await expect(page.getByRole('heading', { name: '10 miles. Look at you go!' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep adventuring' }).click();
  await page.getByRole('button', { name: /Edit 3 mile run/ }).click();
  await page.getByLabel('Miles run', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.odometer-number')).toHaveText('12');
  await page.getByRole('button', { name: /Delete 4 mile run/ }).click();
  await page.getByRole('button', { name: 'Delete run', exact: true }).click();
  await expect(page.locator('.odometer-number')).toHaveText('8');
  expect(writes).toEqual(['add', 'update', 'delete']);
  await expect(page.locator('.history-zone')).toContainText('Oct 7, 2026');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('unconfirmed save preserves the form and does not retry or count miles', async ({ page }) => {
  let writes = 0;
  await page.route(sheetPattern, async (route) => {
    if (route.request().method() === 'POST') {
      writes++;
      await route.fulfill({ json: { ok: false } });
    } else await route.fulfill({ json: [] });
  });
  await page.goto('/');
  await page.getByLabel('Run date', { exact: true }).fill('2026-10-08');
  await page.getByLabel('Miles run', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Launch run', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Google Sheets did not confirm' })).toBeVisible();
  await expect(page.getByLabel('Miles run', { exact: true })).toHaveValue('7');
  await expect(page.locator('.odometer-number')).toHaveText('0');
  expect(writes).toBe(1);
});
