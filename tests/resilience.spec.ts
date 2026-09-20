import { test, expect, type Page } from '@playwright/test';

const savedCart = {
  lines: [{ id: 'p-nest-basket', productId: 'p-nest-basket', qty: 2 }],
  couponCode: null,
};

test('a stalled startup times out and late completion cannot replace recovery', async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = (...args) =>
      new Promise((resolve, reject) => {
        Object.assign(window, {
          completeRegistration: () => register(...args).then(resolve, reject),
        });
      });
  });
  await page.goto('/store/cart');
  await expect(page.getByRole('status')).toHaveText('Opening Kote’s…');
  await page.waitForFunction(() => 'completeRegistration' in window);
  await page.clock.runFor(15_001);
  await expect(page.getByRole('alert')).toContainText('couldn’t start');
  await page.evaluate(async () => {
    await (window as unknown as { completeRegistration(): Promise<void> }).completeRegistration();
  });
  await expect(page.getByRole('alert')).toContainText('couldn’t start');
  await expect(page.getByTestId('cart-empty')).toHaveCount(0);
});

async function seedStorage(page: Page, values: Record<string, string>) {
  await page.addInitScript((entries) => {
    // Seed once so a reload exercises persisted data rather than repeating setup.
    if (sessionStorage.getItem('resilience-seeded')) return;
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    sessionStorage.setItem('resilience-seeded', '1');
  }, values);
}

test('worker startup failure shows recovery and retry preserves the saved cart', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const apiRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await seedStorage(page, { 'kotes::cart': JSON.stringify(savedCart) });
  await page.addInitScript(() => {
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = (...args) => {
      if (!sessionStorage.getItem('registration-failed')) {
        sessionStorage.setItem('registration-failed', '1');
        return Promise.reject(new Error('Injected registration failure'));
      }
      return register(...args);
    };
  });
  await page.goto('/store/cart');
  await expect(page.getByRole('alert')).toContainText('couldn’t start');
  expect(apiRequests).toEqual([]);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
  await expect(page.getByTestId('cart-line')).toContainText('Nest Storage Basket');
  expect(pageErrors).toEqual([]);
});

test('a failed startup module download can be retried with a fresh page', async ({ page }) => {
  await page.route('**/assets/browser-*.js', (route) =>
    route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: 'Unavailable' }),
  );
  await page.goto('/store/cart');
  await expect(page.getByRole('alert')).toContainText('couldn’t start');
  await page.unroute('**/assets/browser-*.js');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
});

test('persistent startup failures remain recoverable after another retry', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.serviceWorker.register = () => Promise.reject(new Error('Registration blocked'));
  });
  await page.goto('/store/cart');
  await expect(page.getByRole('alert')).toContainText('couldn’t start');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toContainText('couldn’t start');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
});

test('valid legacy cart and session migrate and survive a reload', async ({ page }) => {
  await seedStorage(page, {
    'kotes::cart': JSON.stringify(savedCart),
    'kotes::session': JSON.stringify({ userId: 'prof-demo' }),
  });
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Hi, Sam Demo' })).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kotes::cart')!))).toEqual(
    savedCart,
  );
  expect(await page.evaluate(() => localStorage.getItem('kotes::$version:cart'))).toBe('1');
  await page.reload();
  await expect(page.getByTestId('order-list')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});

for (const [label, raw] of Object.entries({
  'broken JSON': '{',
  null: 'null',
  'invalid nested quantity': JSON.stringify({
    ...savedCart,
    lines: [{ ...savedCart.lines[0], qty: 'two' }],
  }),
  'incompatible version': JSON.stringify({ version: 999, value: savedCart }),
  'invalid versioned data': JSON.stringify({
    version: 1,
    value: { lines: null, couponCode: null },
  }),
})) {
  test(`a cart with ${label} recovers without resetting the signed-in account`, async ({
    page,
  }) => {
    await seedStorage(page, {
      'kotes::cart': raw,
      'kotes::session': JSON.stringify({ userId: 'prof-demo' }),
    });
    await page.goto('/store/cart');
    await expect(page.getByTestId('cart-empty')).toBeVisible();
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Hi, Sam Demo' })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kotes::cart')!))).toEqual({
      lines: [],
      couponCode: null,
    });
  });
}

test('corrupt account records recover seeded history and addresses', async ({ page }) => {
  await seedStorage(page, {
    'kotes::session': JSON.stringify({ userId: 'prof-demo' }),
    'kotes::orders': JSON.stringify({ 'prof-demo': [{ id: 'broken' }] }),
    'kotes::addresses': JSON.stringify({ 'prof-demo': [null] }),
    'kotes::customAccounts': 'null',
  });
  await page.goto('/account');
  await expect(page.getByTestId('order-row')).toHaveCount(4);
  await expect(page.getByTestId('address-card')).toHaveCount(1);
});

for (const restriction of ['denied', 'quota'] as const) {
  test(`cart changes remain usable in the page when storage is ${restriction}`, async ({
    page,
  }) => {
    await page.goto('/store/p/nest-storage-basket');
    const add = page.getByRole('button', { name: 'Add to cart' });
    await expect(add).toBeEnabled();
    await page.evaluate((mode) => {
      if (mode === 'denied') {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Storage denied', 'SecurityError');
          },
        });
      } else {
        Storage.prototype.setItem = () => {
          throw new DOMException('Storage full', 'QuotaExceededError');
        };
      }
    }, restriction);
    await add.click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await add.click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');
    await page.getByRole('link', { name: 'Cart, 2 items', exact: true }).click();
    await expect(page.getByTestId('cart-subtotal')).toHaveText('$52.00');
    await page.getByLabel('Promo code').fill('WELCOME10');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('cart-discount')).toContainText('5.20');
  });
}

test('storage blocked before MSW loads shows recovery instead of a blank page', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage denied', 'SecurityError');
      },
    });
  });
  await page.goto('/store/cart');
  await expect(page.getByRole('alert')).toContainText('browser settings');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
});

test('reset clears versioned and legacy app state while preserving unrelated storage', async ({
  page,
}) => {
  await seedStorage(page, {
    'kotes::cart': JSON.stringify({ version: 1, value: savedCart }),
    'kotes::session': JSON.stringify({ userId: 'prof-demo' }),
    'kotes::consent': 'all',
    'unrelated::value': 'keep',
  });
  await page.goto('/account?reset=1');
  await expect(page.getByTestId('account-signed-out')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated::value'))).toBe('keep');
  expect(await page.evaluate(() => localStorage.getItem('kotes::consent'))).toBeNull();
  await page.goto('/store/cart');
  await expect(page.getByTestId('cart-empty')).toBeVisible();
});
