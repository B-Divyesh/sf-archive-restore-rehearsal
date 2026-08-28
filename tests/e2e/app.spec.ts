import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('empty archive map explains the job and is accessible', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /know where it lives/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /choose your first archive folder/i })).toBeVisible();
  await expect(page.getByText(/read, never changed/i)).toBeVisible();
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
  await page.getByRole('button', { name: /choose your first archive folder/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel(/label on drive/i)).toBeFocused();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
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
  await page.getByRole('button', { name: /choose your first archive folder/i }).click();
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
  await expect(page.getByRole('heading', { level: 1, name: /know where it lives/i })).toBeVisible();
  await expect(page.getByText(/offline · local/i)).toBeVisible();
});
