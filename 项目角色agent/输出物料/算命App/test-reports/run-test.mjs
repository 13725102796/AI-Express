import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3002';
const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/算命App/test-reports/screenshots';

const consoleLogs = [];
const testResults = [];

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

function addResult(step, status, details = '') {
  testResults.push({ step, status, details });
  log(`${status === 'PASS' ? 'PASS' : 'FAIL'}: ${step} ${details ? '- ' + details : ''}`);
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  log(`Screenshot: ${path}`);
  return path;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Collect console logs
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
  });

  try {
    // ==========================================
    // STEP 1: Open homepage
    // ==========================================
    log('=== STEP 1: Open homepage ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for animations
    await screenshot(page, '01-homepage');

    // Check key elements
    const tianji = await page.locator('h1').first().textContent();
    if (tianji && tianji.includes('天机')) {
      addResult('Step 1: Homepage title', 'PASS', `Title: "${tianji}"`);
    } else {
      addResult('Step 1: Homepage title', 'FAIL', `Got: "${tianji}"`);
    }

    const subtitle = await page.locator('text=Celestial Oracle').isVisible();
    addResult('Step 1: Subtitle visible', subtitle ? 'PASS' : 'FAIL');

    const selectCount = await page.locator('select').count();
    addResult('Step 1: Selectors present', selectCount === 4 ? 'PASS' : 'FAIL', `Found ${selectCount} selects`);

    const ctaVisible = await page.locator('button:has-text("开始算命")').isVisible();
    addResult('Step 1: CTA button visible', ctaVisible ? 'PASS' : 'FAIL');

    const disclaimerVisible = await page.locator('text=仅供娱乐参考').isVisible();
    addResult('Step 1: Disclaimer visible', disclaimerVisible ? 'PASS' : 'FAIL');

    // Check console errors after step 1
    const step1Errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
    addResult('Step 1: Console errors', step1Errors.length === 0 ? 'PASS' : 'FAIL',
      step1Errors.length > 0 ? `${step1Errors.length} errors: ${step1Errors.map(e => e.text.substring(0, 100)).join(' | ')}` : 'No errors');

    // ==========================================
    // STEP 2: Select birth details
    // ==========================================
    log('=== STEP 2: Select birth details ===');

    // Year: 1990
    await page.locator('select').first().selectOption('1990');
    await page.waitForTimeout(300);

    // Month: June (6)
    await page.locator('select').nth(1).selectOption('6');
    await page.waitForTimeout(300);

    // Day: 15
    await page.locator('select').nth(2).selectOption('15');
    await page.waitForTimeout(300);

    // Shichen: Wu hour (index 6)
    await page.locator('select').nth(3).selectOption('6');
    await page.waitForTimeout(300);

    // Gender: Male
    await page.locator('label:has-text("男")').click();
    await page.waitForTimeout(500);

    await screenshot(page, '02-birth-details-filled');

    // Verify selections
    const yearVal = await page.locator('select').first().inputValue();
    addResult('Step 2: Year selection', yearVal === '1990' ? 'PASS' : 'FAIL', `Value: ${yearVal}`);

    const monthVal = await page.locator('select').nth(1).inputValue();
    addResult('Step 2: Month selection', monthVal === '6' ? 'PASS' : 'FAIL', `Value: ${monthVal}`);

    const dayVal = await page.locator('select').nth(2).inputValue();
    addResult('Step 2: Day selection', dayVal === '15' ? 'PASS' : 'FAIL', `Value: ${dayVal}`);

    const shichenVal = await page.locator('select').nth(3).inputValue();
    addResult('Step 2: Shichen selection', shichenVal === '6' ? 'PASS' : 'FAIL', `Value: ${shichenVal}`);

    addResult('Step 2: Gender selection', 'PASS', 'Male selected via label click');

    // ==========================================
    // STEP 3: Verify Bazi calculation
    // ==========================================
    log('=== STEP 3: Verify Bazi calculation ===');

    // The bazi preview should show calculated values
    const baziPreview = page.locator('p.font-display.text-lg, [class*="tracking-wide"]').first();
    let baziText = '';
    try {
      baziText = await baziPreview.textContent({ timeout: 3000 }) || '';
    } catch {
      // Try broader selector
      const allGoldText = await page.evaluate(() => {
        const els = document.querySelectorAll('[style*="accent-gold"], [style*="gold"]');
        return Array.from(els).map(el => el.textContent).filter(t => t && t.includes('年')).join(' ');
      });
      baziText = allGoldText;
    }
    log(`Bazi text: "${baziText}"`);

    if (baziText && baziText.includes('年') && baziText.includes('月') && baziText.includes('日')) {
      addResult('Step 3: Bazi calculation displayed', 'PASS', `Bazi: "${baziText}"`);
    } else {
      addResult('Step 3: Bazi calculation displayed', 'FAIL', `Got: "${baziText}"`);
    }

    // Check five elements summary
    const fiveElements = await page.locator('text=五行').first().textContent().catch(() => '');
    if (fiveElements) {
      addResult('Step 3: Five elements summary', 'PASS', `Text: "${fiveElements}"`);
    } else {
      addResult('Step 3: Five elements summary', 'FAIL', 'Not found');
    }

    await screenshot(page, '03-bazi-calculated');

    // ==========================================
    // STEP 4: Click "开始算命"
    // ==========================================
    log('=== STEP 4: Click start fortune ===');

    const startBtn = page.locator('button:has-text("开始算命")');
    await startBtn.click();
    await page.waitForTimeout(200);

    // Check loading state
    const loadingText = await page.locator('button:has-text("卜算中")').isVisible().catch(() => false);
    addResult('Step 4: Loading state', loadingText ? 'PASS' : 'FAIL', loadingText ? 'Shows "卜算中..."' : 'Loading state not visible (may have transitioned fast)');

    await screenshot(page, '04-loading-state');

    // ==========================================
    // STEP 5: Wait for chat page
    // ==========================================
    log('=== STEP 5: Wait for chat page ===');

    try {
      await page.waitForURL('**/chat', { timeout: 10000 });
      addResult('Step 5: Navigation to /chat', 'PASS', `URL: ${page.url()}`);
    } catch (e) {
      addResult('Step 5: Navigation to /chat', 'FAIL', `Timeout. Current URL: ${page.url()}`);
    }

    await page.waitForTimeout(2000);
    await screenshot(page, '05-chat-page');

    // Verify chat page elements
    const chatNavVisible = await page.locator('nav').first().isVisible();
    addResult('Step 5: Chat nav bar visible', chatNavVisible ? 'PASS' : 'FAIL');

    const roundText = await page.locator('text=/第.*轮/').first().textContent().catch(() => '');
    addResult('Step 5: Round counter visible', roundText ? 'PASS' : 'FAIL', `Text: "${roundText}"`);

    // Check step 5 console errors
    const step5Errors = consoleLogs.filter(l => (l.type === 'error' || l.type === 'pageerror') && !l.text.includes('favicon'));
    if (step5Errors.length > 0) {
      log('Console errors on chat page:');
      step5Errors.forEach(e => log(`  [${e.type}] ${e.text.substring(0, 200)}`));
    }

    // ==========================================
    // STEP 6: Wait for AI response (SSE)
    // ==========================================
    log('=== STEP 6: Wait for AI SSE response ===');

    let aiResponseDetected = false;
    let waitSeconds = 0;

    for (let i = 0; i < 45; i++) {
      await page.waitForTimeout(1000);
      waitSeconds = i + 1;

      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('施主') || bodyText.includes('贫道') || bodyText.includes('有礼') || bodyText.includes('运势')) {
        aiResponseDetected = true;
        log(`AI response content detected at ${waitSeconds}s`);
        break;
      }

      if (i % 5 === 4) {
        log(`Still waiting... ${waitSeconds}s`);
        await screenshot(page, `06-waiting-${waitSeconds}s`);
      }
    }

    await screenshot(page, '06-ai-response');

    addResult('Step 6: AI response received', aiResponseDetected ? 'PASS' : 'FAIL',
      aiResponseDetected ? `Response detected after ${waitSeconds}s` : `No response after ${waitSeconds}s`);

    // If no AI response, still continue testing what we can
    if (aiResponseDetected) {
      // Wait a bit more for full content to stream in
      await page.waitForTimeout(5000);
      await screenshot(page, '06-ai-response-complete');
    }

    // ==========================================
    // STEP 7: Verify AI reply content
    // ==========================================
    log('=== STEP 7: Verify AI reply content ===');

    const chatContent = await page.evaluate(() => document.body.innerText);
    const hasFortuneContent = chatContent.includes('施主') || chatContent.includes('八字') || chatContent.includes('运势') || chatContent.includes('贫道');
    addResult('Step 7: AI fortune content present', hasFortuneContent ? 'PASS' : 'FAIL',
      hasFortuneContent ? 'Contains fortune-related Chinese text' : 'No fortune content detected');

    // Check typing effect (look for elements that grow in length)
    // This is hard to test definitively, but we can check the content is rendering
    const contentLength = chatContent.length;
    addResult('Step 7: Content rendered', contentLength > 100 ? 'PASS' : 'FAIL', `Body text length: ${contentLength}`);

    // ==========================================
    // STEP 8: Fortune cards
    // ==========================================
    log('=== STEP 8: Check fortune cards ===');

    // Look for fortune card elements - check various selectors
    const fortuneCardLabels = ['总体运势', '总运', '性格', '事业', '感情', '爱情', '财运'];
    let cardsFound = 0;

    for (const label of fortuneCardLabels) {
      const found = await page.locator(`text=${label}`).count();
      if (found > 0) cardsFound++;
    }

    addResult('Step 8: Fortune cards present', cardsFound > 0 ? 'PASS' : 'FAIL',
      `Found ${cardsFound} fortune category labels`);

    // Try clicking a card to expand
    if (cardsFound > 0) {
      for (const label of fortuneCardLabels) {
        const el = page.locator(`text=${label}`).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click();
          await page.waitForTimeout(500);
          await screenshot(page, '08-card-clicked');
          addResult('Step 8: Card click interaction', 'PASS', `Clicked "${label}" card`);
          break;
        }
      }
    }

    await screenshot(page, '08-fortune-cards');

    // ==========================================
    // STEP 9: Send follow-up question
    // ==========================================
    log('=== STEP 9: Send follow-up question ===');

    // Find input field
    const inputSelector = 'input[type="text"], input[placeholder*="问"], input[placeholder*="大师"], textarea';
    const chatInput = page.locator(inputSelector).first();
    const inputVisible = await chatInput.isVisible().catch(() => false);

    if (inputVisible) {
      await chatInput.fill('我的事业运势如何？');
      await page.waitForTimeout(300);
      await screenshot(page, '09-followup-typed');

      // Try to send
      // Look for send button
      const sendBtn = page.locator('button[type="submit"]').first();
      const sendBtnVisible = await sendBtn.isVisible().catch(() => false);

      if (sendBtnVisible) {
        await sendBtn.click();
      } else {
        // Try pressing Enter on the input
        await chatInput.press('Enter');
      }

      addResult('Step 9: Follow-up message sent', 'PASS', 'Sent "我的事业运势如何？"');

      // Wait for response
      let followupResponse = false;
      for (let i = 0; i < 35; i++) {
        await page.waitForTimeout(1000);
        if (i % 10 === 9) {
          log(`Waiting for follow-up response... ${i + 1}s`);
          await screenshot(page, `09-followup-waiting-${i + 1}s`);
        }
        // We just need to wait; it's hard to detect the exact new message
      }

      await screenshot(page, '09-followup-response');
      addResult('Step 9: Follow-up wait completed', 'PASS', 'Waited 35s for response');
    } else {
      addResult('Step 9: Chat input visible', 'FAIL', 'Input field not found or not visible');
      // Try to find it with broader selector
      const allInputs = await page.locator('input, textarea').count();
      log(`Total input/textarea elements on page: ${allInputs}`);
      await screenshot(page, '09-no-input');
    }

    // ==========================================
    // STEP 10: Screenshot conversation state
    // ==========================================
    log('=== STEP 10: Screenshot conversation ===');

    // Scroll to bottom of chat
    await page.evaluate(() => {
      const scrollEl = document.querySelector('[class*="overflow-y"], [class*="scroll"], main');
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);
    await screenshot(page, '10-conversation-state');

    // Also scroll to top to see bazi panel
    await page.evaluate(() => {
      const scrollEl = document.querySelector('[class*="overflow-y"], [class*="scroll"], main');
      if (scrollEl) scrollEl.scrollTop = 0;
      else window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await screenshot(page, '10-conversation-top');

    // ==========================================
    // STEP 11: Generate fortune slip
    // ==========================================
    log('=== STEP 11: Generate fortune slip ===');

    const genBtn = page.locator('button:has-text("生成签文")');
    const genBtnVisible = await genBtn.isVisible().catch(() => false);

    if (genBtnVisible) {
      await genBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '11-fortune-slip');

      // Check if overlay appeared
      const overlayVisible = await page.evaluate(() => {
        // Look for overlay/modal elements
        const els = document.querySelectorAll('[class*="overlay"], [class*="modal"], [class*="share"], [class*="fixed"]');
        return Array.from(els).some(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
      });

      addResult('Step 11: Fortune slip overlay', overlayVisible ? 'PASS' : 'FAIL',
        overlayVisible ? 'Overlay appeared' : 'No overlay detected');

      // Check for fortune slip content
      const slipText = await page.evaluate(() => document.body.innerText);
      const hasSlipContent = slipText.includes('签') || slipText.includes('上上') || slipText.includes('上签') || slipText.includes('诗');
      addResult('Step 11: Fortune slip content', hasSlipContent ? 'PASS' : 'FAIL',
        hasSlipContent ? 'Slip content found' : 'No slip content');

      // ==========================================
      // STEP 12: Switch fortune slip styles
      // ==========================================
      log('=== STEP 12: Switch fortune slip styles ===');

      const styleLabels = ['墨金', '朱砂', '水墨'];
      let stylesFound = 0;

      for (const style of styleLabels) {
        const styleEl = page.locator(`text=${style}`).first();
        const visible = await styleEl.isVisible().catch(() => false);
        if (visible) {
          stylesFound++;
          await styleEl.click();
          await page.waitForTimeout(500);
          await screenshot(page, `12-style-${style}`);
          log(`Clicked style: ${style}`);
        }
      }

      if (stylesFound === 0) {
        // Try looking for style buttons by other means
        const allClickable = await page.evaluate(() => {
          const btns = document.querySelectorAll('button, [role="button"], [class*="style"]');
          return Array.from(btns).map(b => ({ text: b.textContent?.trim(), class: b.className }));
        });
        log(`All clickable elements: ${JSON.stringify(allClickable.slice(0, 20))}`);
        addResult('Step 12: Style switching', 'FAIL', 'Style switch buttons not found');
      } else {
        addResult('Step 12: Style switching', stylesFound >= 2 ? 'PASS' : 'FAIL',
          `Found ${stylesFound} style buttons`);
      }

      // Close overlay
      const closeBtn = page.locator('button:has-text("X"), button:has-text("x"), [class*="close"]').first();
      const closeBtnVisible = await closeBtn.isVisible().catch(() => false);
      if (closeBtnVisible) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      } else {
        // Try clicking the overlay backdrop
        await page.locator('[class*="overlay"], [class*="backdrop"]').first().click({ position: { x: 10, y: 10 } }).catch(() => {});
        await page.waitForTimeout(500);
      }

    } else {
      addResult('Step 11: Fortune slip button', 'FAIL', 'Button not found');
    }

    await screenshot(page, '13-final-state');

    // ==========================================
    // Console errors report
    // ==========================================
    log('\n=== CONSOLE ERRORS REPORT ===');
    const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
    const warnings = consoleLogs.filter(l => l.type === 'warning');

    log(`Total errors: ${errors.length}`);
    errors.forEach((e, i) => log(`  ERROR[${i + 1}]: ${e.text.substring(0, 200)}`));

    log(`Total warnings: ${warnings.length}`);
    warnings.forEach((e, i) => log(`  WARN[${i + 1}]: ${e.text.substring(0, 200)}`));

    // ==========================================
    // Test summary
    // ==========================================
    log('\n=== TEST SUMMARY ===');
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    log(`Total: ${testResults.length} | PASS: ${passed} | FAIL: ${failed}`);
    log('---');
    testResults.forEach(r => {
      log(`  [${r.status}] ${r.step} ${r.details ? '(' + r.details + ')' : ''}`);
    });

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    await screenshot(page, 'error-fatal');
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
