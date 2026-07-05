import { test, expect } from '@playwright/test';
import { config } from '../packages/config/src';

const PAGE_SIZE = 8;
const productCount = config.seed.products.length;
const kitchenCount = config.seed.products.filter((p) => p.category === 'kitchen').length;

test('landing renders and links into the shop', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('consent-modal')).toBeVisible();
  await page.getByTestId('consent-accept').click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('little things');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  await page.getByRole('link', { name: 'Start shopping' }).click();
  await expect(page).toHaveURL(/\/store$/);
  await expect(page.getByTestId('product-card')).toHaveCount(PAGE_SIZE);
});

test('a fresh session starts with an empty cart', async ({ page }) => {
  await page.goto('/store/cart');
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveCount(0);
});

test('catalog filters by category and paginates', async ({ page }) => {
  await page.goto('/store');
  await expect(page.getByTestId('product-card')).toHaveCount(PAGE_SIZE);

  await page.getByRole('button', { name: 'Kitchen' }).click();
  await expect(page).toHaveURL(/category=kitchen/);
  await expect(page.getByTestId('result-count')).toHaveText(`${kitchenCount} products`);
  await expect(page.getByTestId('product-card')).toHaveCount(kitchenCount);

  await page.getByRole('button', { name: 'All' }).click();
  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByTestId('product-card')).toHaveCount(
    Math.min(PAGE_SIZE, productCount - PAGE_SIZE),
  );
});

test('sorting by price puts the cheapest product first', async ({ page }) => {
  const cheapest = Math.min(...config.seed.products.map((p) => p.priceCents));
  const expected = `$${(cheapest / 100).toFixed(2)}`;

  await page.goto('/store?sort=price-asc');
  await expect(page.getByTestId('product-card').first().getByTestId('price')).toHaveText(expected);
});

test('searching the catalog narrows results after a pause', async ({ page }) => {
  await page.goto('/store');
  await page.getByLabel('Search the shop').fill('mug');
  await expect(page.getByTestId('product-card')).toHaveCount(1);
  await expect(page.getByTestId('result-count')).toHaveText('1 product');
  await expect(page).toHaveURL(/q=mug/);

  await page.getByLabel('Search the shop').fill('zzzz');
  await expect(page.getByTestId('catalog-empty')).toBeVisible();

  await page.getByLabel('Search the shop').fill('');
  await expect(page.getByTestId('product-card')).toHaveCount(8);
});

test('the header search jumps to matching catalog results', async ({ page }) => {
  const matches = config.seed.products.filter(
    (p) =>
      p.name.toLowerCase().includes('towel') ||
      p.blurb.toLowerCase().includes('towel') ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes('towel')),
  ).length;

  await page.goto('/store');
  await page.getByLabel('Search Kote’s').fill('towel');
  await page.getByLabel('Search Kote’s').press('Enter');

  await expect(page).toHaveURL(/q=towel/);
  await expect(page.getByTestId('product-card')).toHaveCount(matches);
});

test('a quick-add control is revealed on hover', async ({ page }) => {
  await page.goto('/store');
  const card = page.getByTestId('product-card').filter({ hasText: 'Nest Storage Basket' });
  await card.hover();
  await card.getByTestId('quick-add').click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('a long product name is truncated on its card but full on its page', async ({ page }) => {
  const longest = config.seed.products.reduce((a, b) => (b.name.length > a.name.length ? b : a));

  await page.goto('/store?q=everyday');
  const card = page.getByTestId('product-card').first();
  await expect(card.getByRole('heading', { level: 3 })).toHaveText(longest.name);

  await card.getByRole('link', { name: longest.name }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(longest.name);
});
