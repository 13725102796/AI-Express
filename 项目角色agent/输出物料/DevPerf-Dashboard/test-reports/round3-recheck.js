const pw = require('/Users/maidong/.npm/_npx/b229ae5a79c0ddcd/node_modules/playwright-core');

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots/round3';
const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = { email: 'admin@jasonqiyuan.com', password: 'Admin123!' };

function log(msg) { console.log(`[TEST] ${msg}`); }

(async () => {
  const browser = await pw.chromium.launch({
    headless: true,
    executablePath: '/Users/maidong/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US'
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), url: page.url() });
    }
  });

  async function screenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    log(`Screenshot: ${name}.png`);
  }

  // ============================================================
  // LOGIN WITH PROPER WAIT
  // ============================================================
  log('=== LOGIN ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  // Find form fields
  const emailInput = await page.$('input[type="email"]') || await page.$('input[placeholder*="email" i]');
  const passwordInput = await page.$('input[type="password"]') || await page.$('input[placeholder*="password" i]');

  if (emailInput && passwordInput) {
    await emailInput.click();
    await emailInput.fill(CREDENTIALS.email);
    await passwordInput.click();
    await passwordInput.fill(CREDENTIALS.password);
    await page.waitForTimeout(500);

    // Click submit and wait for navigation
    const submitBtn = await page.$('button[type="submit"]') || await page.$('button:not([disabled])');

    if (submitBtn) {
      // Use Promise.all for click + navigation
      await Promise.all([
        page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(e => log(`Nav timeout: ${e.message.substring(0, 100)}`)),
        submitBtn.click()
      ]);
      await page.waitForTimeout(2000);
    }
  }

  const afterLoginUrl = page.url();
  log(`After login: ${afterLoginUrl}`);

  if (afterLoginUrl.includes('/login')) {
    // Try API-based login
    log('Form login failed, trying API approach...');

    const loginResult = await page.evaluate(async (creds) => {
      try {
        const resp = await fetch('http://localhost:3200/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: creds.email, password: creds.password })
        });
        const data = await resp.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('access_token', data.token);
          // Also try setting in sessionStorage
          sessionStorage.setItem('token', data.token);
          return { success: true, token: data.token.substring(0, 20) + '...' };
        }
        return { success: false, data: JSON.stringify(data).substring(0, 200) };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, CREDENTIALS);

    log(`API login result: ${JSON.stringify(loginResult)}`);

    if (loginResult.success) {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      log(`After API login nav: ${page.url()}`);
    }
  }

  // Check if we're still on login
  if (page.url().includes('/login')) {
    log('CRITICAL: Cannot log in. Checking backend auth endpoint...');

    // Check backend directly
    const healthCheck = await page.evaluate(async () => {
      try {
        const resp = await fetch('http://localhost:3200/api/health');
        return await resp.text();
      } catch (e) {
        return `Error: ${e.message}`;
      }
    });
    log(`Backend health: ${healthCheck}`);

    // Try the login endpoint to see what it returns
    const loginCheck = await page.evaluate(async (creds) => {
      try {
        const resp = await fetch('http://localhost:3200/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: creds.email, password: creds.password })
        });
        const text = await resp.text();
        return { status: resp.status, body: text.substring(0, 500) };
      } catch (e) {
        return { error: e.message };
      }
    }, CREDENTIALS);
    log(`Login endpoint response: ${JSON.stringify(loginCheck)}`);

    // Check what storage keys exist
    const storageKeys = await page.evaluate(() => {
      const ls = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        ls[key] = localStorage.getItem(key).substring(0, 50);
      }
      return ls;
    });
    log(`LocalStorage keys: ${JSON.stringify(storageKeys)}`);
  }

  await screenshot('00-login-final-state');

  // Even if login failed via form, let's check if the first test script's login actually worked
  // (it redirected to /) and what happens when we navigate directly to pages

  // Let's check the page markup to understand the login form better
  const pageInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      forms: document.querySelectorAll('form').length,
      inputs: Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        id: i.id
      })),
      buttons: Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        type: b.type,
        disabled: b.disabled,
        className: b.className.substring(0, 60)
      }))
    };
  });
  log(`Page info: ${JSON.stringify(pageInfo, null, 2)}`);

  await browser.close();
})();
