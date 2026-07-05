import { test, expect, type Page } from '@playwright/test';
import { config } from '../packages/config/src';

async function adminSignIn(page: Page) {
  await page.goto('/backoffice');
  await expect(page.getByTestId('admin-signin')).toBeVisible();
  await page.getByLabel('Email').fill('avery@kotes.test');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('admin-shell')).toBeVisible();
}

test('the back office refuses a non-admin account', async ({ page }) => {
  await page.goto('/backoffice');
  await expect(page.getByTestId('admin-signin')).toBeVisible();

  await page.getByLabel('Email').fill('ren@kotes.test');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('access-denied')).toBeVisible();
  await expect(page.getByTestId('admin-shell')).toHaveCount(0);
});

test('an admin sees the dashboard', async ({ page }) => {
  await adminSignIn(page);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('stat-total')).toHaveText(String(config.seed.products.length));
});

test('an admin edit is reflected in the store in the same tab', async ({ page }) => {
  await adminSignIn(page);
  await page.goto('/backoffice/products');

  await page.getByLabel('Search products').fill('Aera');
  await expect(page.getByTestId('admin-row')).toHaveCount(1);
  await page.getByRole('link', { name: 'Edit' }).click();

  await page.getByLabel('Price ($)').fill('25.00');
  await page.getByLabel('Stock').fill('4');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByTestId('edit-saved')).toBeVisible();

  await page.goto('/store/p/aera-ceramic-mug');
  await expect(page.getByTestId('price')).toHaveText('$25.00');
  await expect(page.getByTestId('stock-status')).toHaveText('Only 4 left');
});

test('a bulk action reports per-row results', async ({ page }) => {
  const pageOne = config.seed.products.slice(0, 8);
  const skipped = pageOne.filter((p) => p.compareAtCents !== undefined).length;
  const updated = pageOne.length - skipped;

  await adminSignIn(page);
  await page.goto('/backoffice/products');

  await expect(page.getByTestId('admin-row')).toHaveCount(8);
  await page.getByLabel('Select all on this page').check();
  await page.getByRole('button', { name: 'Mark on sale' }).click();

  await expect(page.getByTestId('bulk-result')).toContainText(
    `${updated} updated, ${skipped} skipped.`,
  );
  await expect(page.getByTestId('bulk-result')).toContainText('Already on sale');
});

test('the add-product wizard creates a product that appears in the store', async ({ page }) => {
  await adminSignIn(page);
  await page.goto('/backoffice/products/new');

  await page.getByLabel('Name').fill('Test Widget');
  await page.getByLabel('Category').click();
  await page.getByRole('option', { name: 'Desk' }).click();
  await page.getByLabel('Short blurb').fill('A handy test widget.');
  await page.getByLabel('Description').fill('A widget created by an automated test.');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByLabel('Compare-at price ($)')).toHaveCount(0);
  await page.getByLabel('Price ($)').fill('12.00');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByLabel('Stock').fill('25');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByTestId('wizard-review')).toBeVisible();
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page).toHaveURL(/\/backoffice\/products$/);

  await page.goto('/store/p/test-widget');
  await expect(page.getByRole('heading', { name: 'Test Widget' })).toBeVisible();
  await expect(page.getByTestId('price')).toHaveText('$12.00');
});

test('publishing an out-of-stock product is rejected and the toggle reverts', async ({ page }) => {
  await adminSignIn(page);
  await page.goto('/backoffice/products');

  await page.getByLabel('Search products').fill('Pebble');
  await expect(page.getByTestId('admin-row')).toHaveCount(1);
  const toggle = page.getByTestId('publish-toggle');
  await expect(toggle).toHaveText('Published');
  await toggle.click();
  await expect(toggle).toHaveText('Hidden');

  await toggle.click();
  await expect(page.getByTestId('publish-error')).toContainText('out-of-stock');
  await expect(toggle).toHaveText('Hidden');
});

test('the admin orders table lists every account’s orders with filters', async ({ page }) => {
  const totalSeeded = config.profiles.reduce((n, p) => n + (p.seed?.orders ?? 0), 0);

  await adminSignIn(page);
  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByTestId('orders-result-count')).toHaveText(`${totalSeeded} orders`);
  await expect(page.getByTestId('admin-order-row')).toHaveCount(8);

  await page.getByLabel('Filter by status').click();
  await page.getByRole('option', { name: 'Delivered' }).click();
  await expect(page.getByTestId('admin-order-row').first()).toContainText('delivered');

  const firstNumber = await page
    .getByTestId('admin-order-row')
    .first()
    .locator('td')
    .first()
    .innerText();
  await page.getByLabel('Search orders').fill(firstNumber);
  await expect(page.getByTestId('orders-result-count')).toHaveText('1 order');
});

test('a product note is shown as plain text, not rendered markup', async ({ page }) => {
  await adminSignIn(page);
  await page.goto('/backoffice/products/p-aera-mug');
  const note = page.getByTestId('note').first();
  await expect(note).toContainText('<b>5/5</b>');
  await expect(note).toContainText('<script>');
});
