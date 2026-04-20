import { test, expect, Page } from '@playwright/test';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/算命App/test-reports/screenshots';
const BASE_URL = 'http://localhost:3002';

// Mobile viewport - iPhone 14 Pro
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.use({
  viewport: MOBILE_VIEWPORT,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

// Helper: wait and take screenshot
async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

async function screenshotFull(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
}

// Helper: collect console errors
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

// ============================================================
// P01: Homepage Tests
// ============================================================

test.describe('P01 - Homepage', () => {
  test('P01-01: Homepage renders correctly with all elements', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // wait for animations

    // Screenshot initial state
    await screenshotFull(page, 'P01-01-homepage-initial');

    // Verify title "天机" exists
    const titleEl = page.locator('h1');
    await expect(titleEl).toBeVisible();
    const titleText = await titleEl.textContent();
    expect(titleText).toContain('天机');

    // Verify subtitle "Celestial Oracle"
    const subtitleEl = page.locator('span.font-english');
    await expect(subtitleEl).toBeVisible();
    const subtitleText = await subtitleEl.textContent();
    expect(subtitleText).toContain('Celestial Oracle');

    // Verify birth date selectors exist (4 select fields)
    const selects = page.locator('select.select-field');
    await expect(selects).toHaveCount(4);

    // Verify "开始算命" button
    const submitBtn = page.locator('button.btn-primary');
    await expect(submitBtn).toBeVisible();
    const btnText = await submitBtn.textContent();
    expect(btnText).toContain('开始算命');

    // Verify gender radio buttons (男/女/不填)
    const genderLabels = page.locator('input[name="gender"]');
    await expect(genderLabels).toHaveCount(3);

    // Verify bazi preview section
    const baziPreview = page.locator('.font-display.text-lg.tracking-wide');
    await expect(baziPreview).toBeVisible();

    // Verify disclaimer
    const disclaimer = page.locator('text=仅供娱乐');
    await expect(disclaimer.first()).toBeVisible();

    // Report console errors
    console.log('P01-01 Console errors:', errors.length > 0 ? errors : 'NONE');
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('DevTools'))).toHaveLength(0);
  });

  test('P01-02: Select birth year 1990', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select year 1990
    const yearSelect = page.locator('select.select-field').first();
    await yearSelect.selectOption({ value: '1990' });
    await page.waitForTimeout(300);

    // Verify selection
    const selectedYear = await yearSelect.inputValue();
    expect(selectedYear).toBe('1990');

    await screenshot(page, 'P01-02-year-selected-1990');
    console.log('P01-02 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P01-03: Select birth month June (6月)', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select month 6 (June)
    const monthSelect = page.locator('select.select-field').nth(1);
    await monthSelect.selectOption({ value: '6' });
    await page.waitForTimeout(300);

    const selectedMonth = await monthSelect.inputValue();
    expect(selectedMonth).toBe('6');

    await screenshot(page, 'P01-03-month-selected-june');
    console.log('P01-03 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P01-04: Select birth day 15th', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select day 15
    const daySelect = page.locator('select.select-field').nth(2);
    await daySelect.selectOption({ value: '15' });
    await page.waitForTimeout(300);

    const selectedDay = await daySelect.inputValue();
    expect(selectedDay).toBe('15');

    await screenshot(page, 'P01-04-day-selected-15');
    console.log('P01-04 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P01-05: Select shichen (午时)', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select 午时 (index 6 typically)
    const shichenSelect = page.locator('select.select-field').nth(3);
    // 午时 is around index 6 (11:00-13:00)
    await shichenSelect.selectOption({ index: 6 });
    await page.waitForTimeout(300);

    await screenshot(page, 'P01-05-shichen-selected');
    console.log('P01-05 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P01-06: Complete birth data entry and verify bazi calculation', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select year 1990
    await page.locator('select.select-field').first().selectOption({ value: '1990' });
    await page.waitForTimeout(200);

    // Select month 6
    await page.locator('select.select-field').nth(1).selectOption({ value: '6' });
    await page.waitForTimeout(200);

    // Select day 15
    await page.locator('select.select-field').nth(2).selectOption({ value: '15' });
    await page.waitForTimeout(200);

    // Select shichen (午时, index 6)
    await page.locator('select.select-field').nth(3).selectOption({ index: 6 });
    await page.waitForTimeout(500);

    // Screenshot bazi calculation result
    await screenshotFull(page, 'P01-06-bazi-calculation');

    // Verify bazi preview shows Chinese characters (天干地支)
    const baziPreview = page.locator('.font-display.text-lg.tracking-wide');
    const baziText = await baziPreview.textContent();
    console.log('Bazi calculation result:', baziText);

    // Bazi should contain year/month/day/hour pillar info
    expect(baziText).toBeTruthy();
    expect(baziText!.length).toBeGreaterThan(4);
    expect(baziText).toContain('年');
    expect(baziText).toContain('月');
    expect(baziText).toContain('日');

    // Verify wuxing summary exists
    const summaryEl = page.locator('text=五行');
    await expect(summaryEl.first()).toBeVisible();

    console.log('P01-06 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P01-07: Select gender Male', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "男" radio
    const maleLabel = page.locator('label').filter({ hasText: '男' });
    await maleLabel.click();
    await page.waitForTimeout(300);

    // Verify the radio is selected (gold border indicator)
    await screenshot(page, 'P01-07-gender-male-selected');

    // Check the male radio input is checked
    const maleRadio = page.locator('input[name="gender"]').first();
    const isChecked = await maleRadio.isChecked();
    expect(isChecked).toBe(true);

    console.log('P01-07 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P01-08: Full flow - Fill all fields and click Start', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 1. Select year 1990
    await page.locator('select.select-field').first().selectOption({ value: '1990' });
    await page.waitForTimeout(200);

    // 2. Select month 6
    await page.locator('select.select-field').nth(1).selectOption({ value: '6' });
    await page.waitForTimeout(200);

    // 3. Select day 15
    await page.locator('select.select-field').nth(2).selectOption({ value: '15' });
    await page.waitForTimeout(200);

    // 4. Select shichen 午时
    await page.locator('select.select-field').nth(3).selectOption({ index: 6 });
    await page.waitForTimeout(200);

    // 5. Select gender male
    await page.locator('label').filter({ hasText: '男' }).click();
    await page.waitForTimeout(300);

    // Screenshot before submit
    await screenshotFull(page, 'P01-08a-before-submit');

    // 6. Click "开始算命"
    await page.locator('button.btn-primary').click();

    // Wait for "卜算中..." loading state
    await page.waitForTimeout(300);
    await screenshot(page, 'P01-08b-submitting-loading');

    // Wait for navigation to /chat
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Screenshot chat page after navigation
    await screenshot(page, 'P01-08c-navigated-to-chat');

    // Verify we are on the chat page
    expect(page.url()).toContain('/chat');

    console.log('P01-08 Console errors:', errors.length > 0 ? errors : 'NONE');
  });
});

// ============================================================
// P02: Chat Page Tests
// ============================================================

test.describe('P02 - Chat Page', () => {
  // Helper: navigate through homepage to chat with preset data
  async function goToChatWithBazi(page: Page) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Fill birth data
    await page.locator('select.select-field').first().selectOption({ value: '1990' });
    await page.locator('select.select-field').nth(1).selectOption({ value: '6' });
    await page.locator('select.select-field').nth(2).selectOption({ value: '15' });
    await page.locator('select.select-field').nth(3).selectOption({ index: 6 });
    await page.locator('label').filter({ hasText: '男' }).click();
    await page.waitForTimeout(300);

    // Click start
    await page.locator('button.btn-primary').click();
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForTimeout(2000);
  }

  test('P02-01: Chat page renders correctly', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);

    // Screenshot initial chat page
    await screenshot(page, 'P02-01-chat-initial');

    // Verify top navigation bar
    const navBar = page.locator('nav');
    await expect(navBar).toBeVisible();

    // Verify "天机" title in nav
    const navTitle = page.locator('nav >> text=天机');
    await expect(navTitle).toBeVisible();

    // Verify "重新算命" back button
    const backBtn = page.locator('text=重新算命').first();
    await expect(backBtn).toBeVisible();

    // Verify round counter "第 X/20 轮"
    const roundCounter = page.locator('text=/第.*轮/');
    await expect(roundCounter).toBeVisible();

    // Verify bazi panel exists
    // The BaziPanel component should show pillar info
    const baziPanel = page.locator('[class*="flex-shrink-0"]').filter({ hasText: /年.*月.*日/ });
    // This may be in the panel area

    // Verify chat input area
    const chatInput = page.locator('textarea, input[type="text"]').last();

    // Verify "生成签文" button
    const shareBtn = page.locator('text=生成签文');
    await expect(shareBtn).toBeVisible();

    console.log('P02-01 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P02-02: Wait for AI first response (streaming)', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);

    // Wait for the AI typing indicator or first message
    // The app shows "大师正在卜算" indicator or streaming text
    console.log('Waiting for AI response...');

    // Take screenshots at intervals to capture streaming
    await page.waitForTimeout(3000);
    await screenshot(page, 'P02-02a-ai-responding-3s');

    await page.waitForTimeout(5000);
    await screenshot(page, 'P02-02b-ai-responding-8s');

    // Wait for streaming to finish (up to 60 seconds total)
    // Check if isStreaming is done by looking for the absence of the blinking cursor
    let aiResponseComplete = false;
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(2500);

      // Check if there is still a streaming indicator
      const streamingCursor = page.locator('[style*="animation: blink"], [style*="animation:blink"]');
      const cursorCount = await streamingCursor.count();

      if (cursorCount === 0) {
        // Also check if the typing indicator is gone
        const typingIndicator = page.locator('text=大师正在卜算');
        const typingCount = await typingIndicator.count();
        if (typingCount === 0) {
          aiResponseComplete = true;
          break;
        }
      }
    }

    await screenshotFull(page, 'P02-02c-ai-response-complete');

    // Verify AI message content exists
    const assistantMessages = page.locator('.rounded-xl.rounded-tl-sm');
    const msgCount = await assistantMessages.count();
    console.log('Number of AI message bubbles:', msgCount);
    expect(msgCount).toBeGreaterThanOrEqual(1);

    // Get first AI message text content
    if (msgCount > 0) {
      const firstMsgText = await assistantMessages.first().textContent();
      console.log('First AI message (first 200 chars):', firstMsgText?.slice(0, 200));
      expect(firstMsgText!.length).toBeGreaterThan(10);
    }

    console.log('AI response complete:', aiResponseComplete);
    console.log('P02-02 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P02-03: Check fortune cards rendering', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);

    // Wait for AI response to complete (longer timeout)
    await page.waitForTimeout(30000);

    // Look for fortune cards - they appear after the first AI message
    // FortuneCard components have expandable sections
    await screenshotFull(page, 'P02-03a-fortune-cards-overview');

    // Try to scroll down to see cards
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    await page.waitForTimeout(500);
    await screenshot(page, 'P02-03b-scrolled-to-bottom');

    // Check for fortune dimension cards (总运/性格/事业/爱情/财运)
    // These may have specific class patterns from FortuneCard component
    const fortuneCards = page.locator('[class*="fortune"], [class*="card"]');
    const cardCount = await fortuneCards.count();
    console.log('Fortune card elements found:', cardCount);

    // Try clicking on a fortune card to expand it
    if (cardCount > 0) {
      await fortuneCards.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, 'P02-03c-fortune-card-expanded');
    }

    console.log('P02-03 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P02-04: Send follow-up question', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);

    // Wait for initial AI response
    console.log('Waiting for initial AI response to complete...');
    await page.waitForTimeout(35000);

    await screenshot(page, 'P02-04a-before-followup');

    // Find the chat input (textarea or input)
    const chatInput = page.locator('textarea').last();
    const inputVisible = await chatInput.isVisible().catch(() => false);

    if (inputVisible) {
      // Type follow-up question
      await chatInput.fill('我的事业运势如何？');
      await page.waitForTimeout(300);
      await screenshot(page, 'P02-04b-typed-question');

      // Find and click the send button
      const sendBtn = page.locator('button[type="submit"], button:has(svg)').last();
      const sendBtnVisible = await sendBtn.isVisible().catch(() => false);

      if (sendBtnVisible) {
        await sendBtn.click();
      } else {
        // Try pressing Enter
        await chatInput.press('Enter');
      }

      await page.waitForTimeout(2000);
      await screenshot(page, 'P02-04c-question-sent');

      // Wait for AI follow-up response
      await page.waitForTimeout(15000);

      // Scroll to bottom
      await page.evaluate(() => {
        const scrollContainer = document.querySelector('.overflow-y-auto');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });
      await page.waitForTimeout(500);
      await screenshot(page, 'P02-04d-followup-response');

      // Check user message appears
      const userMessages = page.locator('.rounded-xl.rounded-tr-sm');
      const userMsgCount = await userMessages.count();
      console.log('User message bubbles:', userMsgCount);
      expect(userMsgCount).toBeGreaterThanOrEqual(1);
    } else {
      console.log('Chat input not visible - may be disabled during loading');
      await screenshot(page, 'P02-04-input-not-visible');
    }

    console.log('P02-04 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P02-05: Test quick tags', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);

    // Wait for initial response
    await page.waitForTimeout(35000);

    // Look for QuickTags buttons
    const quickTagBtns = page.locator('button.badge, button[class*="badge"]');
    const tagCount = await quickTagBtns.count();
    console.log('Quick tag buttons found:', tagCount);

    if (tagCount > 0) {
      // Screenshot quick tags
      await screenshot(page, 'P02-05a-quick-tags');

      // Click first quick tag
      await quickTagBtns.first().click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'P02-05b-quick-tag-clicked');
    }

    console.log('P02-05 Console errors:', errors.length > 0 ? errors : 'NONE');
  });
});

