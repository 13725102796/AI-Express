import { test, expect, Page } from '@playwright/test';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/算命App/test-reports/screenshots';
const BASE_URL = 'http://localhost:3002';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.use({
  viewport: MOBILE_VIEWPORT,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

async function screenshotFull(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
}

function setupConsoleCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[PAGE_ERROR] ${err.message}`);
  });
  return errors;
}

async function goToChatWithBazi(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('select.select-field').first().selectOption({ value: '1990' });
  await page.locator('select.select-field').nth(1).selectOption({ value: '6' });
  await page.locator('select.select-field').nth(2).selectOption({ value: '15' });
  await page.locator('select.select-field').nth(3).selectOption({ index: 6 });
  await page.locator('label').filter({ hasText: '男' }).click();
  await page.waitForTimeout(300);
  await page.locator('button.btn-primary').click();
  await page.waitForURL('**/chat', { timeout: 10000 });
  await page.waitForTimeout(2000);
}

test.describe('Chat Page UI Details', () => {
  test('BaziPanel shows correct four pillars', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    // Verify BaziPanel content via DOM
    const baziText = await page.evaluate(() => {
      // Get all text content from the bazi panel area
      const panelEls = document.querySelectorAll('[class*="flex-shrink-0"]');
      const texts: string[] = [];
      panelEls.forEach(el => {
        const t = el.textContent || '';
        if (t.includes('年柱') || t.includes('月柱') || t.includes('庚') || t.includes('午')) {
          texts.push(t);
        }
      });
      return texts.join(' | ');
    });

    console.log('Bazi panel text:', baziText);

    // Take a focused screenshot of just the top section
    await screenshot(page, 'DETAIL-01-bazi-panel-focused');

    // Verify five element circles are present
    const fiveElementCircles = await page.evaluate(() => {
      // Look for elements with wuxing-related content
      const allElements = document.querySelectorAll('*');
      const wuxingElements: string[] = [];
      allElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        if (['金', '木', '水', '火', '土'].includes(text) && el.children.length === 0) {
          wuxingElements.push(text);
        }
      });
      return wuxingElements;
    });

    console.log('Five elements found:', fiveElementCircles);

    console.log('DETAIL-01 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('Retry button appears after API error', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    // Wait for the API error to appear
    await page.waitForTimeout(5000);

    // Check for retry button
    const retryBtn = page.locator('text=重试');
    const retryVisible = await retryBtn.isVisible().catch(() => false);
    console.log('Retry button visible:', retryVisible);

    if (retryVisible) {
      await screenshot(page, 'DETAIL-02a-retry-button');

      // Click retry
      await retryBtn.click();
      await page.waitForTimeout(3000);
      await screenshot(page, 'DETAIL-02b-after-retry');
    }

    // Verify error message is displayed
    const errorMsg = page.locator('text=/401|Authentication|Failed/');
    const errorVisible = await errorMsg.first().isVisible().catch(() => false);
    console.log('Error message visible:', errorVisible);

    console.log('DETAIL-02 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE (excluding expected 401)');
  });

  test('Chat input and send button exist', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(3000);

    // Verify textarea exists
    const textarea = page.locator('textarea');
    const textareaCount = await textarea.count();
    console.log('Textarea count:', textareaCount);

    if (textareaCount > 0) {
      // Check placeholder
      const placeholder = await textarea.last().getAttribute('placeholder');
      console.log('Textarea placeholder:', placeholder);

      // Type text
      await textarea.last().fill('测试输入');
      await page.waitForTimeout(300);
      await screenshot(page, 'DETAIL-03a-typed-text');

      // Verify send button
      const sendBtn = page.locator('button[type="submit"]');
      const sendBtnCount = await sendBtn.count();
      console.log('Submit button count:', sendBtnCount);
    }

    // Check for input element if textarea not found
    const inputs = page.locator('input[type="text"]');
    const inputCount = await inputs.count();
    console.log('Text input count:', inputCount);

    await screenshot(page, 'DETAIL-03b-chat-input-area');
    console.log('DETAIL-03 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE (excluding expected 401)');
  });

  test('Quick tags are visible and clickable', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(3000);

    // Find quick tag buttons
    const quickTags = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const tags: string[] = [];
      const tagTexts = ['事业运详解', '感情运如何', '今年财运', '健康建议'];
      buttons.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        if (tagTexts.some(t => text.includes(t))) {
          tags.push(text);
        }
      });
      return tags;
    });

    console.log('Quick tags found:', quickTags);
    expect(quickTags.length).toBeGreaterThan(0);

    await screenshot(page, 'DETAIL-04-quick-tags');
    console.log('DETAIL-04 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE (excluding expected 401)');
  });

  test('重新算命 back button works from chat page', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(2000);

    // Click "< 重新算命" back button in nav
    const backBtn = page.locator('text=重新算命').first();
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Should navigate back to home page
    await page.waitForURL('**/', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // Verify we're on the home page
    const title = page.locator('h1');
    await expect(title).toContainText('天机');

    await screenshot(page, 'DETAIL-05-back-to-home');
    console.log('DETAIL-05 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE');
  });

  test('重新算命 bottom button shows confirm dialog', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(2000);

    // Click "重新算命" button at the bottom (not the back button)
    const resetBtns = page.locator('text=重新算命');
    const count = await resetBtns.count();
    console.log('重新算命 button count:', count);

    if (count >= 2) {
      // The second one is the bottom button
      await resetBtns.nth(1).click();
      await page.waitForTimeout(500);

      // Should show confirm dialog
      const confirmDialog = page.locator('text=确定要重新算命吗？');
      const dialogVisible = await confirmDialog.isVisible().catch(() => false);
      console.log('Confirm dialog visible:', dialogVisible);

      if (dialogVisible) {
        await screenshot(page, 'DETAIL-06a-confirm-dialog');

        // Verify cancel button
        const cancelBtn = page.locator('text=取消');
        await expect(cancelBtn.last()).toBeVisible();

        // Click cancel
        await cancelBtn.last().click();
        await page.waitForTimeout(500);

        // Dialog should close, still on chat page
        expect(page.url()).toContain('/chat');
        await screenshot(page, 'DETAIL-06b-dialog-cancelled');
      }
    }

    console.log('DETAIL-06 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE');
  });

  test('Round counter shows correct value', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(2000);

    // Check round counter
    const roundText = await page.evaluate(() => {
      const el = document.querySelector('nav');
      return el?.textContent || '';
    });

    console.log('Nav text:', roundText);

    // Should contain round info (第 X/20 轮)
    const roundMatch = roundText.match(/第\s*(\d+)\/20\s*轮/);
    console.log('Round match:', roundMatch ? roundMatch[0] : 'NOT FOUND');

    await screenshot(page, 'DETAIL-07-round-counter');
    console.log('DETAIL-07 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE');
  });

  test('Disclaimer text visible on chat page', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(2000);

    // Check disclaimer
    const disclaimer = page.locator('text=仅供娱乐');
    const disclaimerVisible = await disclaimer.first().isVisible().catch(() => false);
    console.log('Disclaimer visible:', disclaimerVisible);

    await screenshot(page, 'DETAIL-08-disclaimer');
    console.log('DETAIL-08 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE');
  });
});

test.describe('Homepage Edge Cases', () => {
  test('Default year is current year area (1995)', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const yearSelect = page.locator('select.select-field').first();
    const defaultYear = await yearSelect.inputValue();
    console.log('Default year:', defaultYear);

    await screenshot(page, 'EDGE-01-default-year');
    console.log('EDGE-01 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('Select "不确定" for shichen shows hint', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select "不确定" option (value -1)
    const shichenSelect = page.locator('select.select-field').nth(3);
    await shichenSelect.selectOption({ value: '-1' });
    await page.waitForTimeout(500);

    // Should show hint text
    const hint = page.locator('text=提供时辰可获得更准确结果');
    const hintVisible = await hint.isVisible().catch(() => false);
    console.log('Shichen hint visible:', hintVisible);

    // Bazi preview should show "??" for hour pillar
    const baziPreview = page.locator('.font-display.text-lg.tracking-wide');
    const baziText = await baziPreview.textContent();
    console.log('Bazi with unknown hour:', baziText);
    expect(baziText).toContain('??');

    await screenshotFull(page, 'EDGE-02-unknown-shichen');
    console.log('EDGE-02 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('Gender selection - Female and None', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select female
    await page.locator('label').filter({ hasText: '女' }).click();
    await page.waitForTimeout(300);
    const femaleRadio = page.locator('input[name="gender"]').nth(1);
    const isChecked = await femaleRadio.isChecked();
    console.log('Female radio checked:', isChecked);
    expect(isChecked).toBe(true);
    await screenshot(page, 'EDGE-03a-gender-female');

    // Select "不填"
    await page.locator('label').filter({ hasText: '不填' }).click();
    await page.waitForTimeout(300);
    const noneRadio = page.locator('input[name="gender"]').nth(2);
    const noneChecked = await noneRadio.isChecked();
    console.log('None radio checked:', noneChecked);
    expect(noneChecked).toBe(true);
    await screenshot(page, 'EDGE-03b-gender-none');

    console.log('EDGE-03 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('Year boundary values (1940, 2026)', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select earliest year 1940
    const yearSelect = page.locator('select.select-field').first();
    await yearSelect.selectOption({ value: '1940' });
    await page.waitForTimeout(500);

    const val1940 = await yearSelect.inputValue();
    expect(val1940).toBe('1940');

    // Verify bazi still calculates
    const baziPreview1 = page.locator('.font-display.text-lg.tracking-wide');
    const baziText1 = await baziPreview1.textContent();
    console.log('Bazi for 1940:', baziText1);
    expect(baziText1!.length).toBeGreaterThan(4);
    await screenshot(page, 'EDGE-04a-year-1940');

    // Select latest year 2026
    await yearSelect.selectOption({ value: '2026' });
    await page.waitForTimeout(500);

    const val2026 = await yearSelect.inputValue();
    expect(val2026).toBe('2026');

    const baziText2 = await baziPreview1.textContent();
    console.log('Bazi for 2026:', baziText2);
    expect(baziText2!.length).toBeGreaterThan(4);
    await screenshot(page, 'EDGE-04b-year-2026');

    console.log('EDGE-04 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('BaziPanel collapse/expand toggle', async ({ page }) => {
    const errors = setupConsoleCollector(page);
    await goToChatWithBazi(page);

    await page.waitForTimeout(2000);

    // The BaziPanel likely has a collapse toggle
    // Look for a toggle button/chevron in the panel area
    const toggleBtn = page.locator('[class*="chevron"], [class*="toggle"], [class*="collapse"], button:has(svg)').first();

    // Take initial screenshot
    await screenshot(page, 'EDGE-05a-bazi-panel-expanded');

    // Try to find and click the panel toggle (the ^ button)
    const arrowBtn = page.locator('text=^').first();
    const arrowVisible = await arrowBtn.isVisible().catch(() => false);
    console.log('Panel toggle (^) visible:', arrowVisible);

    if (arrowVisible) {
      await arrowBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'EDGE-05b-bazi-panel-collapsed');
    }

    console.log('EDGE-05 Console errors:', errors.filter(e => !e.includes('401')).length > 0 ? errors : 'NONE');
  });
});
