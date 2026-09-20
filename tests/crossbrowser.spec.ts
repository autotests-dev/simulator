import { test, expect } from '@playwright/test';

test('login, reload and sign out preserve the expected session state', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@kotes.test');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Hi, Sam Demo' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('order-row')).toHaveCount(4);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/account');
  await expect(page.getByTestId('account-signed-out')).toBeVisible();
});

test('a guest can add an item and check out', async ({ page }) => {
  await page.goto('/store/p/nest-storage-basket');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await page.getByRole('link', { name: 'Cart, 1 item', exact: true }).click();
  await expect(page.getByTestId('cart-subtotal')).toHaveText('$26.00');
  await page.getByRole('link', { name: 'Checkout', exact: true }).click();
  await page.getByLabel('Email').fill('shopper@example.com');
  await page.getByLabel('Full name').fill('Test Buyer');
  await page.getByLabel('Street address').fill('123 Test Street');
  await page.getByLabel('City').fill('Portland');
  await page.getByLabel('State / region').fill('OR');
  await page.getByLabel('Postal code').fill('97201');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByTestId('order-number')).toContainText('KO-');
});

test('secondary pages load on demand', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/store');
  await expect(page.getByRole('heading', { name: 'Shop all' })).toBeVisible();
  expect(requested.some((url) => /\/(BackofficeLayout|ContactPage)-/.test(url))).toBe(false);
  await page.getByRole('link', { name: 'Contact us', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Contact us' })).toBeVisible();
});

test('a failed page chunk can be retried', async ({ page, context, browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Worker-owned requests cannot reliably be routed in Firefox/WebKit.',
  );
  await page.goto('/store');
  await expect(page.getByRole('heading', { name: 'Shop all' })).toBeVisible();
  await context.route('**/assets/ContactPage-*.js', (route) => route.abort());
  await page.getByRole('link', { name: 'Contact us', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This page couldn’t load');
  await context.unroute('**/assets/ContactPage-*.js');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Contact us' })).toBeVisible();
});
