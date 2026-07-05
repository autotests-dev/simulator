import { test, expect } from '@playwright/test';
import { config } from '../packages/config/src';

test('the mobile layout keeps one visible add-to-cart among the duplicated controls', async ({
  page,
}) => {
  await page.goto('/store/p/nest-storage-basket');
  await expect(page.locator('button[aria-label="Add to cart"]')).toHaveCount(2);

  const visible = page.getByRole('button', { name: 'Add to cart' });
  await expect(visible).toHaveCount(1);
  await visible.click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('the mobile menu opens and navigates to a category', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('consent-accept').click();

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile' })
    .getByRole('link', { name: 'Kitchen' })
    .click();

  const kitchenCount = config.seed.products.filter((p) => p.category === 'kitchen').length;
  await expect(page).toHaveURL(/category=kitchen/);
  await expect(page.getByTestId('product-card')).toHaveCount(kitchenCount);
});

test('the stockists phone column is hidden at a mobile viewport', async ({ page }) => {
  await page.goto('/stockists');
  await expect(page.getByTestId('stockist-row').first()).toBeVisible();
  await expect(page.getByText('(503) 555-0114')).toBeHidden();
});

test('the catalog paginates at a mobile viewport', async ({ page }) => {
  await page.goto('/store');
  await expect(page.getByTestId('product-card')).toHaveCount(8);

  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page.getByTestId('product-card')).toHaveCount(
    Math.min(8, config.seed.products.length - 8),
  );
});
