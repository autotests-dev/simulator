import { test, expect, type Page } from '@playwright/test';
import { config } from '../packages/config/src';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account/);
}

test('a large order history paginates', async ({ page }) => {
  const total = config.profiles.find((p) => p.id === 'prof-ays')!.seed!.orders!;
  const pageCount = Math.ceil(total / 10);
  const lastPageCount = total - (pageCount - 1) * 10;

  await signIn(page, 'ays@kotes.test');
  await expect(page.getByTestId('order-row').first()).toBeVisible();
  await expect(page.getByTestId('order-row')).toHaveCount(10);

  await page.getByRole('button', { name: `Page ${pageCount}` }).click();
  await expect(page.getByTestId('order-row')).toHaveCount(lastPageCount);
});

test('the signed-out account page invites sign in', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByTestId('account-signed-out')).toBeVisible();
});

test('addresses can be added, edited, and removed', async ({ page }) => {
  await signIn(page, 'demo@kotes.test');
  await expect(page.getByTestId('address-card')).toHaveCount(1);

  await page.getByTestId('add-address').click();
  const form = page.getByTestId('address-form');
  await form.getByLabel('Full name').fill('Sam Demo');
  await form.getByLabel('Street address').fill('42 Cedar Lane');
  await form.getByLabel('City').fill('Portland');
  await form.getByLabel('State / region').fill('OR');
  await form.getByLabel('Postal code').fill('97209');
  await form.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByTestId('address-card')).toHaveCount(2);
  await expect(page.getByText('42 Cedar Lane')).toBeVisible();

  await page.getByRole('button', { name: 'Edit 42 Cedar Lane' }).click();
  await page.getByTestId('address-form').getByLabel('Street address').fill('43 Cedar Lane');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByText('43 Cedar Lane')).toBeVisible();

  await page.getByRole('button', { name: 'Remove 43 Cedar Lane' }).click();
  await expect(page.getByTestId('address-card')).toHaveCount(1);
});

test('a new account can be created and starts empty', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Nova Tester');
  await page.getByLabel('Email').fill('nova@example.com');
  await page.getByLabel(/^Password/).fill('hunter2222');
  await page.getByLabel('Confirm password').fill('hunter2222');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole('heading', { name: 'Hi, Nova Tester' })).toBeVisible();
  await expect(page.getByText('No orders yet')).toBeVisible();
  await expect(page.getByText('No saved addresses yet.')).toBeVisible();
});

test('signup rejects a taken email and mismatched passwords', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Copy Cat');
  await page.getByLabel('Email').fill('demo@kotes.test');
  await page.getByLabel(/^Password/).fill('hunter2222');
  await page.getByLabel('Confirm password').fill('different1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Passwords don’t match.')).toBeVisible();

  await page.getByLabel('Confirm password').fill('hunter2222');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('That email is already registered', { exact: false })).toBeVisible();
});

test('a password reset responds neutrally without revealing accounts', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password/);

  await page.getByLabel('Email').fill('not-an-email');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('alert')).toContainText('valid email');

  await page.getByLabel('Email').fill('nobody@kotes.test');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByTestId('reset-sent')).toContainText('If that email matches an account');
});

test('the step-up account must re-enter its password to view saved cards', async ({ page }) => {
  await signIn(page, 'priya@kotes.test');
  await expect(page.getByTestId('reauth-form')).toBeVisible();
  await expect(page.getByTestId('payment-methods')).toHaveCount(0);

  const form = page.getByTestId('reauth-form');
  await form.getByLabel('Password').fill('demo1234');
  await form.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByTestId('payment-methods')).toContainText('4242');
});
