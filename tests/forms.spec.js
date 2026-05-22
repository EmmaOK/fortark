// Form tests — contact, threat model, scorecard email capture
const { test, expect } = require('@playwright/test');

// ── Contact form ─────────────────────────────────────────────
test.describe('contact form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact.html');
    // Scroll past Calendly embed to the form section
    await page.locator('#contact-form').scrollIntoViewIfNeeded();
  });

  test('required fields block submission', async ({ page }) => {
    await page.click('.form-submit');
    // Browser native validation prevents submit — form should still be visible
    await expect(page.locator('#contact-form')).toBeVisible();
    await expect(page.locator('#form-success')).toHaveClass(/hidden/);
  });

  test('service dropdown has no prices', async ({ page }) => {
    const options = await page.locator('#service option').allTextContents();
    for (const opt of options) {
      expect(opt).not.toMatch(/\$|£|€|,999|19,999|499/);
    }
  });

  test('service dropdown has all expected options', async ({ page }) => {
    const options = await page.locator('#service option').allTextContents();
    expect(options.join(' ')).toMatch(/Starter Security Audit/);
    expect(options.join(' ')).toMatch(/Full Security Audit/);
    expect(options.join(' ')).toMatch(/Monthly Security Monitoring/);
    expect(options.join(' ')).toMatch(/consultation/i);
  });

  test('Calendly embed is present on contact page', async ({ page }) => {
    await expect(page.locator('.calendly-inline-widget')).toBeVisible();
  });
});

// ── Threat model form ─────────────────────────────────────────
test.describe('threat model form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/threatmodel.html');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Threat Model/i);
  });

  test('required fields block submission', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('#threat-model-form')).toBeVisible();
    await expect(page.locator('#tm-success')).toHaveClass(/hidden/);
  });

  test('arch type dropdown has all options', async ({ page }) => {
    const options = await page.locator('#tm-arch option').allTextContents();
    expect(options.join(' ')).toMatch(/LLM application/i);
    expect(options.join(' ')).toMatch(/RAG/i);
    expect(options.join(' ')).toMatch(/agent/i);
    expect(options.join(' ')).toMatch(/Multi-agent/i);
    expect(options.join(' ')).toMatch(/Traditional web/i);
  });

  test('all 8 component checkboxes present', async ({ page }) => {
    const checkboxes = page.locator('.checkbox-item input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(8);
  });

  test('checkboxes are selectable', async ({ page }) => {
    const first = page.locator('.checkbox-item input[type="checkbox"]').first();
    await first.check();
    await expect(first).toBeChecked();
    await first.uncheck();
    await expect(first).not.toBeChecked();
  });

  test('scorecard CTA link works', async ({ page }) => {
    const link = page.locator('a:has-text("Get Free Scorecard First")');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /scorecard/);
  });
});

// ── Scorecard email capture ───────────────────────────────────
test.describe('scorecard email capture', () => {
  async function completeScorecard(page) {
    await page.goto('/scorecard.html');
    const qAnswers = {1:'llm', 2:'no', 3:'aws_gcp_azure', 4:'no', 5:'none', 6:'no', 7:'no', 8:'mfa', 9:'internal', 10:'secrets_manager'};
    for (const [q, val] of Object.entries(qAnswers)) {
      await page.click(`.question-block[data-q="${q}"] .option-btn[data-value="${val}"]`);
      if (Number(q) < 10) await page.click('#btn-next');
    }
    await page.click('#btn-next');
    await expect(page.locator('#results-section')).toHaveClass(/visible/);
  }

  test('email capture form is visible on results', async ({ page }) => {
    await completeScorecard(page);
    await expect(page.locator('#email-capture-box')).toBeVisible();
    await expect(page.locator('#scorecard-email-input')).toBeVisible();
  });

  test('hidden score fields are populated', async ({ page }) => {
    await completeScorecard(page);
    const scores = await page.locator('#hidden-scores').inputValue();
    expect(scores).toMatch(/overall/);
    expect(scores).toMatch(/cloud/);
  });
});
