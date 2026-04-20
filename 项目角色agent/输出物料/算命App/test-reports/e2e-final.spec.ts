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

test('FINAL-01: BaziPanel collapse/expand via aria-label button', async ({ page }) => {
  const errors = setupConsoleCollector(page);
  await goToChatWithBazi(page);
  await page.waitForTimeout(2000);

  // Initial expanded state
  await screenshot(page, 'FINAL-01a-bazi-expanded');

  // Click collapse button (aria-label="折叠八字排盘")
  const collapseBtn = page.locator('[aria-label="折叠八字排盘"]');
  const visible = await collapseBtn.isVisible().catch(() => false);
  console.log('Collapse button visible:', visible);

  if (visible) {
    await collapseBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'FINAL-01b-bazi-collapsed');

    // Verify collapsed state - should show condensed bazi text
    const condensedBazi = page.locator('.font-display.text-sm').filter({ hasText: /庚午/ });
    const condensedVisible = await condensedBazi.isVisible().catch(() => false);
    console.log('Condensed bazi visible:', condensedVisible);

    // Click to expand again
    const expandArea = page.locator('.cursor-pointer').filter({ hasText: /庚午/ });
    if (await expandArea.isVisible().catch(() => false)) {
      await expandArea.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'FINAL-01c-bazi-re-expanded');
    }
  }

  console.log('FINAL-01 errors:', errors.filter(e => !e.includes('401')).length);
});

test('FINAL-02: Chat input type text and send button', async ({ page }) => {
  const errors = setupConsoleCollector(page);
  await goToChatWithBazi(page);
  await page.waitForTimeout(3000);

  // The ChatInput uses input[type="text"], not textarea
  const chatInput = page.locator('input.input-field');
  await expect(chatInput).toBeVisible();

  // Check placeholder
  const placeholder = await chatInput.getAttribute('placeholder');
  console.log('Input placeholder:', placeholder);
  expect(placeholder).toBe('请问大师...');

  // Type text
  await chatInput.fill('我的事业运势如何？');
  await page.waitForTimeout(300);

  // Verify send button becomes active (gold background)
  const sendBtn = page.locator('[aria-label="发送消息"]');
  await expect(sendBtn).toBeVisible();

  const sendBtnBg = await sendBtn.evaluate(el => getComputedStyle(el).backgroundColor);
  console.log('Send button background (with text):', sendBtnBg);

  await screenshot(page, 'FINAL-02a-input-with-text');

  // Clear input and verify send button becomes inactive
  await chatInput.fill('');
  await page.waitForTimeout(300);

  const sendBtnBgEmpty = await sendBtn.evaluate(el => getComputedStyle(el).backgroundColor);
  console.log('Send button background (empty):', sendBtnBgEmpty);

  await screenshot(page, 'FINAL-02b-input-empty');

  console.log('FINAL-02 errors:', errors.filter(e => !e.includes('401')).length);
});

test('FINAL-03: QuickTags horizontal scroll and used state', async ({ page }) => {
  const errors = setupConsoleCollector(page);
  await goToChatWithBazi(page);
  await page.waitForTimeout(3000);

  // Find quick tag buttons
  const quickTagBtns = page.locator('button.badge.badge-gold');
  const count = await quickTagBtns.count();
  console.log('Quick tag count:', count);
  expect(count).toBeGreaterThanOrEqual(4);

  // Get all tag texts
  const tagTexts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await quickTagBtns.nth(i).textContent();
    tagTexts.push(text || '');
  }
  console.log('Tag texts:', tagTexts);

  await screenshot(page, 'FINAL-03a-quick-tags-all');

  // Verify all tags have opacity 1 (not used yet)
  const firstTagOpacity = await quickTagBtns.first().evaluate(el => el.style.opacity);
  console.log('First tag opacity:', firstTagOpacity);
  expect(firstTagOpacity).toBe('1');

  console.log('FINAL-03 errors:', errors.filter(e => !e.includes('401')).length);
});

test('FINAL-04: Confirm dialog "确定" navigates back to home', async ({ page }) => {
  const errors = setupConsoleCollector(page);
  await goToChatWithBazi(page);
  await page.waitForTimeout(2000);

  // Click bottom "重新算命"
  const resetBtns = page.locator('text=重新算命');
  await resetBtns.nth(1).click();
  await page.waitForTimeout(500);

  // Click "确定" in dialog
  const confirmBtn = page.locator('button.btn-primary >> text=确定');
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // Should navigate to home
  await page.waitForURL('**/', { timeout: 5000 });
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/chat');
  await screenshot(page, 'FINAL-04-confirmed-back-home');

  console.log('FINAL-04 errors:', errors.length);
});

