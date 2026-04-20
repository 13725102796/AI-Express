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
    // Clear session storage first by going to the page and clearing
    console.log('Clearing session storage...');
    await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => sessionStorage.clear());
    await sleep(300);

    // Now reload fresh
    await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(500);

    console.log('Filling birth details...');
    await page.locator('select').first().selectOption({ value: '1990' });
    await page.locator('select').nth(1).selectOption({ value: '6' });
    await page.locator('select').nth(2).selectOption({ value: '15' });
    await page.locator('select').nth(3).selectOption({ value: '6' });
    await page.locator('input[name="gender"]').first().check({ force: true });
    await sleep(300);

    await page.locator('button:has-text("开始算命")').click();
    await page.waitForURL('**/chat', { timeout: 10000 });
    console.log('Navigated to /chat');

    // Diagnostic: What elements exist on the page right now?
    await sleep(2000);
    const diagnostics = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]');
      const textareas = document.querySelectorAll('textarea');
      const buttons = document.querySelectorAll('button');
      const all = document.body.innerText.slice(0, 300);
      return {
        inputCount: inputs.length,
        textareaCount: textareas.length,
        buttonCount: buttons.length,
        inputDisabled: inputs.length > 0 ? inputs[0].disabled : 'N/A',
        inputPlaceholder: inputs.length > 0 ? inputs[0].placeholder : 'N/A',
        bodyTextPreview: all,
        url: window.location.href,
      };
    });
    console.log('Page diagnostics:', JSON.stringify(diagnostics, null, 2));

    // Wait for the streaming response to complete by watching input enable state
    console.log('\nWaiting for initial AI response...');
    const startTime = Date.now();
    let responseComplete = false;
    let lastBodyLen = 0;
    let stableCount = 0;

    for (let i = 0; i < 45; i++) { // Max ~90 seconds (45 * 2s)
      const state = await page.evaluate(() => {
        const input = document.querySelector('input[type="text"]');
        const bodyText = document.body.innerText;
        const hasFortuneCards = ['总体运势', '性格分析', '事业运', '感情运', '财运']
          .filter(l => bodyText.includes(l)).length;
        return {
          inputDisabled: input ? input.disabled : null,
          bodyLength: bodyText.length,
          hasFortuneCards,
          roundText: bodyText.match(/第\s*\d+\/20\s*轮/)?.[0] || 'N/A',
        };
      });

      console.log(`  ${Math.round((Date.now() - startTime) / 1000)}s: len=${state.bodyLength} delta=${state.bodyLength - lastBodyLen} inputDisabled=${state.inputDisabled} cards=${state.hasFortuneCards} round=${state.roundText}`);

      // Response is done when:
      // 1. Input is not disabled anymore, AND
      // 2. Fortune cards are present (>= 3), AND
      // 3. Text has stopped growing
      if (!state.inputDisabled && state.hasFortuneCards >= 3 && state.bodyLength === lastBodyLen && lastBodyLen > 500) {
        responseComplete = true;
        stableCount++;
        if (stableCount >= 2) {
          console.log(`Initial response complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
          break;
        }
      } else {
        stableCount = 0;
      }

      // Also complete if input is enabled and body has substantial text, even without fortune card detection
      if (!state.inputDisabled && state.bodyLength > 1500 && state.bodyLength === lastBodyLen) {
        stableCount++;
        if (stableCount >= 3) {
          responseComplete = true;
          console.log(`Initial response appears complete (text stable) after ${Math.round((Date.now() - startTime) / 1000)}s`);
          break;
        }
      }

      lastBodyLen = state.bodyLength;
      await sleep(2000);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest3-01-after-initial.png') });

    if (!responseComplete) {
      console.log('WARNING: Initial response may not be fully complete');
    }

    // Now send the follow-up
    console.log('\n=== FOLLOW-UP TEST ===');

    const input = page.locator('input[type="text"]');
    const inputInfo = await page.evaluate(() => {
      const inp = document.querySelector('input[type="text"]');
      if (!inp) return { exists: false };
      return {
        exists: true,
        disabled: inp.disabled,
        placeholder: inp.placeholder,
        value: inp.value,
        offsetWidth: inp.offsetWidth,
        offsetHeight: inp.offsetHeight,
      };
    });
    console.log('Input state:', JSON.stringify(inputInfo));

    if (!inputInfo.exists) {
      console.log('FAIL: Input element not found!');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest3-error-no-input.png') });
      await browser.close();
      return;
    }

    if (inputInfo.disabled) {
      console.log('Input is disabled, waiting for it to enable...');
      try {
        await page.waitForFunction(() => {
          const inp = document.querySelector('input[type="text"]');
          return inp && !inp.disabled;
        }, { timeout: 60000 });
        console.log('Input now enabled');
      } catch {
        console.log('WARN: Input still disabled after 60s wait');
      }
    }

    // Type the follow-up
    await input.click();
    await input.fill('我的事业运势如何？');
    await sleep(300);

    // Check value was entered
    const typedValue = await input.inputValue();
    console.log(`Typed value: "${typedValue}"`);

    // Record baseline
    const baselineText = await page.evaluate(() => document.body.innerText);
    const baselineLen = baselineText.length;
    console.log(`Baseline text length before send: ${baselineLen}`);

    // Find and click send button
    const sendBtnInfo = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="发送消息"]');
      if (!btn) return { exists: false };
      return {
        exists: true,
        disabled: btn.disabled,
        text: btn.textContent,
        opacity: getComputedStyle(btn).opacity,
      };
    });
    console.log('Send button state:', JSON.stringify(sendBtnInfo));

    if (sendBtnInfo.exists && !sendBtnInfo.disabled) {
      await page.locator('button[aria-label="发送消息"]').click();
      console.log('Clicked send button');
    } else {
      await input.press('Enter');
      console.log('Pressed Enter to send');
    }

    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest3-02-after-send.png') });

    // Check if user message appeared and if AI is loading
    const afterSendState = await page.evaluate(() => {
      const text = document.body.innerText;
      const input = document.querySelector('input[type="text"]');
      return {
        userMsgVisible: text.includes('我的事业运势如何'),
        inputDisabled: input ? input.disabled : null,
        inputValue: input ? input.value : null,
        textLength: text.length,
        roundText: text.match(/第\s*\d+\/20\s*轮/)?.[0] || 'N/A',
        hasError: text.includes('请稍后再试') || text.includes('卜算失败'),
      };
    });
    console.log('After send state:', JSON.stringify(afterSendState));

    if (!afterSendState.userMsgVisible) {
      console.log('WARNING: User message not visible after send. Checking if message was actually sent...');

      // Maybe the input was cleared but message went through
      if (afterSendState.inputValue === '') {
        console.log('Input was cleared, suggesting message was sent');
      }
    }

    // Wait for AI follow-up response
    console.log('\nWaiting for follow-up AI response...');
    const followStart = Date.now();
    let followUpDone = false;

    for (let i = 0; i < 30; i++) { // Max ~90 seconds
      const state = await page.evaluate(() => {
        const text = document.body.innerText;
        const input = document.querySelector('input[type="text"]');
        return {
          textLength: text.length,
          inputDisabled: input ? input.disabled : null,
          roundText: text.match(/第\s*\d+\/20\s*轮/)?.[0] || 'N/A',
          hasError: text.includes('请稍后再试') || text.includes('卜算失败'),
          lastChars: text.slice(-200),
        };
      });

      console.log(`  ${Math.round((Date.now() - followStart) / 1000)}s: len=${state.textLength} delta=${state.textLength - baselineLen} inputDisabled=${state.inputDisabled} round=${state.roundText} error=${state.hasError}`);

      if (state.hasError) {
        console.log('ERROR detected in page!');
        break;
      }

      // Response complete: text grew AND input is re-enabled
      if (state.textLength > baselineLen + 30 && !state.inputDisabled) {
        followUpDone = true;
        console.log(`Follow-up response complete after ${Math.round((Date.now() - followStart) / 1000)}s (+${state.textLength - baselineLen} chars)`);
        break;
      }

      // If text is growing, response is in progress
      if (state.textLength > baselineLen + 10) {
        console.log(`  Response streaming... (+${state.textLength - baselineLen} chars)`);
      }

      await sleep(3000);
    }

    // Final screenshot
    await page.evaluate(() => {
      const containers = document.querySelectorAll('[class*="overflow-y"], [class*="overflow-auto"]');
      containers.forEach(c => c.scrollTop = c.scrollHeight);
    });
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest3-03-followup-final.png') });

    // Full page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'retest3-04-fullpage.png'),
      fullPage: true
    });

    // Extract conversation content
    const finalContent = await page.evaluate(() => {
      const text = document.body.innerText;
      const idx = text.indexOf('我的事业运势如何');
      if (idx === -1) return { userQFound: false, text: text.slice(-400) };
      return {
        userQFound: true,
        afterQuestion: text.slice(idx, idx + 500),
      };
    });
    console.log('\nFinal content:', JSON.stringify(finalContent, null, 2));

    const finalRound = await page.locator('text=/第.*轮/').first().textContent().catch(() => 'N/A');
    console.log(`\nFinal round: ${finalRound}`);

    // Console errors
    console.log(`\nConsole Errors: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`  - ${e.text.slice(0, 200)}`));

    // Verdict
    console.log('\n=== VERDICT ===');
    if (followUpDone) {
      console.log('FOLLOW-UP TEST: PASS');
    } else {
      console.log('FOLLOW-UP TEST: NEEDS INVESTIGATION');
    }

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    console.error(err.stack);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retest3-fatal.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
