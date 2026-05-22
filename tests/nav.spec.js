// Navigation tests — all pages, all links
const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/',               active: 'Home' },
  { path: '/services.html',  active: 'Services' },
  { path: '/scorecard.html', active: 'Free Scorecard' },
  { path: '/threatmodel.html', active: 'Free Threat Model' },
  { path: '/contact.html',   active: 'Contact' },
];

for (const { path, active } of PAGES) {
  test(`nav — ${active} page loads and has correct active link`, async ({ page }) => {
    await page.goto(path);
    await expect(page).not.toHaveTitle(/404|not found/i);

    // Active link is highlighted
    const activeLink = page.locator('.nav-links a.active');
    await expect(activeLink).toContainText(active);

    // All nav links present
    for (const label of ['Home', 'Services', 'Free Scorecard', 'Free Threat Model', 'Contact']) {
      await expect(page.locator(`.nav-links a:has-text("${label}")`)).toBeVisible();
    }
  });
}

test('nav — logo links to homepage', async ({ page }) => {
  await page.goto('/services.html');
  await page.click('.nav-logo');
  await expect(page).toHaveURL(/\/(index\.html)?$/);
});

test('nav — Book a Call opens Calendly', async ({ page }) => {
  await page.goto('/');
  const bookBtn = page.locator('.nav-cta a:has-text("Book a Call")');
  await expect(bookBtn).toHaveAttribute('href', /calendly\.com/);
  await expect(bookBtn).toHaveAttribute('target', '_blank');
});

test('nav — Get Scorecard button goes to scorecard', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-cta a:has-text("Get Scorecard")');
  await expect(page).toHaveURL(/scorecard/);
});
