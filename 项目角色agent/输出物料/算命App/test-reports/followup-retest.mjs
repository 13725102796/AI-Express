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

    // Select birth: 1990, 6, 15, 午时, male
    await page.locator('select').first().selectOption({ value: '1990' });
    await page.locator('select').nth(1).selectOption({ value: '6' });
    await page.locator('select').nth(2).selectOption({ value: '15' });
    await page.locator('select').nth(3).selectOption({ value: '6' });
    await page.locator('input[name="gender"]').first().check({ force: true });
    await sleep(300);

    // Click start
    await page.locator('button:has-text("开始算命")').click();
    await page.waitForURL('**/chat', { timeout: 10000 });
    console.log('Navigated to /chat');

    // Step 2: Wait for initial AI response
    console.log('Waiting for initial AI response...');
    const startTime = Date.now();
    let initialDone = false;

    while (Date.now() - startTime < 90000) {
      // Check for fortune cards which indicate response is complete
      const fortuneCount = await page.evaluate(() => {
        const labels = ['总体运势', '性格分析', '事业运', '感情运', '财运'];
        let count = 0;
        labels.forEach(l => {
          if (document.body.innerText.includes(l)) count++;
        });
        return count;
      });

      if (fortuneCount >= 3) {
        initialDone = true;
        console.log(`Initial response complete (${fortuneCount} fortune cards found) after ${Math.round((Date.now() - startTime) / 1000)}s`);
        break;
      }

      await sleep(2000);
      console.log(`  Waiting... ${Math.round((Date.now() - startTime) / 1000)}s (${fortuneCount} cards)`);
    }

    if (!initialDone) {
      console.log('WARNING: Initial response may not be complete');
    }

    // Take a clean screenshot of the initial response
    await page.evaluate(() => {
      const scrollable = document.querySelector('[class*="overflow-y"]');
      if (scrollable) scrollable.scrollTop = 0;
    });
    await sleep(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest-01-initial-top.png') });

    // Scroll to see fortune cards
    await page.evaluate(() => {
      const scrollable = document.querySelector('[class*="overflow-y"]');
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await sleep(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest-02-initial-bottom.png') });

    // Step 3: Verify round counter
    const roundText = await page.locator('text=/第.*轮/').first().textContent().catch(() => 'N/A');
    console.log(`Round counter: ${roundText}`);

    // Step 4: Send follow-up question
    console.log('\nSending follow-up question: "我的事业运势如何？"');

    const textareaSelector = 'textarea';
    await page.waitForSelector(textareaSelector, { timeout: 5000 });

    // Check if textarea is disabled (still loading)
    const isDisabled = await page.locator(textareaSelector).isDisabled();
    console.log(`Textarea disabled: ${isDisabled}`);

    if (isDisabled) {
      console.log('Waiting for textarea to become enabled...');
      await page.waitForFunction(() => {
        const ta = document.querySelector('textarea');
        return ta && !ta.disabled;
      }, { timeout: 30000 });
    }

    await page.locator(textareaSelector).fill('我的事业运势如何？');
    await sleep(200);

    // Try clicking send button
    const sendBtn = page.locator('button[type="submit"]');
    const sendVisible = await sendBtn.isVisible().catch(() => false);
    console.log(`Send button visible: ${sendVisible}`);

    if (sendVisible && !(await sendBtn.isDisabled())) {
      await sendBtn.click();
      console.log('Clicked send button');
    } else {
      // Press Enter
      await page.locator(textareaSelector).press('Enter');
      console.log('Pressed Enter to send');
    }

    await sleep(500);

    // Capture the moment after sending
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest-03-followup-sent.png') });

    // Get page text length baseline
    const baselineLen = await page.evaluate(() => document.body.innerText.length);
    console.log(`Baseline text length: ${baselineLen}`);

    // Step 5: Wait for follow-up response
    console.log('Waiting for follow-up response...');
    const followStart = Date.now();
    let followUpDone = false;
    let lastLen = baselineLen;

    while (Date.now() - followStart < 90000) {
      const currentLen = await page.evaluate(() => document.body.innerText.length);
      const roundNow = await page.locator('text=/第.*轮/').first().textContent().catch(() => 'N/A');

      if (currentLen > baselineLen + 30) {
        followUpDone = true;
        console.log(`Follow-up response detected after ${Math.round((Date.now() - followStart) / 1000)}s`);
        console.log(`Text grew from ${baselineLen} to ${currentLen} (+${currentLen - baselineLen})`);
        console.log(`Round: ${roundNow}`);
        break;
      }

      // Check for loading indicator
      const isLoadingNow = await page.evaluate(() => {
        return document.body.innerText.includes('正在解读') ||
               document.querySelector('[class*="typing"]') !== null ||
               document.querySelector('[class*="loading"]') !== null;
      });

      if (isLoadingNow) {
        console.log(`  Loading in progress... ${Math.round((Date.now() - followStart) / 1000)}s (len=${currentLen}, round=${roundNow})`);
      } else {
        console.log(`  Waiting... ${Math.round((Date.now() - followStart) / 1000)}s (len=${currentLen}, delta=${currentLen - lastLen}, round=${roundNow})`);
      }

      lastLen = currentLen;
      await sleep(3000);
    }

    // Step 6: Screenshot final state
    // Scroll to very bottom
    await page.evaluate(() => {
      const scrollable = document.querySelector('[class*="overflow-y"]');
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest-04-followup-response.png') });

    // Also check if user message is visible
    const userMsgVisible = await page.evaluate(() => {
      return document.body.innerText.includes('我的事业运势如何');
    });
    console.log(`\nUser message visible: ${userMsgVisible}`);
    console.log(`Follow-up completed: ${followUpDone}`);

    // Step 7: Get final text for analysis
    const finalText = await page.evaluate(() => {
      const msgs = document.querySelectorAll('[class*="message"], [class*="bubble"], [class*="prose"]');
      return Array.from(msgs).map(m => m.textContent?.slice(0, 100)).filter(Boolean);
    });
    console.log(`\nMessage elements found: ${finalText.length}`);
    finalText.forEach((t, i) => console.log(`  Message ${i}: ${t.slice(0, 80)}...`));

    // Get all body text near the bottom
    const lastSection = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.slice(-500);
    });
    console.log(`\nLast 500 chars of page text:\n${lastSection}`);

    // Console errors summary
    console.log(`\n=== Console Errors: ${consoleErrors.length} ===`);
    consoleErrors.forEach(e => console.log(`  - ${e.text.slice(0, 200)}`));

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest-error.png') });
  } finally {
    await browser.close();
  }
})();
