import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/算命App/test-reports/screenshots/round3';
const FRONTEND_URL = 'http://localhost:3002';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let consoleErrors = [];

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[SCREENSHOT] ${name}.png saved`);
  return filePath;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: page.url() });
  });
  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, url: page.url() });
  });

  try {
    // ============================================================
    // DETAIL TEST A: Full flow with proper wait for follow-up
    // ============================================================
    console.log('\n=== DETAIL A: Navigate to homepage and set birth details ===');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1500);

    // Select 1990, June, 15th, Wu hour
    const selects = await page.$$('select');
    for (const sel of selects) {
      const options = await sel.evaluate(el => Array.from(el.options).map(o => ({ value: o.value, text: o.textContent.trim() })));
      const optTexts = options.map(o => o.text).join(',');

      if (optTexts.includes('1990')) {
        const opt = options.find(o => o.text.includes('1990'));
        if (opt) await sel.selectOption(opt.value);
      } else if (optTexts.includes('六月') || optTexts.includes('6月')) {
        const opt = options.find(o => o.text.includes('六月') || o.text.includes('6月'));
        if (opt) await sel.selectOption(opt.value);
      } else if (optTexts.includes('十五')) {
        const opt = options.find(o => o.text.includes('十五'));
        if (opt) await sel.selectOption(opt.value);
      } else if (optTexts.includes('午时')) {
        const opt = options.find(o => o.text.includes('午时'));
        if (opt) await sel.selectOption(opt.value);
      }
    }

    // Select male gender
    const maleEl = await page.$('text=男');
    if (maleEl) await maleEl.click();
    await sleep(500);

    // Click start
    const startBtn = await page.$('button:has-text("开始算命")');
    if (startBtn) {
      await startBtn.click();
      console.log('[INFO] Clicked start');
    }

    // Wait for chat page
    for (let i = 0; i < 10; i++) {
      if (page.url().includes('/chat')) break;
      await sleep(1000);
    }
    console.log(`[INFO] URL: ${page.url()}`);

    // ============================================================
    // DETAIL B: Wait for COMPLETE initial AI response
    // ============================================================
    console.log('\n=== DETAIL B: Wait for complete AI response ===');

    let prevLen = 0;
    let stableCount = 0;

    for (let i = 0; i < 90; i++) {
      const bodyLen = await page.evaluate(() => document.body.innerText.length);

      if (bodyLen > prevLen) {
        stableCount = 0;
        if (i % 5 === 0) console.log(`[INFO] Response growing... ${bodyLen} chars at ${i}s`);
      } else if (bodyLen > 200) {
        stableCount++;
        if (stableCount >= 5) {
          console.log(`[INFO] Response stabilized at ${bodyLen} chars after ${i}s`);
          break;
        }
      }
      prevLen = bodyLen;
      await sleep(1000);
    }

    await screenshot(page, 'detail-01-full-ai-response');

    // ============================================================
    // DETAIL C: Check five dimension cards structure
    // ============================================================
    console.log('\n=== DETAIL C: Examine dimension cards ===');

    const cardInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      const dimensions = ['总体运势', '性格分析', '事业运', '感情运', '财运'];
      const results = {};

      for (const dim of dimensions) {
        results[dim] = body.includes(dim);
      }

      // Look for all section-like elements containing dimension text
      const allEls = document.querySelectorAll('div, section, article, details, summary');
      const sectionInfo = [];
      for (const el of allEls) {
        const ownText = el.childNodes[0]?.textContent?.trim() || '';
        if (dimensions.some(d => ownText.includes(d))) {
          sectionInfo.push({
            tag: el.tagName,
            class: el.className?.toString().substring(0, 60) || '',
            text: ownText.substring(0, 50),
            clickable: el.onclick !== null || el.getAttribute('role') === 'button' || el.tagName === 'SUMMARY' || el.tagName === 'DETAILS',
            childCount: el.children.length
          });
        }
      }

      return { dimensions: results, sections: sectionInfo };
    });

    console.log(`[INFO] Dimension presence: ${JSON.stringify(cardInfo.dimensions)}`);
    console.log(`[INFO] Section elements found: ${cardInfo.sections.length}`);
    for (const s of cardInfo.sections) {
      console.log(`  [SECTION] <${s.tag}> class="${s.class}" text="${s.text}" clickable=${s.clickable}`);
    }

    // Try clicking on each dimension heading
    const dimLabels = ['总体运势', '性格分析', '事业运', '感情运', '财运'];
    for (const label of dimLabels) {
      try {
        const el = await page.$(`text=${label}`);
        if (el) {
          await el.click();
          await sleep(800);
          console.log(`[INFO] Clicked "${label}" - checking expansion`);
        }
      } catch (e) {
        console.log(`[WARN] Could not click "${label}": ${e.message}`);
      }
    }
    await screenshot(page, 'detail-02-cards-after-click');

    // ============================================================
    // DETAIL D: Scroll to bottom, verify five dimension card details
    // ============================================================
    console.log('\n=== DETAIL D: Scroll through full content ===');

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await screenshot(page, 'detail-03-scroll-top');

    // Scroll down in steps
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`[INFO] Total page height: ${totalHeight}px`);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await sleep(500);
    await screenshot(page, 'detail-04-scroll-mid');

    await page.evaluate(() => window.scrollTo(0, (document.body.scrollHeight * 2) / 3));
    await sleep(500);
    await screenshot(page, 'detail-05-scroll-lower');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(500);
    await screenshot(page, 'detail-06-scroll-bottom');

    // ============================================================
    // DETAIL E: Follow-up question with proper wait
    // ============================================================
    console.log('\n=== DETAIL E: Follow-up question with full wait ===');

    // Record body length before question
    const bodyLenBefore = await page.evaluate(() => document.body.innerText.length);
    console.log(`[INFO] Body length before follow-up: ${bodyLenBefore}`);

    const textarea = await page.$('textarea') || await page.$('input[type="text"]');
    if (textarea) {
      await textarea.click();
      await textarea.fill('我的事业运势如何？');
      await sleep(300);

      // Try send button first, then Enter
      const sendBtn = await page.$('button:has-text("发送")') || await page.$('[class*="send"] button') || await page.$('button[type="submit"]');
      if (sendBtn) {
        await sendBtn.click();
        console.log('[INFO] Clicked send button');
      } else {
        await textarea.press('Enter');
        console.log('[INFO] Pressed Enter');
      }

      // Wait for new content to appear
      let followUpLen = bodyLenBefore;
      let followUpStable = 0;

      for (let i = 0; i < 75; i++) {
        const currentLen = await page.evaluate(() => document.body.innerText.length);

        if (currentLen > followUpLen) {
          followUpStable = 0;
          followUpLen = currentLen;
          if (i % 5 === 0) console.log(`[INFO] Follow-up growing... ${currentLen} chars (+${currentLen - bodyLenBefore}) at ${i}s`);
        } else if (currentLen > bodyLenBefore + 50) {
          followUpStable++;
          if (followUpStable >= 5) {
            console.log(`[INFO] Follow-up stabilized at ${currentLen} chars (+${currentLen - bodyLenBefore}) after ${i}s`);
            break;
          }
        }
        await sleep(1000);
      }

      await screenshot(page, 'detail-07-followup-complete');

      // Get the follow-up response text
      const followUpText = await page.evaluate(() => {
        const body = document.body.innerText;
        // Find text after the user's question
        const idx = body.lastIndexOf('我的事业运势如何');
        if (idx > -1) {
          return body.substring(idx).substring(0, 500);
        }
        return body.substring(body.length - 500);
      });
      console.log(`[INFO] Follow-up response text: ${followUpText.substring(0, 300)}`);
    }

    // Scroll to see the full follow-up
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(500);
    await screenshot(page, 'detail-08-followup-scrolled');

    // ============================================================
    // DETAIL F: Verify round counter
    // ============================================================
    console.log('\n=== DETAIL F: Check round counter ===');
    const roundInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      const roundMatch = body.match(/第\s*(\d+)\s*[/／]\s*(\d+)\s*轮/);
      return roundMatch ? { current: roundMatch[1], total: roundMatch[2], full: roundMatch[0] } : null;
    });
    console.log(`[INFO] Round counter: ${roundInfo ? JSON.stringify(roundInfo) : 'not found'}`);

    // ============================================================
    // DETAIL G: Check bottom navigation tabs
    // ============================================================
    console.log('\n=== DETAIL G: Bottom navigation tabs ===');
    const navTabs = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabLabels = ['事业运详解', '感情运如何', '今年财运', '健康建议'];
      const found = {};
      for (const label of tabLabels) {
        const btn = buttons.find(b => b.textContent.includes(label));
        found[label] = !!btn;
      }
      return found;
    });
    console.log(`[INFO] Quick-ask tabs: ${JSON.stringify(navTabs)}`);

    // Click one of the quick-ask tabs
    const quickAskBtn = await page.$('button:has-text("今年财运")');
    if (quickAskBtn) {
      await quickAskBtn.click();
      console.log('[INFO] Clicked "今年财运" quick-ask tab');

      // Wait for response
      const prevBodyLen = await page.evaluate(() => document.body.innerText.length);
      for (let i = 0; i < 60; i++) {
        const len = await page.evaluate(() => document.body.innerText.length);
        if (len > prevBodyLen + 100) {
          console.log(`[INFO] Quick-ask response growing at ${i}s, len=${len}`);
          // Wait for stabilization
          let stable = 0;
          let lastLen = len;
          for (let j = 0; j < 60; j++) {
            await sleep(1000);
            const newLen = await page.evaluate(() => document.body.innerText.length);
            if (newLen === lastLen) {
              stable++;
              if (stable >= 5) {
                console.log(`[INFO] Quick-ask response stabilized at ${newLen} chars`);
                break;
              }
            } else {
              stable = 0;
              lastLen = newLen;
            }
          }
          break;
        }
        await sleep(1000);
      }
      await screenshot(page, 'detail-09-quickask-response');
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n========================================');
    console.log('     DETAIL TEST SUMMARY');
    console.log('========================================');
    console.log(`Console errors: ${consoleErrors.length}`);
    for (const e of consoleErrors) {
      console.log(`  [ERROR] ${e.text.substring(0, 150)}`);
    }
    console.log('========================================');

  } catch (error) {
    console.error(`[FATAL] ${error.message}`);
    console.error(error.stack);
    await screenshot(page, 'detail-error').catch(() => {});
  } finally {
    await browser.close();
  }
})();
