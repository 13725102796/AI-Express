import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/算命App/test-reports/screenshots/round3';
const FRONTEND_URL = 'http://localhost:3002';

// Ensure screenshot dir exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let consoleErrors = [];
let consoleWarnings = [];
let allConsoleLogs = [];

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[SCREENSHOT] ${name}.png saved`);
  return filePath;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  // Collect console logs
  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text(), url: page.url() };
    allConsoleLogs.push(entry);
    if (msg.type() === 'error') consoleErrors.push(entry);
    if (msg.type() === 'warning') consoleWarnings.push(entry);
  });

  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', text: err.message, url: page.url() });
  });

  try {
    // ============================================================
    // STEP 1: Open homepage
    // ============================================================
    console.log('\n=== STEP 1: Open Homepage ===');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await screenshot(page, '01-homepage');
    console.log(`[INFO] Current URL: ${page.url()}`);
    console.log(`[INFO] Page title: ${await page.title()}`);

    // Check page content
    const pageText = await page.textContent('body');
    console.log(`[INFO] Page body length: ${pageText.length} chars`);
    console.log(`[INFO] Contains "天机": ${pageText.includes('天机')}`);
    console.log(`[INFO] Contains "算命": ${pageText.includes('算命')}`);
    console.log(`[INFO] Contains "生辰": ${pageText.includes('生辰') || pageText.includes('年') || pageText.includes('出生')}`);

    // ============================================================
    // STEP 2: Select birth details - 1990, June, 15th, Wu hour, Male
    // ============================================================
    console.log('\n=== STEP 2: Select Birth Details ===');

    // Let's first understand the page structure
    const selectElements = await page.$$('select');
    console.log(`[INFO] Found ${selectElements.length} <select> elements`);

    const inputElements = await page.$$('input');
    console.log(`[INFO] Found ${inputElements.length} <input> elements`);

    const buttonElements = await page.$$('button');
    const buttonTexts = [];
    for (const btn of buttonElements) {
      const text = await btn.textContent();
      buttonTexts.push(text.trim());
    }
    console.log(`[INFO] Found ${buttonElements.length} buttons: ${JSON.stringify(buttonTexts)}`);

    // Check for picker/wheel elements
    const allDivClasses = await page.evaluate(() => {
      const divs = document.querySelectorAll('div[class]');
      const classes = new Set();
      divs.forEach(d => {
        d.className.split(' ').forEach(c => { if (c) classes.add(c); });
      });
      return Array.from(classes).filter(c =>
        c.toLowerCase().includes('pick') ||
        c.toLowerCase().includes('select') ||
        c.toLowerCase().includes('wheel') ||
        c.toLowerCase().includes('scroll') ||
        c.toLowerCase().includes('year') ||
        c.toLowerCase().includes('month') ||
        c.toLowerCase().includes('day') ||
        c.toLowerCase().includes('hour') ||
        c.toLowerCase().includes('gender') ||
        c.toLowerCase().includes('date') ||
        c.toLowerCase().includes('birth') ||
        c.toLowerCase().includes('column')
      );
    });
    console.log(`[INFO] Relevant CSS classes: ${JSON.stringify(allDivClasses)}`);

    // Try to find and interact with selectors/pickers
    // First attempt: look for select dropdowns
    const selects = await page.$$('select');
    if (selects.length > 0) {
      console.log('[INFO] Using <select> dropdowns');
      for (let i = 0; i < selects.length; i++) {
        const options = await selects[i].evaluate(el => {
          return Array.from(el.options).map(o => ({ value: o.value, text: o.textContent }));
        });
        console.log(`[INFO] Select #${i} options: ${JSON.stringify(options.slice(0, 5))}...`);
      }
    }

    // Look for custom picker columns (common in mobile fortune apps)
    const pickerColumns = await page.$$('[class*="picker"], [class*="column"], [class*="scroll"], [class*="wheel"]');
    console.log(`[INFO] Found ${pickerColumns.length} picker-like elements`);

    // Let's get a broader view of the interactive elements on the page
    const interactiveInfo = await page.evaluate(() => {
      const info = {};

      // All clickable/interactive elements
      const allEls = document.querySelectorAll('button, select, input, [role="button"], [role="listbox"], [role="option"], [onclick], [class*="picker"], [class*="select"], [class*="option"], [class*="item"]');
      info.interactiveCount = allEls.length;

      // Look for year/month/day related text
      const bodyText = document.body.innerText;
      info.hasYear = bodyText.includes('年');
      info.hasMonth = bodyText.includes('月');
      info.hasDay = bodyText.includes('日');
      info.hasHour = bodyText.includes('时');
      info.hasGender = bodyText.includes('男') || bodyText.includes('女') || bodyText.includes('性别');

      // Get all visible text blocks that might be labels
      const labels = document.querySelectorAll('label, [class*="label"], [class*="title"], h1, h2, h3, h4, h5, h6');
      info.labels = Array.from(labels).map(l => l.textContent.trim()).filter(t => t.length < 50);

      // Get data attributes
      const dataEls = document.querySelectorAll('[data-value], [data-year], [data-month], [data-day]');
      info.dataElsCount = dataEls.length;

      return info;
    });
    console.log(`[INFO] Interactive info: ${JSON.stringify(interactiveInfo)}`);

    // Strategy: Try different approaches to find and set birth date
    // Approach 1: Try direct select elements
    let yearSet = false, monthSet = false, daySet = false, hourSet = false, genderSet = false;

    // Try select elements by looking at their option content
    for (const sel of selects) {
      const options = await sel.evaluate(el => {
        return Array.from(el.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
      });

      const optTexts = options.map(o => o.text).join(',');

      if (optTexts.includes('1990') || optTexts.includes('1989') || optTexts.includes('1991')) {
        // Year selector
        const yearOpt = options.find(o => o.text.includes('1990') || o.value === '1990');
        if (yearOpt) {
          await sel.selectOption(yearOpt.value);
          yearSet = true;
          console.log(`[INFO] Year set to 1990`);
        }
      } else if (optTexts.includes('六月') || optTexts.includes('6月') || (optTexts.includes('一月') && optTexts.includes('十二月'))) {
        // Month selector - try "六月" first, then "6"
        const monthOpt = options.find(o => o.text.includes('六月') || o.text === '6月' || o.text === '六月' || o.value === '6');
        if (monthOpt) {
          await sel.selectOption(monthOpt.value);
          monthSet = true;
          console.log(`[INFO] Month set to June (六月)`);
        }
      } else if (optTexts.includes('十五') || optTexts.includes('15日') || (optTexts.includes('初一') && optTexts.includes('三十'))) {
        // Day selector
        const dayOpt = options.find(o => o.text.includes('十五') || o.text === '15日' || o.text === '15' || o.value === '15');
        if (dayOpt) {
          await sel.selectOption(dayOpt.value);
          daySet = true;
          console.log(`[INFO] Day set to 15 (十五)`);
        }
      } else if (optTexts.includes('午时') || optTexts.includes('子时') || optTexts.includes('卯时')) {
        // Hour selector
        const hourOpt = options.find(o => o.text.includes('午时') || o.value.includes('午'));
        if (hourOpt) {
          await sel.selectOption(hourOpt.value);
          hourSet = true;
          console.log(`[INFO] Hour set to 午时`);
        }
      } else if (optTexts.includes('男') || optTexts.includes('女')) {
        // Gender selector
        const genderOpt = options.find(o => o.text.includes('男') || o.value === 'male' || o.value === '男');
        if (genderOpt) {
          await sel.selectOption(genderOpt.value);
          genderSet = true;
          console.log(`[INFO] Gender set to Male (男)`);
        }
      }
    }

    // Approach 2: If selects didn't work, try clicking on elements with specific text
    if (!yearSet || !monthSet || !daySet || !hourSet || !genderSet) {
      console.log(`[INFO] Some fields not set via <select>. Trying click-based approach...`);
      console.log(`[INFO] Status: year=${yearSet}, month=${monthSet}, day=${daySet}, hour=${hourSet}, gender=${genderSet}`);

      // Try to find clickable year options
      if (!yearSet) {
        const yearEl = await page.$('text=1990');
        if (yearEl) { await yearEl.click(); yearSet = true; console.log('[INFO] Clicked 1990 text'); }
      }

      // Try gender buttons
      if (!genderSet) {
        const maleBtn = await page.$('button:has-text("男")');
        if (maleBtn) { await maleBtn.click(); genderSet = true; console.log('[INFO] Clicked Male button'); }
        else {
          const maleEl = await page.$('text=男');
          if (maleEl) { await maleEl.click(); genderSet = true; console.log('[INFO] Clicked Male text'); }
        }
      }
    }

    await sleep(1000);
    await screenshot(page, '02-birth-details-selected');

    // ============================================================
    // STEP 3: Verify Bazi calculation
    // ============================================================
    console.log('\n=== STEP 3: Verify Bazi Calculation ===');

    const baziText = await page.evaluate(() => {
      const body = document.body.innerText;
      // Look for heavenly stems and earthly branches characters
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      const found = [];
      for (const s of stems) {
        for (const b of branches) {
          if (body.includes(s + b)) found.push(s + b);
        }
      }
      return { found, hasBazi: found.length > 0, bodySnippet: body.substring(0, 500) };
    });
    console.log(`[INFO] Bazi found: ${JSON.stringify(baziText.found)}`);
    console.log(`[INFO] Has Bazi display: ${baziText.hasBazi}`);

    await screenshot(page, '03-bazi-calculation');

    // ============================================================
    // STEP 4: Click "Start Fortune Telling"
    // ============================================================
    console.log('\n=== STEP 4: Click Start Fortune Telling ===');

    // Look for the start button
    const startBtn = await page.$('button:has-text("开始算命")')
      || await page.$('button:has-text("开始")')
      || await page.$('button:has-text("算命")')
      || await page.$('button:has-text("测算")')
      || await page.$('[class*="start"]');

    if (startBtn) {
      const btnText = await startBtn.textContent();
      console.log(`[INFO] Found start button: "${btnText.trim()}"`);
      await startBtn.click();
      console.log('[INFO] Clicked start button');
    } else {
      console.log('[WARN] Could not find start button. Trying to find any primary/submit button...');
      const primaryBtns = await page.$$('button');
      for (const btn of primaryBtns) {
        const text = await btn.textContent();
        console.log(`[DEBUG] Button: "${text.trim()}"`);
      }
      // Click the most likely candidate
      const anyBtn = await page.$('button[type="submit"]') || (await page.$$('button')).pop();
      if (anyBtn) {
        const text = await anyBtn.textContent();
        console.log(`[INFO] Clicking button: "${text.trim()}"`);
        await anyBtn.click();
      }
    }

    await sleep(2000);
    await screenshot(page, '04-after-start-click');

    // ============================================================
    // STEP 5: Wait for /chat page navigation
    // ============================================================
    console.log('\n=== STEP 5: Wait for Chat Page ===');

    // Wait for navigation to /chat
    let onChatPage = false;
    for (let i = 0; i < 15; i++) {
      const url = page.url();
      if (url.includes('/chat') || url.includes('/result')) {
        onChatPage = true;
        console.log(`[INFO] Navigated to: ${url}`);
        break;
      }
      await sleep(1000);
    }

    if (!onChatPage) {
      console.log(`[WARN] Not on chat page yet. Current URL: ${page.url()}`);
      // Try manually navigating
      await page.goto(`${FRONTEND_URL}/chat`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    }

    await sleep(2000);
    await screenshot(page, '05-chat-page-initial');
    console.log(`[INFO] Current URL: ${page.url()}`);

    // ============================================================
    // STEP 6: Wait for AI streaming response (up to 60s)
    // ============================================================
    console.log('\n=== STEP 6: Wait for AI Streaming Response ===');

    let aiResponseReceived = false;
    let aiResponseText = '';

    for (let i = 0; i < 60; i++) {
      const result = await page.evaluate(() => {
        // Look for AI response elements
        const selectors = [
          '[class*="message"]',
          '[class*="response"]',
          '[class*="answer"]',
          '[class*="bubble"]',
          '[class*="ai"]',
          '[class*="assistant"]',
          '[class*="bot"]',
          '[class*="typing"]',
          '[class*="chat"]',
          '.message',
          '.response',
        ];

        let maxLen = 0;
        let bestText = '';

        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const text = el.innerText || el.textContent || '';
            if (text.length > maxLen) {
              maxLen = text.length;
              bestText = text;
            }
          }
        }

        // Also check body text for fortune-related keywords
        const body = document.body.innerText;
        const hasFortuneContent = body.includes('施主') || body.includes('命理') || body.includes('运势') ||
                                   body.includes('八字') || body.includes('五行') || body.includes('天干') ||
                                   body.includes('地支') || body.includes('吉') || body.includes('凶') ||
                                   body.includes('贵人') || body.includes('算命') || body.includes('命盘');

        return {
          maxLen,
          bestText: bestText.substring(0, 300),
          hasFortuneContent,
          bodyLen: body.length,
          bodySnippet: body.substring(0, 200)
        };
      });

      if (result.hasFortuneContent && result.maxLen > 50) {
        aiResponseReceived = true;
        aiResponseText = result.bestText;
        console.log(`[INFO] AI response detected after ${i+1}s! Length: ${result.maxLen}`);
        console.log(`[INFO] Response preview: ${result.bestText.substring(0, 150)}...`);
        break;
      }

      if (i % 5 === 0) {
        console.log(`[INFO] Waiting for AI response... ${i+1}s (body: ${result.bodyLen} chars, fortune content: ${result.hasFortuneContent})`);
      }

      await sleep(1000);
    }

    await screenshot(page, '06-ai-response');

    if (!aiResponseReceived) {
      console.log('[WARN] AI response may not have been detected. Taking additional screenshot for verification.');
      // Check body text more broadly
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(`[DEBUG] Full body text (first 500 chars): ${bodyText.substring(0, 500)}`);
    }

    // ============================================================
    // STEP 7: Verify typewriter effect
    // ============================================================
    console.log('\n=== STEP 7: Verify Typewriter Effect ===');

    // Take rapid screenshots to capture typewriter animation
    const text1 = await page.evaluate(() => document.body.innerText.length);
    await sleep(500);
    const text2 = await page.evaluate(() => document.body.innerText.length);
    await sleep(500);
    const text3 = await page.evaluate(() => document.body.innerText.length);

    const isTypewriting = (text2 > text1) || (text3 > text2);
    console.log(`[INFO] Text length changes: ${text1} -> ${text2} -> ${text3}`);
    console.log(`[INFO] Typewriter effect detected: ${isTypewriting}`);

    // Wait a bit more for content to finish
    await sleep(5000);
    await screenshot(page, '07-typewriter-progress');

    // ============================================================
    // STEP 8: Check for fortune cards (five dimensions)
    // ============================================================
    console.log('\n=== STEP 8: Check Fortune Cards ===');

    // Wait for full response to complete
    await sleep(10000);
    await screenshot(page, '08-full-response');

    const fortuneCards = await page.evaluate(() => {
      const body = document.body.innerText;
      const dimensions = {
        total: body.includes('总运') || body.includes('综合'),
        personality: body.includes('性格') || body.includes('个性'),
        career: body.includes('事业') || body.includes('职业'),
        love: body.includes('爱情') || body.includes('感情') || body.includes('姻缘'),
        wealth: body.includes('财运') || body.includes('财富') || body.includes('财')
      };

      // Look for expandable card elements
      const cards = document.querySelectorAll('[class*="card"], [class*="fortune"], [class*="dimension"], [class*="expand"], [class*="collapse"]');

      return {
        dimensions,
        cardCount: cards.length,
        hasCards: cards.length > 0
      };
    });
    console.log(`[INFO] Fortune dimensions found: ${JSON.stringify(fortuneCards.dimensions)}`);
    console.log(`[INFO] Card elements found: ${fortuneCards.cardCount}`);

    // Try to click/expand fortune cards if they exist
    if (fortuneCards.hasCards) {
      const cards = await page.$$('[class*="card"], [class*="fortune"], [class*="dimension"]');
      for (let i = 0; i < Math.min(cards.length, 5); i++) {
        try {
          await cards[i].click();
          await sleep(500);
          console.log(`[INFO] Clicked card #${i+1}`);
        } catch (e) {
          console.log(`[WARN] Could not click card #${i+1}: ${e.message}`);
        }
      }
      await screenshot(page, '08b-cards-expanded');
    }

    // ============================================================
    // STEP 9: Send follow-up question "我的事业运势如何？"
    // ============================================================
    console.log('\n=== STEP 9: Send Follow-up Question ===');

    // Find the input field
    const textarea = await page.$('textarea') || await page.$('input[type="text"]') || await page.$('[contenteditable="true"]') || await page.$('input:not([type="hidden"])');

    if (textarea) {
      console.log('[INFO] Found input element');
      await textarea.click();
      await textarea.fill('我的事业运势如何？');
      await sleep(500);
      await screenshot(page, '09a-question-typed');

      // Find and click send button
      const sendBtn = await page.$('button:has-text("发送")')
        || await page.$('button:has-text("送")')
        || await page.$('[class*="send"]')
        || await page.$('button[type="submit"]');

      if (sendBtn) {
        await sendBtn.click();
        console.log('[INFO] Clicked send button');
      } else {
        // Try pressing Enter
        await textarea.press('Enter');
        console.log('[INFO] Pressed Enter to send');
      }

      // Wait for AI response (up to 60s)
      console.log('[INFO] Waiting for follow-up AI response...');
      let followUpReceived = false;

      for (let i = 0; i < 60; i++) {
        const result = await page.evaluate(() => {
          const body = document.body.innerText;
          // Check if there's new content after our question
          const hasNewContent = body.includes('事业') && (
            body.includes('施主') || body.includes('运势') || body.includes('发展') ||
            body.includes('工作') || body.includes('前途') || body.includes('贵人')
          );
          return { hasNewContent, bodyLen: body.length };
        });

        if (result.hasNewContent && result.bodyLen > 500) {
          followUpReceived = true;
          console.log(`[INFO] Follow-up response detected after ${i+1}s`);
          break;
        }

        if (i % 5 === 0) {
          console.log(`[INFO] Waiting for follow-up... ${i+1}s (body: ${result.bodyLen} chars)`);
        }
        await sleep(1000);
      }

      // Wait extra time for response to complete
      await sleep(10000);
      await screenshot(page, '09b-followup-response');

      if (!followUpReceived) {
        console.log('[WARN] Follow-up response may not have been detected');
      }
    } else {
      console.log('[FAIL] Could not find input element for follow-up question');
    }

    // ============================================================
    // STEP 10: Screenshot complete conversation state
    // ============================================================
    console.log('\n=== STEP 10: Full Conversation Screenshot ===');
    await sleep(3000);

    // Scroll to see full conversation
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);
    await screenshot(page, '10-full-conversation');

    // Also scroll to top to capture everything
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await screenshot(page, '10b-conversation-top');

    // ============================================================
    // STEP 11: Fortune Slip generation
    // ============================================================
    console.log('\n=== STEP 11: Fortune Slip (Qianwen) ===');

    // Look for fortune slip button
    const qianwenBtn = await page.$('button:has-text("签文")')
      || await page.$('button:has-text("求签")')
      || await page.$('button:has-text("生成签文")')
      || await page.$('[class*="qian"]')
      || await page.$('[class*="slip"]')
      || await page.$('[class*="fortune-slip"]');

    if (qianwenBtn) {
      const btnText = await qianwenBtn.textContent();
      console.log(`[INFO] Found fortune slip button: "${btnText.trim()}"`);
      await qianwenBtn.click();
      await sleep(3000);
      await screenshot(page, '11-fortune-slip');
    } else {
      console.log('[WARN] Fortune slip button not found. Searching more broadly...');
      // Look through all buttons
      const allBtns = await page.$$('button');
      for (const btn of allBtns) {
        const text = await btn.textContent();
        if (text.includes('签') || text.includes('slip') || text.includes('卦')) {
          console.log(`[INFO] Found potential button: "${text.trim()}"`);
          await btn.click();
          await sleep(3000);
          await screenshot(page, '11-fortune-slip');
          break;
        }
      }
    }

    // ============================================================
    // STEP 12: Switch between 3 styles (Ink Gold, Vermilion, Ink Wash)
    // ============================================================
    console.log('\n=== STEP 12: Switch Fortune Slip Styles ===');

    const styleNames = ['墨金', '朱砂', '水墨'];

    for (const styleName of styleNames) {
      const styleBtn = await page.$(`button:has-text("${styleName}")`)
        || await page.$(`[class*="${styleName}"]`)
        || await page.$(`text=${styleName}`);

      if (styleBtn) {
        await styleBtn.click();
        await sleep(1500);
        const screenshotName = `12-style-${styleName}`;
        await screenshot(page, screenshotName);
        console.log(`[INFO] Switched to style: ${styleName}`);
      } else {
        console.log(`[WARN] Style button "${styleName}" not found`);

        // Try to find by aria-label or data attribute
        const altBtn = await page.$(`[aria-label*="${styleName}"]`) || await page.$(`[data-style*="${styleName}"]`);
        if (altBtn) {
          await altBtn.click();
          await sleep(1500);
          await screenshot(page, `12-style-${styleName}`);
          console.log(`[INFO] Found and clicked style via alt selector: ${styleName}`);
        }
      }
    }

    // If individual style buttons weren't found, look for a style switcher/tabs
    const styleTabs = await page.$$('[class*="tab"], [class*="style"], [role="tab"]');
    if (styleTabs.length >= 3 && !styleNames.some(async s => await page.$(`button:has-text("${s}")`))) {
      console.log(`[INFO] Found ${styleTabs.length} tab-like elements, trying sequential clicks`);
      for (let i = 0; i < Math.min(styleTabs.length, 3); i++) {
        try {
          await styleTabs[i].click();
          await sleep(1500);
          await screenshot(page, `12-style-tab-${i+1}`);
          const tabText = await styleTabs[i].textContent();
          console.log(`[INFO] Clicked tab #${i+1}: "${tabText.trim()}"`);
        } catch (e) {
          console.log(`[WARN] Could not click tab #${i+1}`);
        }
      }
    }

    // ============================================================
    // STEP 13: Check console errors
    // ============================================================
    console.log('\n=== STEP 13: Console Log Summary ===');
    console.log(`[INFO] Total console errors: ${consoleErrors.length}`);
    console.log(`[INFO] Total console warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n--- Console Errors ---');
      for (const err of consoleErrors) {
        console.log(`  [ERROR] ${err.text.substring(0, 200)} (at ${err.url})`);
      }
    }

    if (consoleWarnings.length > 0) {
      console.log('\n--- Console Warnings ---');
      for (const warn of consoleWarnings.slice(0, 10)) {
        console.log(`  [WARN] ${warn.text.substring(0, 200)}`);
      }
    }

    // Final summary
    console.log('\n========================================');
    console.log('         TEST EXECUTION SUMMARY');
    console.log('========================================');
    console.log(`Homepage loaded: YES`);
    console.log(`Birth details selected: year=${yearSet}, month=${monthSet}, day=${daySet}, hour=${hourSet}, gender=${genderSet}`);
    console.log(`Bazi displayed: ${baziText.hasBazi} (found: ${baziText.found.join(', ')})`);
    console.log(`Chat page reached: ${onChatPage}`);
    console.log(`AI response received: ${aiResponseReceived}`);
    console.log(`Fortune cards found: ${fortuneCards.hasCards} (${fortuneCards.cardCount} elements)`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Console warnings: ${consoleWarnings.length}`);
    console.log(`Screenshots saved: ${fs.readdirSync(SCREENSHOT_DIR).filter(f => f.startsWith('0') || f.startsWith('1')).length}`);
    console.log('========================================');

  } catch (error) {
    console.error(`[FATAL] Test error: ${error.message}`);
    console.error(error.stack);
    await screenshot(page, 'error-state').catch(() => {});
  } finally {
    await browser.close();
  }
})();
