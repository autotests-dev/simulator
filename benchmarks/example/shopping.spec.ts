import { test, expect } from '@playwright/test';

// Credentials vary between rows; the suite itself stays identical. This small
// example demonstrates the runner, not a complete benchmark or grading oracle.
test('sign in and keep an added item in the cart', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.SIMULATOR_ACCOUNT_EMAIL!);
  await page.getByLabel('Password').fill(process.env.SIMULATOR_ACCOUNT_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.goto('/store/p/nest-storage-basket');
  for (const quantity of [1, 2]) {
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/cart/items' &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Add to cart' }).click();
    const response = await responsePromise;
    expect(
      response.ok(),
      `Cart write returned ${response.status()}: ${await response.text()}`,
    ).toBe(true);
    await expect(page.getByTestId('cart-count')).toHaveText(String(quantity));
  }
  await page.getByRole('link', { name: 'Cart, 2 items', exact: true }).click();
  await expect(page.getByTestId('cart-line')).toContainText('Nest Storage Basket');
});
