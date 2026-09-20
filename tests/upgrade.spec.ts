import { test, expect } from '@playwright/test';
import * as v011 from './fixtures/storage-v0.1.1';
import * as v012 from './fixtures/storage-v0.1.2';

for (const [release, reader] of Object.entries({ 'v0.1.1': v011, 'v0.1.2': v012 })) {
  test(`an existing ${release} tab and a new tab can read each other's cart updates`, async ({
    context,
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'firefox',
      'Playwright Firefox loses worker control in a second tab: https://github.com/microsoft/playwright/issues/37012',
    );
    const oldTab = await context.newPage();
    // Establish a real worker client, then exercise the frozen release reader.
    await oldTab.goto('/store/cart');
    await expect(oldTab.getByTestId('cart-empty')).toBeVisible();
    await oldTab.evaluate(
      ({ storageSource, stateSource, version }) => {
        const createStorage = new Function(`return (${storageSource})`)();
        const defineState = new Function(`return (${stateSource})`)();
        const initial = () => ({
          lines: [{ id: 'p-nest-basket', productId: 'p-nest-basket', qty: 1 }],
          couponCode: null,
        });
        const schema = { safeParse: (value: unknown) => ({ success: true, data: value }) };
        const state = defineState(createStorage('kotes'), 'cart', initial, { version: 1, schema });
        state.set(initial());
        Object.assign(window, { legacyCart: state });
        // Cover migration of records unrelated to the current page as well.
        localStorage.setItem(
          'kotes::notes',
          JSON.stringify(
            version === 'v0.1.2'
              ? { version: 1, value: { 'p-nest-basket': [] } }
              : { 'p-nest-basket': [] },
          ),
        );
      },
      {
        storageSource: reader.createStorage.toString(),
        stateSource: reader.defineState.toString(),
        version: release,
      },
    );

    await page.goto('/store/cart');
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kotes::notes')!))).toEqual({
      'p-nest-basket': [],
    });
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');

    const oldQty = await oldTab.evaluate(() => {
      const state = (
        window as unknown as {
          legacyCart: {
            get(): { lines: { qty: number }[] };
            update(fn: (value: { lines: { qty: number }[] }) => unknown): void;
          };
        }
      ).legacyCart;
      const qty = state.get().lines[0].qty;
      state.update((cart) => ({ ...cart, lines: cart.lines.map((line) => ({ ...line, qty: 3 })) }));
      return qty;
    });
    expect(oldQty).toBe(2);
    await page.reload();
    await expect(page.getByTestId('cart-count')).toHaveText('3');
    // A rollback to v0.1.1 can read the now-restored original shape.
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('kotes::cart')!).lines[0].qty),
    ).toBe(3);
  });
}
