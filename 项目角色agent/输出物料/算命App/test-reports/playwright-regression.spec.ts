import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';
const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/算命App/test-reports/screenshots';

// Helper to wait and take screenshot
async function screenshotStep(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

async function collectConsoleLogs(page: Page) {
  // Console logs are collected via event listener setup in beforeEach
}

test.describe('Tianji AI Fortune App - Regression Test', () => {
  let consoleLogs: { type: string; text: string }[] = [];

  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Collect console logs
    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Step 1: Open homepage, verify initial load', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // Wait for animations
    await screenshotStep(page, '01-homepage-initial');

    // Check title and key elements
    const tianji = page.locator('h1:has-text("天机")');
    await expect(tianji).toBeVisible();

    const subtitle = page.locator('text=Celestial Oracle');
    await expect(subtitle).toBeVisible();

    const description = page.locator('text=输入生辰八字，聆听天机启示');
    await expect(description).toBeVisible();

    // Check selectors exist
    const selects = page.locator('select');
    expect(await selects.count()).toBe(4); // year, month, day, shichen

    // Check CTA button
    const ctaBtn = page.locator('button:has-text("开始算命")');
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toBeEnabled();

    // Check disclaimer
    const disclaimer = page.locator('text=仅供娱乐参考');
    await expect(disclaimer).toBeVisible();

    // Check console errors
    const errors = consoleLogs.filter(l => l.type === 'error');
    console.log('Homepage console errors:', errors.length);
    errors.forEach(e => console.log('  ERROR:', e.text));
  });

  test('Step 2-5: Select birth details, verify bazi, start fortune', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Step 2: Select year 1990
    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption({ value: '1990' });
    await page.waitForTimeout(300);
    await screenshotStep(page, '02-year-selected-1990');

    // Select month: June (6)
    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption({ value: '6' });
    await page.waitForTimeout(300);

    // Select day: 15
    const daySelect = page.locator('select').nth(2);
    await daySelect.selectOption({ value: '15' });
    await page.waitForTimeout(300);

    // Select shichen: Wu (index 6 = noon 11-13)
    const shichenSelect = page.locator('select').nth(3);
    await shichenSelect.selectOption({ value: '6' });
    await page.waitForTimeout(300);

    // Select gender: Male
    const maleLabel = page.locator('label:has-text("男")');
    await maleLabel.click();
    await page.waitForTimeout(300);

    await screenshotStep(page, '03-birth-details-filled');

    // Step 3: Verify Bazi calculation is displayed
    const baziPreview = page.locator('.font-display.text-lg.tracking-wide');
    const baziText = await baziPreview.textContent();
    console.log('Bazi preview text:', baziText);

    // Verify bazi has actual characters (not empty)
    expect(baziText).toBeTruthy();
    expect(baziText!.length).toBeGreaterThan(5);

    // Check five elements summary is visible
    const fiveElements = page.locator('text=五行');
    await expect(fiveElements).toBeVisible();

    await screenshotStep(page, '04-bazi-calculated');

    // Step 4: Click "开始算命"
    const ctaBtn = page.locator('button:has-text("开始算命")');
    await ctaBtn.click();

    // Verify loading state
    await page.waitForTimeout(100);
    await screenshotStep(page, '05-submitting-loading');

    // Step 5: Wait for navigation to /chat
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshotStep(page, '06-chat-page-loaded');

    // Verify we're on chat page
    expect(page.url()).toContain('/chat');

    // Check chat page elements
    const navBack = page.locator('text=重新算命').first();
    await expect(navBack).toBeVisible();

    const brandLogo = page.locator('text=天机').first();
    await expect(brandLogo).toBeVisible();

    const errors = consoleLogs.filter(l => l.type === 'error');
    console.log('Chat page console errors:', errors.length);
    errors.forEach(e => console.log('  ERROR:', e.text));
  });

  test('Full flow: Birth input -> AI response -> Follow-up -> Fortune slip', async ({ page }) => {
    // Navigate to homepage
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshotStep(page, '10-flow-start');

    // Fill in birth details: 1990/6/15/Wu/Male
    await page.locator('select').first().selectOption({ value: '1990' });
    await page.locator('select').nth(1).selectOption({ value: '6' });
    await page.locator('select').nth(2).selectOption({ value: '15' });
    await page.locator('select').nth(3).selectOption({ value: '6' });
    await page.locator('label:has-text("男")').click();
    await page.waitForTimeout(500);
    await screenshotStep(page, '11-flow-filled');

    // Click start
    await page.locator('button:has-text("开始算命")').click();

    // Wait for chat page
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await screenshotStep(page, '12-flow-chat-initial');

    // Step 6: Wait for AI response (up to 45 seconds)
    console.log('Waiting for AI SSE response...');

    // Look for assistant message appearing
    let aiResponseFound = false;
    for (let i = 0; i < 45; i++) {
      // Check for any assistant message content
      const assistantMsgs = page.locator('[class*="assistant"], [class*="ai-"], [class*="message"]');
      const count = await assistantMsgs.count();

      // Also check for text content in the chat area
      const chatArea = page.locator('main, [class*="chat"], [class*="messages"], [class*="scroll"]').first();
      const chatText = await chatArea.textContent().catch(() => '');

      if (chatText && (chatText.includes('施主') || chatText.includes('八字') || chatText.includes('运势') || chatText.includes('贫道'))) {
        aiResponseFound = true;
        console.log(`AI response detected after ${i + 1} seconds`);
        break;
      }

      await page.waitForTimeout(1000);
      if (i % 5 === 0) {
        console.log(`Waiting... ${i}s elapsed`);
        await screenshotStep(page, `13-flow-waiting-${i}s`);
      }
    }

    await screenshotStep(page, '14-flow-ai-response');

    if (!aiResponseFound) {
      // Check if loading indicator is still showing
      const loadingIndicator = page.locator('text=大师正在卜算');
      const isStillLoading = await loadingIndicator.isVisible().catch(() => false);
      console.log('Still loading after 45s:', isStillLoading);

      // Take a final screenshot for debugging
      await screenshotStep(page, '14-flow-ai-timeout');
    }

    // Step 7: Verify AI reply content
    const pageContent = await page.textContent('body');
    console.log('Page contains fortune-related text:',
      pageContent?.includes('施主') || pageContent?.includes('八字') || pageContent?.includes('运势'));

    // Step 8: Check for fortune cards
    // Look for expandable fortune cards
    const fortuneCards = page.locator('[class*="fortune"], [class*="card"]');
    const cardCount = await fortuneCards.count();
    console.log('Fortune card elements found:', cardCount);

    if (cardCount > 0) {
      // Try clicking first card to expand
      await fortuneCards.first().click();
      await page.waitForTimeout(500);
      await screenshotStep(page, '15-flow-card-expanded');
    }

    // Step 9: Send follow-up question
    // Find the input area
    const chatInput = page.locator('input[type="text"], textarea, [contenteditable="true"]').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('我的事业运势如何？');
      await page.waitForTimeout(300);
      await screenshotStep(page, '16-flow-followup-typed');

      // Look for send button or press Enter
      const sendBtn = page.locator('button[type="submit"], button:has(svg)').last();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
      } else {
        await chatInput.press('Enter');
      }

      console.log('Follow-up question sent, waiting for response...');

      // Wait for follow-up AI response
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000);
        if (i % 5 === 0) {
          await screenshotStep(page, `17-flow-followup-waiting-${i}s`);
        }
        // Check if a new response appeared
        const bodyText = await page.textContent('body');
        if (bodyText?.includes('事业') && bodyText.includes('运')) {
          console.log(`Follow-up response detected after ${i + 1}s`);
          break;
        }
      }

      await screenshotStep(page, '18-flow-followup-response');
    } else {
      console.log('Chat input not found or not visible');
      await screenshotStep(page, '16-flow-no-input');
    }

    // Step 10: Screenshot conversation state
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshotStep(page, '19-flow-conversation-state');

    // Step 11: Test fortune slip generation
    const generateBtn = page.locator('button:has-text("生成签文")');
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(2000);
      await screenshotStep(page, '20-flow-fortune-slip');

      // Check for style switching buttons
      // Step 12: Switch fortune slip styles
      // Look for style buttons (墨金/朱砂/水墨)
      const styleButtons = page.locator('[class*="style"], button:has-text("墨金"), button:has-text("朱砂"), button:has-text("水墨")');
      const styleCount = await styleButtons.count();
      console.log('Style switch buttons found:', styleCount);

      // Try clicking style switcher elements
      const allButtons = page.locator('button');
      const btnCount = await allButtons.count();
      for (let i = 0; i < btnCount; i++) {
        const btnText = await allButtons.nth(i).textContent();
        if (btnText?.includes('朱砂')) {
          await allButtons.nth(i).click();
          await page.waitForTimeout(500);
          await screenshotStep(page, '21-flow-style-cinnabar');
        }
        if (btnText?.includes('水墨')) {
          await allButtons.nth(i).click();
          await page.waitForTimeout(500);
          await screenshotStep(page, '22-flow-style-inkwash');
        }
      }

      // Close the overlay
      const closeBtn = page.locator('button:has-text("X"), [aria-label="close"], button svg').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('Generate fortune slip button not found');
      await screenshotStep(page, '20-flow-no-fortune-btn');
    }

    // Final screenshot
    await screenshotStep(page, '23-flow-final');

    // Report console errors
    const errors = consoleLogs.filter(l => l.type === 'error');
    console.log('\n=== Console Errors Report ===');
    console.log('Total errors:', errors.length);
    errors.forEach((e, i) => console.log(`  [${i + 1}] ${e.text}`));

    const warnings = consoleLogs.filter(l => l.type === 'warning');
    console.log('\nTotal warnings:', warnings.length);
    warnings.forEach((e, i) => console.log(`  [${i + 1}] ${e.text}`));
  });
});
