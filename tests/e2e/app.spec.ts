import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('empty archive map explains the job and is accessible', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /map drives/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /try it with sample data/i }).first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  expect(errors).toEqual([]);
});

test('keyboard route reaches rehearsal empty state and add dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Rehearse' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /test a few files/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /start restore rehearsal/i })).toBeDisabled();
  await page.getByRole('link', { name: 'Archive map' }).click();
  await page.getByRole('button', { name: /choose an archive folder/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel(/label on drive/i)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /choose an archive folder/i })).toBeFocused();
  await page.getByRole('button', { name: /choose an archive folder/i }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /choose an archive folder/i })).toBeFocused();
});

test('privacy and terms are complete static routes', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page).toHaveTitle(/Privacy/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await page.goto('/terms/');
  await expect(page).toHaveTitle(/Terms/);
  await expect(page.getByRole('heading', { level: 1, name: 'Terms' })).toBeVisible();
});

test('catalogues a selected folder and completes a restore record', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /choose an archive folder/i }).click();
  await page.getByLabel(/label on drive/i).fill('Blue family drive');
  await page.getByLabel(/where do you keep it/i).fill('Hall cupboard');
  await page.getByRole('button', { name: /continue to choose folder/i }).click();
  await page.locator('#folder-input').setInputFiles('/work/repo/tests/fixtures/archive');
  await expect(page.getByRole('heading', { name: 'Blue family drive' })).toBeVisible();
  await expect(page.getByText('1 file · 26 B')).toBeVisible();
  await page.getByRole('link', { name: 'Rehearse' }).click();
  await page.getByRole('button', { name: 'Start restore rehearsal' }).click();
  await expect(page.getByText('notes.txt').first()).toBeVisible();
  await page.getByRole('button', { name: 'File is missing' }).click();
  await page.getByRole('button', { name: 'Complete rehearsal' }).click();
  await expect(page.getByRole('heading', { name: /keep proof beside the drives/i })).toBeVisible();
  await expect(page.getByText(/1 item needs attention/i)).toBeVisible();
});

test('installed shell reloads offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /map drives/i })).toBeVisible();
  await expect(page.getByText(/offline · local/i)).toBeVisible();
  await context.setOffline(false);
});

test('@claim:demo-sandbox sample data stays out of the real archive map', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Blue family drive' })).toBeVisible();
  await expect(page.getByText(/demo — sample data, nothing is saved/i)).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'Blue family drive' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByText(/no locations/i)).toBeVisible();
});

test('@claim:offline-reload works offline after the first visit', async ({ page, context }) => {
  await page.goto('/demo');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Blue family drive' })).toBeVisible();
  await context.setOffline(false);
});

test('@claim:privacy-local ordinary demo use sends no third-party requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Rehearse' }).click();
  await page.getByRole('button', { name: 'Start restore rehearsal' }).click();
  expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBeTruthy();
});

test('populated rehearsal and recovery evidence have no serious axe violations', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Rehearse' }).click();
  await page.getByRole('button', { name: 'Start restore rehearsal' }).click();
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  await page.getByRole('link', { name: 'Evidence' }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('invalid structural import keeps the existing map after reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const request = indexedDB.open('archive-restore-rehearsal');
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction('volumes', 'readwrite');
    transaction.objectStore('volumes').put({ id: 'keep-me', label: 'Keep me drive', location: '', notes: '', rootName: 'keep', addedAt: new Date().toISOString(), fileCount: 0, totalBytes: 0, scanState: 'ready' });
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
  });
  await page.reload();
  await page.getByRole('link', { name: 'Data & unlock' }).click();
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"exportedAt":"now","volumes":[null],"files":[],"drills":[]}') });
  await expect(page.getByText(/invalid archive location/i)).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Keep me drive' })).toBeVisible();
});

test('directory-upload fallback can open and hash-check a selected file', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true }));
  await page.goto('/');
  await page.getByRole('button', { name: /choose an archive folder/i }).click();
  await page.getByLabel(/label on drive/i).fill('Fallback drive');
  await page.getByRole('button', { name: /continue to choose folder/i }).click();
  await page.locator('#folder-input').setInputFiles('/work/repo/tests/fixtures/archive');
  await page.getByRole('link', { name: 'Rehearse' }).click();
  await page.getByRole('button', { name: 'Start restore rehearsal' }).click();
  await page.getByRole('button', { name: 'Open and verify file' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/sha-256 match/i)).toBeVisible();
});

test('workspace routes have a URL, title, history, and focus target', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Data & unlock' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page).toHaveTitle(/Data and unlock/);
  await expect(page.locator('#main')).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /map drives/i })).toBeVisible();
});