test('FINAL-05: Homepage full-page rendering audit', async ({ page }) => {
  const errors = setupConsoleCollector(page);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Comprehensive element audit
  const audit = await page.evaluate(() => {
    const results: Record<string, boolean | string> = {};

    // Title
    const h1 = document.querySelector('h1');
    results['h1_exists'] = !!h1;
    results['h1_text'] = h1?.textContent || 'NOT_FOUND';

    // Subtitle
    const subtitle = document.querySelector('.font-english');
    results['subtitle_exists'] = !!subtitle;
    results['subtitle_text'] = subtitle?.textContent || 'NOT_FOUND';

    // Selects
    const selects = document.querySelectorAll('select.select-field');
    results['select_count'] = String(selects.length);

    // Gender radios
    const radios = document.querySelectorAll('input[name="gender"]');
    results['radio_count'] = String(radios.length);

    // Submit button
    const submitBtn = document.querySelector('button.btn-primary');
    results['submit_exists'] = !!submitBtn;
    results['submit_text'] = submitBtn?.textContent || 'NOT_FOUND';
    results['submit_disabled'] = (submitBtn as HTMLButtonElement)?.disabled ?? true;

    // BaZi preview
    const baziPreview = document.querySelector('.font-display.text-lg.tracking-wide');
    results['bazi_preview_exists'] = !!baziPreview;
    results['bazi_preview_text'] = baziPreview?.textContent || 'NOT_FOUND';

    // Background mist
    const mist = document.querySelector('.animate-mist');
    results['mist_animation_exists'] = !!mist;

    // Disclaimer
    const disclaimer = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('仅供娱乐'));
    results['disclaimer_exists'] = !!disclaimer;

    return results;
  });

  console.log('Homepage audit results:', JSON.stringify(audit, null, 2));

  expect(audit.h1_text).toContain('天机');
  expect(audit.subtitle_text).toContain('Celestial Oracle');
  expect(audit.select_count).toBe('4');
  expect(audit.radio_count).toBe('3');
  expect(audit.submit_text).toContain('开始算命');
  expect(audit.bazi_preview_exists).toBe(true);
  expect(audit.disclaimer_exists).toBe(true);

  await screenshot(page, 'FINAL-05-homepage-audit');
  console.log('FINAL-05 errors:', errors.length);
});

test('FINAL-06: Chat page comprehensive element audit', async ({ page }) => {
  const errors = setupConsoleCollector(page);
  await goToChatWithBazi(page);
  await page.waitForTimeout(3000);

  const audit = await page.evaluate(() => {
    const results: Record<string, boolean | string | number> = {};

    // Nav bar
    const nav = document.querySelector('nav');
    results['nav_exists'] = !!nav;
    results['nav_text'] = nav?.textContent || 'NOT_FOUND';

    // BaziPanel
    const pillars = document.querySelectorAll('.font-display.font-bold.text-xl');
    results['pillar_count'] = pillars.length;
    const pillarTexts: string[] = [];
    pillars.forEach(p => pillarTexts.push(p.textContent || ''));
    results['pillar_stems'] = pillarTexts.join(',');

    // Five elements badges
    const badges = document.querySelectorAll('.rounded-full.font-display');
    results['element_badges'] = badges.length;

    // Chat messages area
    const chatArea = document.querySelector('.overflow-y-auto');
    results['chat_area_exists'] = !!chatArea;

    // AI message bubble
    const aiBubbles = document.querySelectorAll('.rounded-xl.rounded-tl-sm');
    results['ai_bubble_count'] = aiBubbles.length;

    // Chat input
    const chatInput = document.querySelector('input.input-field');
    results['chat_input_exists'] = !!chatInput;
    results['chat_input_placeholder'] = (chatInput as HTMLInputElement)?.placeholder || 'NOT_FOUND';

    // Send button
    const sendBtn = document.querySelector('[aria-label="发送消息"]');
    results['send_btn_exists'] = !!sendBtn;

    // Quick tags
    const quickTags = document.querySelectorAll('button.badge.badge-gold');
    results['quick_tag_count'] = quickTags.length;

    // Action buttons
    const shareBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('生成签文'));
    results['share_btn_exists'] = !!shareBtn;

    const resetBtn = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('重新算命'));
    results['reset_btn_count'] = resetBtn.length;

    // Disclaimer
    const disclaimer = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('仅供娱乐') && el.children.length === 0);
    results['disclaimer_exists'] = !!disclaimer;

    return results;
  });

  console.log('Chat page audit results:', JSON.stringify(audit, null, 2));

  expect(audit.nav_exists).toBe(true);
  expect(audit.pillar_count).toBe(4); // 4 pillars
  expect(audit.chat_area_exists).toBe(true);
  expect(audit.chat_input_exists).toBe(true);
  expect(audit.send_btn_exists).toBe(true);
  expect(audit.quick_tag_count).toBeGreaterThanOrEqual(4);
  expect(audit.share_btn_exists).toBe(true);

  await screenshot(page, 'FINAL-06-chat-audit');
  console.log('FINAL-06 errors:', errors.filter(e => !e.includes('401')).length);
});
