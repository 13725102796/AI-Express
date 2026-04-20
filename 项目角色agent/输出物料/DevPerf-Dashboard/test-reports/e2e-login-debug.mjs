import { chromium } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';

function log(msg) { console.log(`[DEBUG] ${msg}`); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture all network requests
  const apiCalls = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) apiCalls.push({ method: req.method(), url: req.url() });
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/')) log(`API Response: ${resp.status()} ${resp.url()}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') log(`CONSOLE ERROR: ${msg.text().substring(0, 200)}`);
  });

  // Navigate to login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  log(`URL: ${page.url()}`);

  // Debug: find all form elements
  const formInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const buttons = Array.from(document.querySelectorAll('button'));
    const forms = Array.from(document.querySelectorAll('form'));
    return {
      inputs: inputs.map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder, id: i.id, className: i.className.substring(0, 50) })),
      buttons: buttons.map(b => ({ type: b.type, text: b.textContent.trim(), className: b.className.substring(0, 50), disabled: b.disabled })),
      forms: forms.map(f => ({ action: f.action, method: f.method, id: f.id }))
    };
  });
  log(`Form info: ${JSON.stringify(formInfo, null, 2)}`);

  // Fill email
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.click();
    await emailInput.fill('admin@jasonqiyuan.com');
    log('Email filled');
  }

  // Fill password
  const passInput = await page.$('input[type="password"]');
  if (passInput) {
    await passInput.click();
    await passInput.fill('Admin123!');
    log('Password filled');
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '200-debug-login-filled.png') });

  // Try multiple submit strategies
  log('Trying button click...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    const btnText = await submitBtn.textContent();
    const btnDisabled = await submitBtn.isDisabled();
    log(`Submit button: text="${btnText}", disabled=${btnDisabled}`);

    // Try click
    await submitBtn.click();
    log('Button clicked');
  } else {
    log('No submit button found, trying other selectors...');
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await btn.textContent();
      log(`Button found: "${text.trim()}"`);
      if (text.includes('Sign') || text.includes('登录') || text.includes('Login')) {
        await btn.click();
        log(`Clicked button: "${text.trim()}"`);
        break;
      }
    }
  }

  // Wait and check
  await page.waitForTimeout(5000);
  log(`After click URL: ${page.url()}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '201-debug-after-submit.png') });

  // Check localStorage for token
  const storageData = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const items = {};
    keys.forEach(k => items[k] = localStorage.getItem(k)?.substring(0, 50));
    return items;
  });
  log(`localStorage: ${JSON.stringify(storageData)}`);

  // Check API calls made
  log(`API calls made: ${apiCalls.length}`);
  apiCalls.forEach(c => log(`  ${c.method} ${c.url}`));

  // If still on login, try a different approach - use page.waitForNavigation
  if (page.url().includes('/login')) {
    log('Still on login page. Trying form submit approach...');

    // Clear and refill
    const emailInput2 = await page.$('input[type="email"]');
    const passInput2 = await page.$('input[type="password"]');
    if (emailInput2) {
      await emailInput2.fill('');
      await emailInput2.fill('admin@jasonqiyuan.com');
    }
    if (passInput2) {
      await passInput2.fill('');
      await passInput2.fill('Admin123!');
    }

    // Try submitting the form directly
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(3000);
    log(`After form submit URL: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '202-debug-after-form-submit.png') });

    // Try pressing Enter
    if (page.url().includes('/login')) {
      log('Still on login. Trying Enter key...');
      const passInput3 = await page.$('input[type="password"]');
      if (passInput3) {
        await passInput3.focus();
        await passInput3.fill('Admin123!');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        log(`After Enter URL: ${page.url()}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '203-debug-after-enter.png') });
      }
    }

    // Check storage again
    const storageData2 = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const items = {};
      keys.forEach(k => items[k] = localStorage.getItem(k)?.substring(0, 100));
      return items;
    });
    log(`localStorage after retries: ${JSON.stringify(storageData2)}`);
  }

  // Final URL check
  log(`FINAL URL: ${page.url()}`);

  // If we made it past login, take screenshot
  if (!page.url().includes('/login')) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '204-debug-logged-in.png'), fullPage: true });
    log('Login succeeded!');
  } else {
    log('LOGIN FAILED after all attempts');
  }

  await browser.close();
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
