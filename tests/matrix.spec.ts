import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account/);
}

test('the baseline account renders en-US money on its order history', async ({ page }) => {
  await signIn(page, 'demo@kotes.test');
  await expect(page.getByTestId('order-total').first()).toHaveText(/^\$\d+\.\d{2}$/);
});

test('the de-DE account renders the same order history with de-DE money', async ({ page }) => {
  await signIn(page, 'lena@kotes.test');
  await expect(page.getByTestId('order-total').first()).toHaveText(/^\d+,\d{2}\s?\$$/);
});

test('the fr-FR account renders the same order history with fr-FR money', async ({ page }) => {
  await signIn(page, 'marc@kotes.test');
  await expect(page.getByTestId('order-total').first()).toHaveText(/\d+,\d{2}\s?\$US$/);
});

test('repeat cart writes all succeed for the baseline account', async ({ page }) => {
  await signIn(page, 'demo@kotes.test');
  await page.goto('/store/p/nest-storage-basket');
  const add = page.getByRole('button', { name: 'Add to cart' });
  await add.click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await add.click();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});

test('the flaky account fails a write deterministically and a retry succeeds', async ({ page }) => {
  await signIn(page, 'noor@kotes.test');
  await page.goto('/store/p/nest-storage-basket');
  const add = page.getByRole('button', { name: 'Add to cart' });
  await add.click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await add.click();
  await expect(page.getByRole('alert')).toContainText('try again');
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await add.click();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});

test('saved cards load directly for the baseline account', async ({ page }) => {
  await signIn(page, 'demo@kotes.test');
  await expect(page.getByTestId('payment-methods')).toContainText('4242');
  await expect(page.getByTestId('reauth-form')).toHaveCount(0);
});

test('a brand-new account shows empty states where the baseline has data', async ({ page }) => {
  await signIn(page, 'kai@kotes.test');
  await expect(page.getByText('No orders yet')).toBeVisible();
  await expect(page.getByText('No saved addresses yet.')).toBeVisible();
  await expect(page.getByText('No saved cards yet.')).toBeVisible();
});

test('the baseline session survives repeated visits', async ({ page }) => {
  await signIn(page, 'demo@kotes.test');
  await expect(page.getByTestId('order-list')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('order-list')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('order-list')).toBeVisible();
});

test('an expiring session signs out mid-flow and signing in again resumes it', async ({ page }) => {
  await signIn(page, 'tomas@kotes.test');
  await expect(page.getByTestId('order-list')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('account-signed-out')).toBeVisible();

  await page.getByTestId('account-signed-out').getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill('tomas@kotes.test');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('order-list')).toBeVisible();
});
