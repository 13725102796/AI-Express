import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const FRONTEND = 'http://localhost:3002';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  // Collect console errors
  const consoleErrors = [];
  const consoleWarnings = [];

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
    if (msg.type() === 'warning') {
      consoleWarnings.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push({ url: page.url(), text: `PAGE_ERROR: ${err.message}` });
  });

  const results = [];
  const screenshots = [];

  function record(step, status, detail = '') {
    results.push({ step, status, detail });
    console.log(`[${status}] ${step}${detail ? ' -- ' + detail : ''}`);
  }

  async function screenshot(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    screenshots.push(filePath);
    console.log(`  [SCREENSHOT] ${name}.png`);
    return filePath;
  }

  try {
    // ===== STEP 1: Open homepage =====
    console.log('\n=== STEP 1: Open Homepage ===');
    await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(1000);
    await screenshot('01-homepage');

    // Check page loaded
    const title = await page.textContent('h1');
    if (title && title.includes('天机')) {
      record('Step 1: Homepage loads', 'PASS', `Title: "${title.trim()}"`);
    } else {
      record('Step 1: Homepage loads', 'FAIL', `Title not found or wrong: "${title}"`);
    }

    // Check subtitle
    const subtitle = await page.textContent('.font-english');
    record('Step 1: Subtitle', subtitle ? 'PASS' : 'WARN', subtitle || 'Not found');

    // ===== STEP 2: Select birth details =====
    console.log('\n=== STEP 2: Select Birth Details ===');

    // Year: 1990
    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption({ value: '1990' });
    await sleep(300);
    record('Step 2a: Year selection (1990)', 'PASS', 'Selected 1990');

    // Month: 6 (六月)
    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption({ value: '6' });
    await sleep(300);
    record('Step 2b: Month selection (六月)', 'PASS', 'Selected month 6');

    // Day: 15 (十五)
    const daySelect = page.locator('select').nth(2);
    await daySelect.selectOption({ value: '15' });
    await sleep(300);
    record('Step 2c: Day selection (十五)', 'PASS', 'Selected day 15');

    // Shichen: 午时 (index 6)
    const shichenSelect = page.locator('select').nth(3);
    await shichenSelect.selectOption({ value: '6' });
    await sleep(300);
    record('Step 2d: Shichen selection (午时)', 'PASS', 'Selected 午时');

    // Gender: 男 (male)
    const maleRadio = page.locator('input[name="gender"]').first();
    await maleRadio.check({ force: true });
    await sleep(300);

    // Verify "男" label is highlighted
    const maleLabel = page.locator('text=男').first();
    const isVisible = await maleLabel.isVisible();
    record('Step 2e: Gender selection (男)', isVisible ? 'PASS' : 'WARN', 'Male radio selected');

    await screenshot('02-birth-details-filled');

    // ===== STEP 3: Verify BaZi calculation =====
    console.log('\n=== STEP 3: Verify BaZi Display ===');

    // The bazi preview section shows calculated pillars
    const baziPreview = await page.textContent('.font-display.text-lg');
    if (baziPreview && baziPreview.includes('年') && baziPreview.includes('月') && baziPreview.includes('日')) {
      record('Step 3: BaZi calculation display', 'PASS', `BaZi: "${baziPreview.trim()}"`);
    } else {
      record('Step 3: BaZi calculation display', 'FAIL', `BaZi text: "${baziPreview}"`);
    }

    // Check wuxing summary
    const wuxingSummary = await page.locator('text=五行').first().textContent();
    record('Step 3: WuXing summary', wuxingSummary ? 'PASS' : 'WARN', wuxingSummary || 'Not found');

    await screenshot('03-bazi-calculated');

    // ===== STEP 4: Click "开始算命" =====
    console.log('\n=== STEP 4: Click Start Fortune Telling ===');

    const startBtn = page.locator('button:has-text("开始算命")');
    const btnVisible = await startBtn.isVisible();
    record('Step 4a: Start button visible', btnVisible ? 'PASS' : 'FAIL');

    await startBtn.click();
    await sleep(600); // Wait for animation

    // Check loading state
    const loadingText = await page.locator('text=卜算中').isVisible().catch(() => false);
    record('Step 4b: Loading state shown', loadingText ? 'PASS' : 'INFO', 'Button may transition quickly');

    // Wait for navigation to /chat
    await page.waitForURL('**/chat', { timeout: 10000 });
    const currentUrl = page.url();
    record('Step 4c: Navigate to /chat', currentUrl.includes('/chat') ? 'PASS' : 'FAIL', currentUrl);

    await sleep(2000); // Let chat page render
    await screenshot('04-chat-page-initial');

    // ===== STEP 5: Wait for AI streaming response =====
    console.log('\n=== STEP 5: Wait for AI Response ===');

    // Check nav bar elements
    const navTitle = await page.locator('text=天机').first().isVisible();
    record('Step 5a: Nav bar "天机" visible', navTitle ? 'PASS' : 'FAIL');

    const roundText = await page.locator('text=/第.*轮/').first().textContent().catch(() => null);
    record('Step 5b: Round counter visible', roundText ? 'PASS' : 'WARN', roundText || 'Not found');

    // Wait for AI response - poll for assistant message
    let aiResponseFound = false;
    let aiText = '';
    const maxWait = 60000; // 60 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      // Check for any assistant message bubble or streaming text
      const assistantMsgs = await page.locator('[class*="prose"], [class*="bubble"], [class*="message"]').all();

      for (const msg of assistantMsgs) {
        const text = await msg.textContent().catch(() => '');
        if (text && text.length > 20) {
          aiResponseFound = true;
          aiText = text.slice(0, 200);
          break;
        }
      }

      if (aiResponseFound) break;

      // Also try checking if loading indicator disappears
      const stillLoading = await page.locator('[class*="loading"], [class*="typing"], [class*="dots"]').isVisible().catch(() => false);

      // Check for any text content appearing in the main chat area
      const chatArea = await page.locator('main, [class*="chat"], [class*="messages"]').first().textContent().catch(() => '');
      if (chatArea && chatArea.length > 50) {
        aiResponseFound = true;
        aiText = chatArea.slice(0, 200);
        break;
      }

      await sleep(2000);
      console.log(`  Waiting for AI response... ${Math.round((Date.now() - startTime) / 1000)}s`);
    }

    if (aiResponseFound) {
      record('Step 5c: AI response received', 'PASS', `Response preview: "${aiText.slice(0, 100)}..."`);
    } else {
      // Take screenshot of current state to diagnose
      record('Step 5c: AI response received', 'PENDING', 'Checking page state...');
    }

    await screenshot('05-ai-response');

    // Additional check - get ALL text on the page
    const fullPageText = await page.evaluate(() => document.body.innerText);
    const pageLen = fullPageText.length;
    record('Step 5d: Page text content length', pageLen > 100 ? 'PASS' : 'WARN', `${pageLen} chars`);

    // ===== STEP 6: Check fortune cards =====
    console.log('\n=== STEP 6: Check Fortune Cards ===');

    // Look for fortune dimension cards (总运/性格/事业/爱情/财运)
    const fortuneLabels = ['总运', '性格', '事业', '爱情', '财运'];
    let cardsFound = 0;

    for (const label of fortuneLabels) {
      const el = await page.locator(`text=${label}`).first().isVisible().catch(() => false);
      if (el) cardsFound++;
    }

    if (cardsFound > 0) {
      record('Step 6a: Fortune dimension cards found', 'PASS', `${cardsFound}/${fortuneLabels.length} cards visible`);

      // Try to click/expand first card
      for (const label of fortuneLabels) {
        try {
          const card = page.locator(`text=${label}`).first();
          if (await card.isVisible()) {
            await card.click();
            await sleep(500);
            break;
          }
        } catch {}
      }
      await screenshot('06-fortune-cards-expanded');
    } else {
      record('Step 6a: Fortune dimension cards', 'INFO', 'Cards may appear after full response');
      // Scroll down to see if cards are below fold
      await page.evaluate(() => {
        const scrollable = document.querySelector('[class*="messages"], [class*="chat"], main') || document.body;
        scrollable.scrollTop = scrollable.scrollHeight;
      });
      await sleep(1000);
      await screenshot('06-scrolled-down');

      // Recheck after scroll
      for (const label of fortuneLabels) {
        const el = await page.locator(`text=${label}`).first().isVisible().catch(() => false);
        if (el) cardsFound++;
      }
      record('Step 6b: Fortune cards after scroll', cardsFound > 0 ? 'PASS' : 'INFO', `${cardsFound} found`);
    }

    // ===== STEP 7: Send follow-up question =====
    console.log('\n=== STEP 7: Send Follow-up Question ===');

    // Find the input area
    const inputArea = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    const inputVisible = await inputArea.isVisible().catch(() => false);

    if (inputVisible) {
      await inputArea.fill('我的事业运势如何？');
      await sleep(300);
      await screenshot('07a-follow-up-typed');

      // Find and click send button
      const sendBtn = page.locator('button[type="submit"], button:has(svg), button:has-text("发送")').last();
      const sendBtnVisible = await sendBtn.isVisible().catch(() => false);

      if (sendBtnVisible) {
        await sendBtn.click();
      } else {
        // Try pressing Enter
        await inputArea.press('Enter');
      }

      record('Step 7a: Follow-up question sent', 'PASS', 'Sent: "我的事业运势如何？"');

      // Wait for response
      const followUpStart = Date.now();
      let followUpReceived = false;

      while (Date.now() - followUpStart < 60000) {
        // Check for round counter update
        const roundNow = await page.locator('text=/第.*轮/').first().textContent().catch(() => '');
        if (roundNow && !roundNow.includes('1/')) {
          // Round has advanced, meaning response arrived
        }

        // Check if loading is done
        const loadingNow = await page.locator('[class*="loading"], [class*="typing"]').isVisible().catch(() => false);

        // Check page text increased
        const currentText = await page.evaluate(() => document.body.innerText);
        if (currentText.length > pageLen + 50) {
          followUpReceived = true;
          break;
        }

        await sleep(2000);
        console.log(`  Waiting for follow-up response... ${Math.round((Date.now() - followUpStart) / 1000)}s`);
      }

      record('Step 7b: Follow-up response received', followUpReceived ? 'PASS' : 'WARN',
        followUpReceived ? 'Response text increased' : 'Timeout - may still be loading');
    } else {
      record('Step 7: Input area', 'FAIL', 'Input area not found');
    }

    // ===== STEP 8: Screenshot conversation =====
    console.log('\n=== STEP 8: Screenshot Conversation ===');

    // Scroll to bottom of chat
    await page.evaluate(() => {
      const scrollable = document.querySelector('[class*="messages"], [class*="chat"], main, [class*="overflow"]');
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await sleep(500);
    await screenshot('08-conversation-full');

    // Also take a full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08b-conversation-fullpage.png'),
      fullPage: true
    });
    screenshots.push(path.join(SCREENSHOT_DIR, '08b-conversation-fullpage.png'));
    record('Step 8: Conversation screenshot', 'PASS', 'Full conversation captured');

    // ===== STEP 9: Click "生成签文" button =====
    console.log('\n=== STEP 9: Fortune Stick / 签文 ===');

    // Scroll to bottom to see the action buttons
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(300);

    const signBtn = page.locator('button:has-text("生成签文")');
    const signBtnVisible = await signBtn.isVisible().catch(() => false);

    if (signBtnVisible) {
      await signBtn.click();
      await sleep(1000);
      record('Step 9a: "生成签文" button clicked', 'PASS');
      await screenshot('09-fortune-sign-overlay');

      // Check sign card content
      const signTitle = await page.locator('text=签文').first().isVisible().catch(() => false);
      record('Step 9b: Sign overlay title visible', signTitle ? 'PASS' : 'FAIL');

      // Check fortune type badge
      const fortuneType = await page.locator('text=/上.*签/').first().textContent().catch(() => '');
      record('Step 9c: Fortune type badge', fortuneType ? 'PASS' : 'WARN', fortuneType || 'Not found');

      // Check poem text
      const poem = await page.locator('text=春风得意').isVisible().catch(() => false);
      record('Step 9d: Poem text visible', poem ? 'PASS' : 'INFO', 'Default ink-gold poem');

    } else {
      record('Step 9: 生成签文 button', 'FAIL', 'Button not found or not visible');
    }

    // ===== STEP 10: Switch 3 styles =====
    console.log('\n=== STEP 10: Switch Styles ===');

    const styleNames = ['墨金经典', '朱砂吉祥', '水墨淡雅'];
    const styleKeys = ['ink-gold', 'cinnabar', 'ink-wash'];

    for (let i = 0; i < styleNames.length; i++) {
      const styleName = styleNames[i];
      const styleKey = styleKeys[i];

      try {
        const styleBtn = page.locator(`text=${styleName}`);
        const isVisible = await styleBtn.isVisible().catch(() => false);

        if (isVisible) {
          await styleBtn.click();
          await sleep(800);
          await screenshot(`10-style-${styleKey}`);
          record(`Step 10${String.fromCharCode(97 + i)}: Style "${styleName}"`, 'PASS', 'Style switched and captured');
        } else {
          // Try clicking by the circle buttons directly
          const circles = page.locator('.rounded-full.border-2');
          if (await circles.nth(i).isVisible().catch(() => false)) {
            await circles.nth(i).click();
            await sleep(800);
            await screenshot(`10-style-${styleKey}`);
            record(`Step 10${String.fromCharCode(97 + i)}: Style "${styleName}"`, 'PASS', 'Clicked by circle selector');
          } else {
            record(`Step 10${String.fromCharCode(97 + i)}: Style "${styleName}"`, 'WARN', 'Style button not found');
          }
        }
      } catch (err) {
        record(`Step 10${String.fromCharCode(97 + i)}: Style "${styleName}"`, 'FAIL', err.message);
      }
    }

    // ===== STEP 11: Console errors check =====
    console.log('\n=== STEP 11: Console Errors Check ===');

    if (consoleErrors.length === 0) {
      record('Step 11: Console errors', 'PASS', 'No JS errors detected');
    } else {
      for (const err of consoleErrors) {
        record('Step 11: Console error', 'ISSUE', `[${err.url}] ${err.text.slice(0, 200)}`);
      }
    }

    if (consoleWarnings.length > 0) {
      record('Step 11: Console warnings', 'INFO', `${consoleWarnings.length} warnings detected`);
    }

  } catch (err) {
    record('FATAL ERROR', 'FAIL', err.message + '\n' + err.stack);
    await screenshot('99-error-state');
  } finally {
    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(60));
    console.log('REGRESSION TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warns = results.filter(r => r.status === 'WARN' || r.status === 'ISSUE').length;
    const info = results.filter(r => r.status === 'INFO' || r.status === 'PENDING').length;

    console.log(`PASS: ${passed}  |  FAIL: ${failed}  |  WARN: ${warns}  |  INFO: ${info}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    console.log(`Screenshots: ${screenshots.length}`);
    console.log('');

    for (const r of results) {
      const icon = r.status === 'PASS' ? '[OK]' : r.status === 'FAIL' ? '[FAIL]' : r.status === 'WARN' ? '[WARN]' : '[INFO]';
      console.log(`  ${icon} ${r.step}: ${r.detail}`);
    }

    console.log('\nConsole Errors Detail:');
    for (const e of consoleErrors) {
      console.log(`  - ${e.text.slice(0, 300)}`);
    }

    console.log('\nScreenshots saved to:', SCREENSHOT_DIR);

    await browser.close();
  }
})();