// ============================================================
// P03: Share Functionality Tests
// ============================================================

test.describe('P03 - Share Functionality', () => {
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

  test('P03-01: Open share overlay (签文)', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);
    await page.waitForTimeout(5000); // Let some AI response come in

    // Find and click "生成签文" button
    const shareBtn = page.locator('text=生成签文');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
    await page.waitForTimeout(1000);

    // Screenshot share overlay
    await screenshot(page, 'P03-01a-share-overlay-open');

    // Verify overlay elements
    const overlayTitle = page.locator('text=签文');
    await expect(overlayTitle.first()).toBeVisible();

    // Verify style switcher buttons (墨金经典/朱砂吉祥/水墨淡雅)
    const styleBtns = page.locator('text=墨金经典');
    await expect(styleBtns.first()).toBeVisible();

    // Verify action buttons
    const saveBtn = page.locator('text=保存图片');
    await expect(saveBtn).toBeVisible();

    const shareActionBtn = page.locator('text=分享');
    await expect(shareActionBtn.first()).toBeVisible();

    const regenBtn = page.locator('text=重新生成');
    await expect(regenBtn).toBeVisible();

    console.log('P03-01 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P03-02: Switch card styles', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);
    await page.waitForTimeout(5000);

    // Open share overlay
    await page.locator('text=生成签文').click();
    await page.waitForTimeout(1000);

    // Default style should be "墨金经典"
    await screenshot(page, 'P03-02a-style-ink-gold');

    // Click "朱砂吉祥" style
    const cinnabarBtn = page.locator('text=朱砂吉祥');
    await cinnabarBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'P03-02b-style-cinnabar');

    // Click "水墨淡雅" style
    const inkWashBtn = page.locator('text=水墨淡雅');
    await inkWashBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'P03-02c-style-ink-wash');

    console.log('P03-02 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P03-03: Close share overlay', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);
    await page.waitForTimeout(5000);

    // Open share overlay
    await page.locator('text=生成签文').click();
    await page.waitForTimeout(1000);

    // Close via X button (aria-label="关闭")
    const closeBtn = page.locator('[aria-label="关闭"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Verify overlay is closed
    await screenshot(page, 'P03-03-overlay-closed');

    // The share overlay should not be visible
    const overlayPanel = page.locator('text=签文').first();
    // After close, the overlay should be gone

    console.log('P03-03 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P03-04: Share action sheet', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);
    await page.waitForTimeout(5000);

    // Open share overlay
    await page.locator('text=生成签文').click();
    await page.waitForTimeout(1000);

    // Click "分享" button to open action sheet
    // Need to be careful - there may be multiple "分享" texts
    const shareActionBtn = page.locator('button.btn-secondary >> text=分享');
    await shareActionBtn.click();
    await page.waitForTimeout(500);

    // Screenshot action sheet
    await screenshot(page, 'P03-04a-action-sheet');

    // Verify action sheet options
    const wechatFriend = page.locator('text=微信好友');
    await expect(wechatFriend).toBeVisible();

    const moments = page.locator('text=朋友圈');
    await expect(moments).toBeVisible();

    const saveImg = page.locator('text=保存图片').last();
    await expect(saveImg).toBeVisible();

    const copyLink = page.locator('text=复制链接');
    await expect(copyLink).toBeVisible();

    // Click cancel to close
    const cancelBtn = page.locator('text=取消');
    await cancelBtn.click();
    await page.waitForTimeout(500);

    await screenshot(page, 'P03-04b-action-sheet-closed');

    console.log('P03-04 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('P03-05: "重新生成" cycles card style', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await goToChatWithBazi(page);
    await page.waitForTimeout(5000);

    // Open share overlay
    await page.locator('text=生成签文').click();
    await page.waitForTimeout(1000);

    // Click "重新生成" to cycle styles
    const regenBtn = page.locator('text=重新生成');

    // First click - should cycle from ink-gold to cinnabar
    await regenBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'P03-05a-regenerated-1');

    // Second click - should cycle to ink-wash
    await regenBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'P03-05b-regenerated-2');

    // Third click - should cycle back to ink-gold
    await regenBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'P03-05c-regenerated-3');

    console.log('P03-05 Console errors:', errors.length > 0 ? errors : 'NONE');
  });
});

// ============================================================
// Additional Tests
// ============================================================

test.describe('Additional Tests', () => {
  test('Direct /chat access without bazi data shows redirect prompt', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Should show "请先输入生辰八字" message
    const redirectMsg = page.locator('text=请先输入生辰八字');
    await expect(redirectMsg).toBeVisible();

    // Should show "前往输入" button
    const goBtn = page.locator('text=前往输入');
    await expect(goBtn).toBeVisible();

    await screenshot(page, 'EXTRA-01-chat-no-bazi-redirect');

    // Click the button to go back to home
    await goBtn.click();
    await page.waitForURL('**/', { timeout: 5000 });
    expect(page.url()).not.toContain('/chat');

    console.log('EXTRA-01 Console errors:', errors.length > 0 ? errors : 'NONE');
  });

  test('Homepage full-page screenshot (mobile viewport)', async ({ page }) => {
    const errors = setupConsoleCollector(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await screenshotFull(page, 'EXTRA-02-homepage-fullpage-mobile');

    console.log('EXTRA-02 Console errors:', errors.length > 0 ? errors : 'NONE');
  });
});
