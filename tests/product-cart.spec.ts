import { test, expect, type Page } from '@playwright/test';
import { config } from '../packages/config/src';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account/);
}

test('the add-to-cart control is duplicated across responsive layouts', async ({ page }) => {
  await page.goto('/store/p/nest-storage-basket');
  await expect(page.locator('button[aria-label="Add to cart"]')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(1);
});

test('a variant must be chosen before adding to cart', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');

  const add = page.getByRole('button', { name: 'Add to cart' });
  await expect(add).toBeDisabled();

  await page.getByRole('button', { name: 'Clay' }).click();
  await expect(add).toBeEnabled();
  await add.click();

  await expect(page.getByTestId('add-confirmation')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('an out-of-stock product cannot be added', async ({ page }) => {
  await page.goto('/store/p/pebble-desk-lamp');
  await expect(page.getByTestId('stock-status')).toHaveText('Out of stock');
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
});

test('a coupon respects its minimum-spend threshold', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  await page.getByRole('button', { name: 'Sage' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/store/cart');
  await expect(page.getByTestId('cart-subtotal')).toHaveText('$18.00');

  await page.getByLabel('Promo code').fill('HOME15');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('coupon-note')).toContainText('more to use');
  await expect(page.getByTestId('cart-discount')).toHaveCount(0);

  await page.getByLabel('Promo code').fill('WELCOME10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('cart-discount')).toContainText('1.80');
});

test('checkout validates the form, then places the order', async ({ page }) => {
  await page.goto('/store/p/trail-insulated-bottle');
  await page.getByRole('button', { name: '500ml' }).click();
  await page.getByRole('button', { name: 'Pine' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/store/checkout');

  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  await page.getByLabel('Email').fill('shopper@example.com');
  await page.getByLabel('Full name').fill('Test Buyer');
  await page.getByLabel('Street address').fill('123 Test Street');
  await page.getByLabel('City').fill('Portland');
  await page.getByLabel('State / region').fill('OR');
  await page.getByLabel('Postal code').fill('97201');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page).toHaveURL(/\/store\/order\/KO-\d+/);
  await expect(page.getByTestId('order-number')).toContainText('KO-');
});

test('the product Q&A is rendered in an embedded frame', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  const frame = page.frameLocator('[data-testid="qa-frame"]');
  await expect(frame.getByTestId('qa-answer')).toContainText('warranty');
});

test('the care guide is rendered inside a shadow root', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  const host = page.getByTestId('care-guide');
  await expect(host.getByTestId('care-item')).toHaveCount(3);
  expect(await host.evaluate((el) => Boolean(el.shadowRoot))).toBe(true);
});

test('writing a review requires signing in, then appears first', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  await page.getByRole('button', { name: 'Write a review' }).click();
  await expect(page.getByTestId('review-signin')).toBeVisible();

  await signIn(page, 'demo@kotes.test');
  await page.goto('/store/p/aera-ceramic-mug');
  await expect(page.getByTestId('review')).toHaveCount(3);
  await page.getByRole('button', { name: 'Write a review' }).click();

  const form = page.getByTestId('review-form');
  await form.getByRole('button', { name: 'Rate 4 stars' }).click();
  await form.getByLabel('Your review').fill('Too short');
  await form.getByRole('button', { name: 'Post review' }).click();
  await expect(form.getByText('Tell us a little more', { exact: false })).toBeVisible();

  await form.getByLabel('Your review').fill('Sturdy, keeps coffee warm, and the glaze is lovely.');
  await form.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByTestId('review').first()).toContainText('Sam Demo');
  await expect(page.getByTestId('review')).toHaveCount(4);
});

test('more reviews load on demand', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  await expect(page.getByTestId('reviews-heading')).toHaveText(/Reviews \(\d+\)/);
  await expect(page.getByTestId('review')).toHaveCount(3);

  await page.getByRole('button', { name: 'Show more reviews' }).click();
  await expect(page.getByTestId('review')).toHaveCount(6);
});

test('a just-posted review is not duplicated when loading more', async ({ page }) => {
  await signIn(page, 'demo@kotes.test');
  await page.goto('/store/p/aera-ceramic-mug');
  await page.getByRole('button', { name: 'Write a review' }).click();
  const form = page.getByTestId('review-form');
  await form.getByRole('button', { name: 'Rate 5 stars' }).click();
  await form.getByLabel('Your review').fill('Genuinely great mug, I use it every single morning.');
  await form.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByTestId('review')).toHaveCount(4);

  await page.getByRole('button', { name: 'Show more reviews' }).click();
  await expect(page.getByTestId('review')).toHaveCount(6);
  const rows = await page.getByTestId('review').allTextContents();
  expect(new Set(rows).size).toBe(rows.length);
});

test('the shipping policy opens in a new tab', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Shipping & returns policy' }).click(),
  ]);
  await popup.waitForLoadState();
  await expect(popup.getByRole('heading', { name: 'Shipping & returns' })).toBeVisible();
});

test('the product details toggle expands the description', async ({ page }) => {
  await page.goto('/store/p/aera-ceramic-mug');
  await expect(page.getByRole('button', { name: 'Product details' })).toHaveCount(0);
  await page.getByTestId('details-toggle').click();
  await expect(page.getByTestId('details-body')).toBeVisible();
});

test('adding to the cart shows a confirmation toast that dismisses itself', async ({ page }) => {
  await page.goto('/store/p/forge-cast-pan');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('toast')).toContainText('Added');
  await expect(page.getByTestId('toast')).toHaveCount(0);
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('a flat-amount coupon and the free-shipping threshold both key off the subtotal', async ({
  page,
}) => {
  const coupon = config.seed.coupons.find((c) => c.code === 'TENOFF')!;
  const flatShipping = `$${(config.seed.shipping.flatCents / 100).toFixed(2)}`;
  const discount = `$${(coupon.amountOffCents! / 100).toFixed(2)}`;

  await page.goto('/store/p/camp-enamel-plate-set');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/store/cart');
  await page.getByLabel('Promo code').fill('TENOFF');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('cart-discount')).toContainText(discount);
  await expect(page.getByTestId('cart-shipping')).toHaveText(flatShipping);

  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(page.getByTestId('cart-shipping')).toHaveText('Free');
  await expect(page.getByTestId('cart-discount')).toContainText(discount);
});
