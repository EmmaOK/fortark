// Scorecard tests — quiz flow, skip logic, results
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/scorecard.html');
});

test('scorecard — loads on Q1, Next disabled until answer selected', async ({ page }) => {
  await expect(page.locator('.question-block[data-q="1"]')).toHaveClass(/active/);
  await expect(page.locator('#btn-next')).toBeDisabled();
  await page.click('.question-block[data-q="1"] .option-btn:first-child');
  await expect(page.locator('#btn-next')).toBeEnabled();
});

test('scorecard — Back button hidden on first question', async ({ page }) => {
  await expect(page.locator('#btn-prev')).toHaveCSS('visibility', 'hidden');
});

test('scorecard — AI product path: 10 questions, all domains shown', async ({ page }) => {
  // Q1: agents
  await page.click('.question-block[data-q="1"] .option-btn[data-value="agents"]');
  await page.click('#btn-next');
  // Q2: yes_user
  await page.click('.question-block[data-q="2"] .option-btn[data-value="yes_user"]');
  await page.click('#btn-next');
  // Q3: aws_gcp_azure
  await page.click('.question-block[data-q="3"] .option-btn[data-value="aws_gcp_azure"]');
  await page.click('#btn-next');
  // Q4: no
  await page.click('.question-block[data-q="4"] .option-btn[data-value="no"]');
  await page.click('#btn-next');
  // Q5: none
  await page.click('.question-block[data-q="5"] .option-btn[data-value="none"]');
  await page.click('#btn-next');
  // Q6: high_stakes
  await page.click('.question-block[data-q="6"] .option-btn[data-value="high_stakes"]');
  await page.click('#btn-next');
  // Q7: no
  await page.click('.question-block[data-q="7"] .option-btn[data-value="no"]');
  await page.click('#btn-next');
  // Q8: mfa
  await page.click('.question-block[data-q="8"] .option-btn[data-value="mfa"]');
  await page.click('#btn-next');
  // Q9: internal
  await page.click('.question-block[data-q="9"] .option-btn[data-value="internal"]');
  await page.click('#btn-next');
  // Q10: last — button says See My Results
  await expect(page.locator('#btn-next')).toContainText('See My Results');
  await page.click('.question-block[data-q="10"] .option-btn[data-value="secrets_manager"]');
  await page.click('#btn-next');

  // Results visible
  await expect(page.locator('#results-section')).toHaveClass(/visible/);

  // All 4 domains shown for AI product
  const domainNames = await page.locator('.domain-name').allTextContents();
  expect(domainNames).toContain('AI / LLM Security');
  expect(domainNames).toContain('Cloud & API Posture');
  expect(domainNames).toContain('Authentication');
  expect(domainNames).toContain('Compliance');

  // Score is a number
  const score = await page.locator('#overall-score-num').textContent();
  expect(Number(score)).toBeGreaterThan(0);
  expect(Number(score)).toBeLessThanOrEqual(100);
});

test('scorecard — skip logic: no AI skips Q2 and Q6, shows 3 domains not 4', async ({ page }) => {
  // Q1: none (no AI)
  await page.click('.question-block[data-q="1"] .option-btn[data-value="none"]');
  await page.click('#btn-next');

  // Next question shown should be Q3 (not Q2)
  await expect(page.locator('.question-block[data-q="3"]')).toHaveClass(/active/);
  await expect(page.locator('.question-block[data-q="2"]')).not.toHaveClass(/active/);

  // Complete remaining questions
  await page.click('.question-block[data-q="3"] .option-btn[data-value="aws_gcp_azure"]');
  await page.click('#btn-next');
  await page.click('.question-block[data-q="4"] .option-btn[data-value="no"]');
  await page.click('#btn-next');
  await page.click('.question-block[data-q="5"] .option-btn[data-value="none"]');
  await page.click('#btn-next');
  // Q6 should be skipped — next is Q7
  await expect(page.locator('.question-block[data-q="7"]')).toHaveClass(/active/);
  await page.click('.question-block[data-q="7"] .option-btn[data-value="no"]');
  await page.click('#btn-next');
  await page.click('.question-block[data-q="8"] .option-btn[data-value="mfa"]');
  await page.click('#btn-next');
  await page.click('.question-block[data-q="9"] .option-btn[data-value="internal"]');
  await page.click('#btn-next');
  await page.click('.question-block[data-q="10"] .option-btn[data-value="secrets_manager"]');
  await page.click('#btn-next');

  // Results visible
  await expect(page.locator('#results-section')).toHaveClass(/visible/);

  // AI domain NOT shown for non-AI product
  const domainNames = await page.locator('.domain-name').allTextContents();
  expect(domainNames).not.toContain('AI / LLM Security');
  expect(domainNames).toContain('Cloud & API Posture');
  expect(domainNames).toContain('Authentication');
  expect(domainNames).toContain('Compliance');
});

