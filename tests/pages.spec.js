// Page content tests — key copy, CTAs, and links on each page
const { test, expect } = require('@playwright/test');

test.describe('homepage', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('hero loads with correct headline', async ({ page }) => {
    await expect(page.locator('.hero-title')).toContainText('Security Audits');
  });

  test('trust bar shows framework badges', async ({ page }) => {
    const bar = page.locator('.trust-bar');
    await expect(bar).toContainText('OWASP LLM Top 10');
    await expect(bar).toContainText('MAESTRO');
    await expect(bar).toContainText('EU AI Act');
    await expect(bar).toContainText('MITRE ATT&CK');
  });

  test('pricing cards have no dollar amounts', async ({ page }) => {
    const pricing = await page.locator('.pricing-grid').textContent();
    expect(pricing).not.toMatch(/\$\d/);
  });

  test('hero CTA goes to scorecard', async ({ page }) => {
    const cta = page.locator('.hero-actions a:has-text("Get Your Free Scorecard")');
    await expect(cta).toHaveAttribute('href', /scorecard/);
  });

  test('CTA banner Book a Call goes to Calendly', async ({ page }) => {
    const bookLink = page.locator('.cta-banner a:has-text("Book a Call")');
    await expect(bookLink).toHaveAttribute('href', /calendly\.com/);
  });
});

test.describe('services page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/services.html'); });

  test('all four service rows present', async ({ page }) => {
    const rows = page.locator('.service-row');
    await expect(rows).toHaveCount(4);
  });

  test('no prices shown in service rows', async ({ page }) => {
    const content = await page.locator('.services-detail-grid').textContent();
    expect(content).not.toMatch(/\$\d/);
  });

  test('framework coverage grid has 7 cards', async ({ page }) => {
    // Section with framework coverage
    const cards = page.locator('.section:has(.section-title:has-text("Every audit maps")) .card');
    await expect(cards).toHaveCount(7);
  });

  test('Book a Consultation links to contact page', async ({ page }) => {
    const link = page.locator('a:has-text("Book a Consultation")').first();
    await expect(link).toHaveAttribute('href', /contact/);
  });
});

test.describe('threat model page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/threatmodel.html'); });

  test('framework coverage section has 6 cards', async ({ page }) => {
    const cards = page.locator('.section:has(.section-title:has-text("Every threat mapped")) .card');
    await expect(cards).toHaveCount(6);
  });

  test('hero badge mentions 24 hours', async ({ page }) => {
    await expect(page.locator('.page-hero')).toContainText('24 hours');
  });
});

test.describe('contact page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/contact.html'); });

  test('email address shown correctly', async ({ page }) => {
    await expect(page.locator('.contact-items')).toContainText('hello@fortark.com');
  });

  test('scorecard fallback link present', async ({ page }) => {
    const link = page.locator('a:has-text("Get Your Free Scorecard First")');
    await expect(link).toBeVisible();
  });
});

test.describe('footer', () => {
  test('all pages have footer with correct links', async ({ page }) => {
    for (const path of ['/', '/services.html', '/contact.html', '/threatmodel.html']) {
      await page.goto(path);
      await expect(page.locator('footer')).toContainText('Fortark');
      await expect(page.locator('footer')).toContainText('© 2026');
      const scorecardLink = page.locator('footer a:has-text("Free Scorecard")');
      await expect(scorecardLink).toBeVisible();
    }
  });
});
