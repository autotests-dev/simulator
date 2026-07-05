import { test, expect } from '@playwright/test';

const FOOTER_PAGES = [
  { label: 'Our story', heading: /About Kote/ },
  { label: 'Sustainability', heading: /Sustainability/ },
  { label: 'Stockists', heading: /Stockists/ },
  { label: 'Shipping & returns', heading: /Shipping & returns/ },
  { label: 'Care guide', heading: /Care guide/ },
  { label: 'Contact us', heading: /Contact us/ },
];

test('every company and help footer link leads to a real page', async ({ page }) => {
  for (const item of FOOTER_PAGES) {
    await page.goto('/store');
    await page.locator('footer').getByRole('link', { name: item.label }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(item.heading);
    await expect(page.getByTestId('not-found')).toHaveCount(0);
  }
});

test('the about page table of contents scrolls to its section', async ({ page }) => {
  await page.goto('/about');
  const target = page.getByTestId('about-people');
  await expect(target).not.toBeInViewport();

  await page.getByRole('link', { name: 'The people' }).click();
  await expect(target).toBeInViewport();
  await expect(page).toHaveURL(/#people/);
});

test('care FAQ answers stay hidden until their question is expanded', async ({ page }) => {
  await page.goto('/care');
  const answer = page.getByText('re-season it');
  await expect(answer).toBeHidden();

  await page.getByText('My cast iron looks dull').click();
  await expect(answer).toBeVisible();
});

test('two stockists share a city, so unscoped city text is ambiguous', async ({ page }) => {
  await page.goto('/stockists');
  await expect(page.getByTestId('stockist-row')).toHaveCount(7);
  await expect(page.getByTestId('stockist-row').filter({ hasText: 'Portland' })).toHaveCount(2);
  await expect(page.getByTestId('stockist-row').filter({ hasText: 'Hawthorne' })).toHaveCount(1);
  await expect(page.getByText('(503) 555-0114')).toBeVisible();
});

test('the newsletter form validates and confirms', async ({ page }) => {
  await page.goto('/about');
  await page.getByLabel('Join the list').fill('not-an-email');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.locator('footer').getByRole('alert')).toContainText('valid email');

  await page.getByLabel('Join the list').fill('fan@example.com');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.getByTestId('newsletter-joined')).toBeVisible();
});

test('the contact form validates on submit, then succeeds with a reference', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Name is required.')).toBeVisible();
  await expect(page.getByText('Choose a topic.')).toBeVisible();

  await page.getByLabel('Full name').fill('Jordan Tester');
  await page.getByLabel('Email').fill('jordan@example.com');
  await page.getByLabel('Topic').click();
  await page.getByRole('option', { name: 'Order question' }).click();

  const orderField = page.getByLabel('Order number');
  await expect(orderField).toBeVisible();
  await orderField.fill('1234');
  await page.getByLabel('Message').fill('The handle arrived loose on my pan.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Order numbers look like KO-1234.')).toBeVisible();

  await orderField.fill('KO-1042');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByTestId('contact-success')).toBeVisible();
  await expect(page.getByTestId('contact-reference')).toHaveText(/^KS-\d+$/);
});

test('a photo can be attached to a contact message', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Full name').fill('Rey Camper');
  await page.getByLabel('Email').fill('rey@example.com');
  await page.getByLabel('Topic').click();
  await page.getByRole('option', { name: 'Product care' }).click();
  await page.getByLabel('Message').fill('Enamel chipped on the plate rim after one trip.');

  await page.getByLabel('Photo (optional)').setInputFiles({
    name: 'chip.png',
    mimeType: 'image/png',
    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
  });

  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByTestId('contact-success')).toBeVisible();
  await expect(page.getByTestId('contact-attachment')).toHaveText('chip.png');
});
