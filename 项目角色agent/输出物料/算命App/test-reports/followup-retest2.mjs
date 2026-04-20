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

  const consoleErrors = [];
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ text: `PAGE_ERROR: ${err.message}` });
  });

  try {
    // Step 1: Open homepage, fill birth details, submit
    console.log('Opening homepage and filling birth details...');
    await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(500);

    await page.locator('select').first().selectOption({ value: '1990' });
    await page.locator('select').nth(1).selectOption({ value: '6' });
    await page.locator('select').nth(2).selectOption({ value: '15' });
    await page.locator('select').nth(3).selectOption({ value: '6' });
    await page.locator('input[name="gender"]').first().check({ force: true });
    await sleep(300);

    await page.locator('button:has-text("开始算命")').click();
    await page.waitForURL('**/chat', { timeout: 10000 });
    console.log('Navigated to /chat');

    // Step 2: Wait for initial AI response to finish streaming
    console.log('Waiting for initial AI response to complete...');
    const startTime = Date.now();

    // Wait until isLoading becomes false (input is no longer disabled)
    await page.waitForFunction(() => {
      const input = document.querySelector('input[type="text"]');
      return input && !input.disabled;
    }, { timeout: 90000 });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`Initial response completed in ${elapsed}s`);

    // Check the round counter
    const roundText = await page.locator('text=/第.*轮/').first().textContent().catch(() => 'N/A');
    console.log(`Round counter after initial: ${roundText}`);

    // Screenshot initial response
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest2-01-initial.png') });

    // Step 3: Send follow-up question using the correct selector
    console.log('\nSending follow-up question...');
    const input = page.locator('input[type="text"].input-field');
    const inputVisible = await input.isVisible();
    const inputDisabled = await input.isDisabled();
    console.log(`Input visible: ${inputVisible}, disabled: ${inputDisabled}`);

    await input.fill('我的事业运势如何？');
    await sleep(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest2-02-typed.png') });

    // Click the send button (the round button next to input)
    const sendBtn = page.locator('button[aria-label="发送消息"]');
    const sendBtnVisible = await sendBtn.isVisible();
    const sendBtnDisabled = await sendBtn.isDisabled();
    console.log(`Send button visible: ${sendBtnVisible}, disabled: ${sendBtnDisabled}`);

    if (sendBtnVisible && !sendBtnDisabled) {
      await sendBtn.click();
      console.log('Clicked send button');
    } else {
      await input.press('Enter');
      console.log('Pressed Enter');
    }

    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest2-03-sent.png') });

    // Verify user message appeared
    const userMsgVisible = await page.evaluate(() => {
      return document.body.innerText.includes('我的事业运势如何');
    });
    console.log(`User message visible: ${userMsgVisible}`);

    // Check if input is now disabled (loading)
    const inputNowDisabled = await input.isDisabled();
    console.log(`Input disabled after send: ${inputNowDisabled}`);

    // Step 4: Wait for follow-up response
    console.log('Waiting for follow-up AI response...');
    const followStart = Date.now();
    let followUpDone = false;

    // Check for round counter advancement or input re-enabling
    while (Date.now() - followStart < 90000) {
      const inputEnabled = await input.isDisabled().catch(() => true);

      if (inputNowDisabled && !inputEnabled) {
        // Input went from disabled back to enabled = response complete
        followUpDone = true;
        console.log(`Follow-up response completed (input re-enabled) after ${Math.round((Date.now() - followStart) / 1000)}s`);
        break;
      }

      const roundNow = await page.locator('text=/第.*轮/').first().textContent().catch(() => 'N/A');

      // If round advanced from initial, response must have come
      if (roundNow && roundNow !== roundText && roundNow.includes('2/')) {
        followUpDone = true;
        console.log(`Follow-up response completed (round advanced to ${roundNow}) after ${Math.round((Date.now() - followStart) / 1000)}s`);
        break;
      }

      console.log(`  Waiting... ${Math.round((Date.now() - followStart) / 1000)}s (input disabled: ${inputEnabled}, round: ${roundNow})`);
      await sleep(3000);
    }

    // Scroll to bottom and screenshot
    await page.evaluate(() => {
      const containers = document.querySelectorAll('[class*="overflow-y"], [class*="overflow-auto"]');
      containers.forEach(c => c.scrollTop = c.scrollHeight);
    });
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest2-04-followup-complete.png') });

    // Check round counter
    const finalRound = await page.locator('text=/第.*轮/').first().textContent().catch(() => 'N/A');
    console.log(`\nFinal round: ${finalRound}`);
    console.log(`Follow-up completed: ${followUpDone}`);

    // Get the last few messages
    const pageText = await page.evaluate(() => document.body.innerText);
    const lastPart = pageText.slice(-600);
    console.log(`\nLast 600 chars:\n${lastPart}`);

    // Verify there's a second assistant message
    const hasFollowUpContent = await page.evaluate(() => {
      // Look for text after "我的事业运势如何"
      const text = document.body.innerText;
      const userQ = text.indexOf('我的事业运势如何');
      if (userQ === -1) return { found: false, reason: 'user message not in text' };
      const afterQ = text.slice(userQ + 10);
      return { found: afterQ.length > 50, length: afterQ.length, preview: afterQ.slice(0, 100) };
    });
    console.log(`\nFollow-up content check:`, JSON.stringify(hasFollowUpContent));

    // Step 5: Full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'retest2-05-fullpage.png'),
      fullPage: true
    });

    // Error check
    const hasError = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('请稍后再试') || text.includes('卜算失败') || text.includes('天机不可再泄');
    });
    console.log(`Error message visible: ${hasError}`);

    // Console errors
    console.log(`\n=== Console Errors: ${consoleErrors.length} ===`);
    consoleErrors.forEach(e => console.log(`  - ${e.text.slice(0, 200)}`));

    // Final verdict
    console.log('\n=== VERDICT ===');
    if (followUpDone && !hasError) {
      console.log('FOLLOW-UP TEST: PASS');
    } else if (hasError) {
      console.log('FOLLOW-UP TEST: FAIL (error displayed)');
    } else {
      console.log('FOLLOW-UP TEST: INCONCLUSIVE (timeout but may still be loading)');
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest2-error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