test('scorecard — retake resets quiz cleanly', async ({ page }) => {
  // Answer Q1 and go to results quickly via all answers
  const answers = ['agents', null, 'aws_gcp_azure', 'no', 'none', 'no', 'no', 'mfa', 'internal', 'secrets_manager'];
  await page.click('.question-block[data-q="1"] .option-btn[data-value="agents"]');
  await page.click('#btn-next');
  await page.click('.question-block[data-q="2"] .option-btn[data-value="no"]');
  await page.click('#btn-next');
  for (let q = 3; q <= 10; q++) {
    const val = answers[q - 1];
    await page.click(`.question-block[data-q="${q}"] .option-btn[data-value="${val}"]`);
    if (q < 10) await page.click('#btn-next');
  }
  await page.click('#btn-next');
  await expect(page.locator('#results-section')).toHaveClass(/visible/);

  // Retake
  await page.click('#retake-btn');
  await expect(page.locator('#quiz-box')).toBeVisible();
  await expect(page.locator('.question-block[data-q="1"]')).toHaveClass(/active/);
  await expect(page.locator('#btn-next')).toBeDisabled();
  await expect(page.locator('#btn-prev')).toHaveCSS('visibility', 'hidden');
});

test('scorecard — hardcoded secrets produces CRITICAL finding', async ({ page }) => {
  const qAnswers = {1:'llm', 2:'no', 3:'aws_gcp_azure', 4:'no', 5:'none', 6:'no', 7:'no', 8:'mfa', 9:'internal', 10:'hardcoded'};
  for (const [q, val] of Object.entries(qAnswers)) {
    await page.click(`.question-block[data-q="${q}"] .option-btn[data-value="${val}"]`);
    if (Number(q) < 10) await page.click('#btn-next');
  }
  await page.click('#btn-next');

  const findings = await page.locator('#findings-list').textContent();
  expect(findings).toMatch(/hardcoded|credential/i);
});

test('scorecard — recommendation box is visible on results', async ({ page }) => {
  const qAnswers = {1:'llm', 2:'no', 3:'aws_gcp_azure', 4:'no', 5:'none', 6:'no', 7:'no', 8:'mfa', 9:'internal', 10:'secrets_manager'};
  for (const [q, val] of Object.entries(qAnswers)) {
    await page.click(`.question-block[data-q="${q}"] .option-btn[data-value="${val}"]`);
    if (Number(q) < 10) await page.click('#btn-next');
  }
  await page.click('#btn-next');

  await expect(page.locator('#recommendation-text')).not.toBeEmpty();
  await expect(page.locator('#recommendation-reason')).not.toBeEmpty();
});

test('scorecard — threat model CTA visible on results', async ({ page }) => {
  const qAnswers = {1:'llm', 2:'no', 3:'aws_gcp_azure', 4:'no', 5:'none', 6:'no', 7:'no', 8:'mfa', 9:'internal', 10:'secrets_manager'};
  for (const [q, val] of Object.entries(qAnswers)) {
    await page.click(`.question-block[data-q="${q}"] .option-btn[data-value="${val}"]`);
    if (Number(q) < 10) await page.click('#btn-next');
  }
  await page.click('#btn-next');

  const threatModelLink = page.locator('a:has-text("Get Free Threat Model")');
  await expect(threatModelLink).toBeVisible();
  await expect(threatModelLink).toHaveAttribute('href', /threatmodel/);
});
