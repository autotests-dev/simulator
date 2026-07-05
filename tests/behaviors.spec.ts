import { test, expect } from '@playwright/test';

test('a suspended account cannot sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('jordan@kotes.test');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toContainText('suspended');
  await expect(page).toHaveURL(/\/login/);
});

test('an account on a flaky connection surfaces a retryable failure', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('noor@kotes.test');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account/);

  await page.goto('/store/p/forge-cast-pan');
  const add = page.getByRole('button', { name: 'Add to cart' });
  await add.click();
  await expect(page.getByTestId('add-confirmation')).toBeVisible();
  await add.click();
  await expect(page.getByRole('alert')).toContainText('try again');
});
