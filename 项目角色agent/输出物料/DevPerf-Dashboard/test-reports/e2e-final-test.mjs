import { chromium } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';
let idx = 300;

function log(msg) { console.log(`[FINAL] ${msg}`); }

async function ss(page, name) {
  idx++;
  const fn = `${String(idx).padStart(3, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fn), fullPage: true });
  log(`Screenshot: ${fn}`);
  return fn;
}

async function loginWithNaiveUI(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

  // For Naive UI NInput: click the inner input element, then type character by character
  const emailInput = await page.$('input[placeholder="Enter your email"]');
  const passInput = await page.$('input[placeholder="Enter your password"]');

  if (!emailInput || !passInput) {
    log('ERROR: Could not find email/password inputs');
    return false;
  }

  // Click and type email character by character
  await emailInput.click();
  await page.keyboard.type('admin@jasonqiyuan.com', { delay: 20 });
  await page.waitForTimeout(300);

  // Click and type password
  await passInput.click();
  await page.keyboard.type('Admin123!', { delay: 20 });
  await page.waitForTimeout(300);

  // Check if button is now enabled
  const btnDisabled = await page.evaluate(() => {
    const btn = document.querySelector('.n-button--primary-type');
    return btn?.disabled;
  });
  log(`Sign-in button disabled after typing: ${btnDisabled}`);

  if (btnDisabled) {
    log('Button still disabled, trying to set Vue state directly');
    await page.evaluate(() => {
      // Force enable by dispatching events
      const emailEl = document.querySelector('input[placeholder="Enter your email"]');
      const passEl = document.querySelector('input[placeholder="Enter your password"]');
      if (emailEl) {
        emailEl.value = 'admin@jasonqiyuan.com';
        emailEl.dispatchEvent(new Event('input', { bubbles: true }));
        emailEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (passEl) {
        passEl.value = 'Admin123!';
        passEl.dispatchEvent(new Event('input', { bubbles: true }));
        passEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(500);
  }

  await ss(page, 'login-filled');

  // Click Sign in button
  const signInBtn = await page.$('.n-button--primary-type');
  if (signInBtn) {
    try {
      await signInBtn.click({ timeout: 5000, force: true });
    } catch (e) {
      log('Button click failed, trying form submit');
      await page.keyboard.press('Enter');
    }
  } else {
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  const url = page.url();
  log(`After login URL: ${url}`);
  return !url.includes('/login');
}

async function run() {
  log('=== FINAL E2E TEST - SPA Navigation with Naive UI login ===');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon') && !t.includes('DevTools')) consoleErrors.push(t);
    }
  });

  // ==================== LOGIN ====================
  log('=========== 1. LOGIN ===========');
  const loginOk = await loginWithNaiveUI(page);
  const ssLogin = await ss(page, 'after-login');

  if (!loginOk) {
    log('Login failed. Checking if already on dashboard via token injection...');
    // Alternative: inject token via localStorage and reload
    const loginResp = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3200/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@jasonqiyuan.com', password: 'Admin123!' })
      });
      const data = await resp.json();
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('devperf_token', data.data.token);
        return { success: true, token: data.data.token.substring(0, 30) + '...' };
      }
      return { success: false, error: JSON.stringify(data) };
    });
    log(`API login result: ${JSON.stringify(loginResp)}`);

    if (loginResp.success) {
      // Check how the auth store keeps the token
      const storeKey = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys;
      });
      log(`localStorage keys: ${JSON.stringify(storeKey)}`);

      // Navigate to root after setting token
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(3000);
      log(`After token injection URL: ${page.url()}`);
      const ssInjected = await ss(page, 'after-token-injection');

      if (page.url().includes('/login')) {
        // The app likely uses a different storage key or Pinia store
        // Let's check the auth store in the Pinia
        log('Token injection via localStorage did not work. Checking Pinia store approach...');
        // Go to login and actually login by typing
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 10000 });

        // Try clearing and slowly filling
        const emailEl = await page.$('input[placeholder="Enter your email"]');
        if (emailEl) {
          await emailEl.click({ clickCount: 3 }); // select all
          await page.keyboard.press('Backspace');
          await page.waitForTimeout(100);
          await page.keyboard.type('admin@jasonqiyuan.com', { delay: 50 });
        }

        await page.waitForTimeout(200);

        const passEl = await page.$('input[placeholder="Enter your password"]');
        if (passEl) {
          await passEl.click({ clickCount: 3 });
          await page.keyboard.press('Backspace');
          await page.waitForTimeout(100);
          await page.keyboard.type('Admin123!', { delay: 50 });
        }

        await page.waitForTimeout(500);
        await ss(page, 'login-slow-type');

        // Now check button state
        const btnState = await page.evaluate(() => {
          const btn = document.querySelector('.n-button--primary-type');
          return { disabled: btn?.disabled, text: btn?.textContent?.trim() };
        });
        log(`Button state after slow type: ${JSON.stringify(btnState)}`);

        if (!btnState.disabled) {
          await page.click('.n-button--primary-type');
          await page.waitForTimeout(5000);
          log(`After slow login URL: ${page.url()}`);
          await ss(page, 'after-slow-login');
        } else {
          // Force click
          log('Forcing click on disabled button...');
          await page.click('.n-button--primary-type', { force: true });
          await page.waitForTimeout(5000);
          log(`After forced click URL: ${page.url()}`);
          await ss(page, 'after-forced-login');
        }
      }
    }
  }

  // At this point either login worked or we need to check
  const currentUrl = page.url();
  log(`=== Current URL: ${currentUrl} ===`);

  if (currentUrl.includes('/login')) {
    log('CRITICAL: Cannot log in. Taking final screenshot and aborting.');
    await ss(page, 'login-failed-final');
    await browser.close();
    return;
  }

  // ==================== OVERVIEW ====================
  log('=========== 2. OVERVIEW ===========');
  await page.waitForTimeout(2000);
  const ssOverview = await ss(page, 'overview-desktop-top');

  const overviewText = await page.evaluate(() => document.body.innerText);
  log(`Overview text length: ${overviewText.length}`);
  log(`Has Avatar: ${overviewText.includes('Avatar')}`);
  log(`Has AirFlow: ${overviewText.includes('AirFlow')}`);
  log(`Has DataHub: ${overviewText.includes('DataHub')}`);
  log(`Has OKR: ${overviewText.includes('OKR')}`);
  log(`Has Sprint: ${overviewText.includes('Sprint')}`);

  const chartCount = await page.evaluate(() => ({
    canvas: document.querySelectorAll('canvas').length,
    svg: document.querySelectorAll('svg').length,
    recharts: document.querySelectorAll('[class*="recharts"]').length,
    echart: document.querySelectorAll('[class*="chart"]').length
  }));
  log(`Charts: ${JSON.stringify(chartCount)}`);

  // Scroll to see all 6 panels
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(500);
  await ss(page, 'overview-desktop-mid');

  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);
  await ss(page, 'overview-desktop-bottom');

  // ==================== OKR PAGE (via sidebar) ====================
  log('=========== 3. OKR PAGE ===========');
  await page.click('a[href*="okr"], [class*="sidebar"] a:has-text("OKR")', { timeout: 5000 }).catch(async () => {
    // Try text-based selector
    const links = await page.$$('a');
    for (const l of links) {
      const t = await l.textContent().catch(() => '');
      if (t.trim() === 'OKR') { await l.click(); break; }
    }
  });
  await page.waitForTimeout(3000);
  const ssOkr = await ss(page, 'okr-page');
  log(`OKR URL: ${page.url()}`);

  const okrText = await page.evaluate(() => document.body.innerText);
  log(`OKR has 交付效率: ${okrText.includes('交付效率')}`);
  log(`OKR has 代码质量: ${okrText.includes('代码质量')}`);
  log(`OKR has DataHub: ${okrText.includes('DataHub')}`);
  log(`OKR has 68%: ${okrText.includes('68')}`);
  log(`OKR has 55%: ${okrText.includes('55')}`);
  log(`OKR has 42%: ${okrText.includes('42')}`);

  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await ss(page, 'okr-page-bottom');

  // ==================== GIT ACTIVITY (via sidebar) ====================
  log('=========== 4. GIT ACTIVITY ===========');
  const gitClicked = await page.click('a[href*="git"], [class*="sidebar"] a:has-text("Git")', { timeout: 5000 }).then(() => true).catch(async () => {
    const links = await page.$$('a');
    for (const l of links) {
      const t = await l.textContent().catch(() => '');
      if (t.includes('Git')) { await l.click(); return true; }
    }
    return false;
  });
  await page.waitForTimeout(3000);
  const ssGit = await ss(page, 'git-activity-page');
  log(`Git URL: ${page.url()}`);

  const gitText = await page.evaluate(() => document.body.innerText);
  log(`Git has 119: ${gitText.includes('119')}`);
  log(`Git has 116: ${gitText.includes('116')}`);
  log(`Git has Heatmap: ${gitText.includes('Heatmap') || gitText.includes('heatmap')}`);
  log(`Git has PR: ${gitText.includes('PR')}`);
  log(`Git has Merge Time: ${gitText.includes('39.6') || gitText.includes('Merge')}`);

  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);
  await ss(page, 'git-activity-bottom');

  // ==================== ADMIN (via sidebar) ====================
  log('=========== 5. ADMIN ===========');
  await page.click('a[href*="admin"], [class*="sidebar"] a:has-text("Admin")', { timeout: 5000 }).catch(async () => {
    const links = await page.$$('a');
    for (const l of links) {
      const t = await l.textContent().catch(() => '');
      if (t.includes('Admin')) { await l.click(); break; }
    }
  });
  await page.waitForTimeout(3000);
  const ssAdmin = await ss(page, 'admin-users-tab');
  log(`Admin URL: ${page.url()}`);

  const adminText = await page.evaluate(() => document.body.innerText);
  log(`Admin has 李明: ${adminText.includes('李明')}`);
  log(`Admin has 陈强: ${adminText.includes('陈强')}`);
  log(`Admin has admin role: ${adminText.includes('admin')}`);
  log(`Admin has manager: ${adminText.includes('manager')}`);

  // Click Author Mapping tab
  log('--- Author Mapping tab ---');
  const amTab = await page.$('button:has-text("Author Mapping"), a:has-text("Author Mapping"), [class*="tab"]:has-text("Author")');
  if (amTab) {
    await amTab.click();
    await page.waitForTimeout(2000);
    await ss(page, 'admin-author-mapping-tab');
    const amText = await page.evaluate(() => document.body.innerText);
    log(`Author Mapping has chenqiang: ${amText.includes('chenqiang')}`);
    log(`Author Mapping has liming: ${amText.includes('liming')}`);
  } else {
    log('Author Mapping tab not found, trying text match');
    const allBtns = await page.$$('button, a, div[role="tab"]');
    for (const b of allBtns) {
      const t = await b.textContent().catch(() => '');
      if (t.includes('Author') || t.includes('映射')) {
        log(`Found tab with text: "${t.trim()}"`);
        await b.click();
        await page.waitForTimeout(2000);
        await ss(page, 'admin-author-mapping-clicked');
        break;
      }
    }
  }

  // Click Sync Logs tab
  log('--- Sync Logs tab ---');
  const slTab = await page.$('button:has-text("Sync Logs"), a:has-text("Sync Logs"), [class*="tab"]:has-text("Sync")');
  if (slTab) {
    await slTab.click();
    await page.waitForTimeout(2000);
    await ss(page, 'admin-sync-logs-tab');
    const slText = await page.evaluate(() => document.body.innerText);
    log(`Sync Logs has success: ${slText.includes('success')}`);
    log(`Sync Logs has error: ${slText.includes('error')}`);
  } else {
    const allBtns = await page.$$('button, a, div[role="tab"]');
    for (const b of allBtns) {
      const t = await b.textContent().catch(() => '');
      if (t.includes('Sync') || t.includes('同步')) {
        log(`Found tab with text: "${t.trim()}"`);
        await b.click();
        await page.waitForTimeout(2000);
        await ss(page, 'admin-sync-logs-clicked');
        break;
      }
    }
  }

  // ==================== PROJECT DETAIL ====================
  log('=========== 6. PROJECT DETAIL ===========');
  // Navigate back to overview first
  await page.click('a[href*="overview"], a[href="/"], a:has-text("Overview")', { timeout: 5000 }).catch(async () => {
    const links = await page.$$('a');
    for (const l of links) {
      const t = await l.textContent().catch(() => '');
      if (t.trim() === 'Overview') { await l.click(); break; }
    }
  });
  await page.waitForTimeout(3000);

  // Find a project link
  const projLink = await page.$('a[href*="projects/p-avatar"], a:has-text("AVATAR"), [class*="project"] a:first-child');
  if (projLink) {
    await projLink.click();
    await page.waitForTimeout(3000);
    const ssProj = await ss(page, 'project-avatar-detail');
    log(`Project URL: ${page.url()}`);

    const projText = await page.evaluate(() => document.body.innerText);
    log(`Project has Avatar: ${projText.includes('Avatar')}`);
    log(`Project has Burndown: ${projText.includes('Burndown') || projText.includes('燃尽')}`);
    log(`Project has Milestone: ${projText.includes('里程碑') || projText.includes('Milestone') || projText.includes('MVP')}`);
    log(`Project has 陈强: ${projText.includes('陈强')}`);

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await ss(page, 'project-avatar-bottom');
  } else {
    log('No project link found on overview page, trying direct navigation...');
    // Since SPA might handle route without reload if token is in memory
    const navResult = await page.evaluate(async () => {
      const router = window.__vue_app__?.config?.globalProperties?.$router;
      if (router) {
        await router.push('/projects/p-avatar');
        return 'navigated';
      }
      return 'no-router';
    });
    log(`Vue router navigation: ${navResult}`);
    if (navResult === 'navigated') {
      await page.waitForTimeout(3000);
      await ss(page, 'project-avatar-via-router');
    }
  }

  // ==================== MEMBER DETAIL ====================
  log('=========== 7. MEMBER DETAIL ===========');
  // Try to find a member link on the project page or navigate
  const memberLink = await page.$('a[href*="members/u-dev-1"], a:has-text("陈强"), td a:has-text("陈强")');
  if (memberLink) {
    await memberLink.click();
    await page.waitForTimeout(3000);
    const ssMember = await ss(page, 'member-chenqiang');
    log(`Member URL: ${page.url()}`);
  } else {
    log('No member link found, trying Vue router...');
    await page.evaluate(async () => {
      const app = document.querySelector('#app')?.__vue_app__;
      const router = app?.config?.globalProperties?.$router;
      if (router) {
        await router.push('/members/u-dev-1');
      }
    });
    await page.waitForTimeout(3000);
    await ss(page, 'member-via-router');
    log(`Member URL: ${page.url()}`);
  }

  const memberText = await page.evaluate(() => document.body.innerText);
  log(`Member has 陈强: ${memberText.includes('陈强')}`);
  log(`Member has Sprint: ${memberText.includes('Sprint')}`);
  log(`Member has tasks: ${memberText.includes('任务') || memberText.includes('Task') || memberText.includes('Current')}`);

  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await ss(page, 'member-bottom');

  // ==================== FILTER TEST ====================
  log('=========== 8. FILTER TEST ===========');
  // Go to overview
  await page.click('a:has-text("Overview")', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const filterInfo = await page.evaluate(() => {
    const selects = document.querySelectorAll('select, .n-select');
    const inputs = document.querySelectorAll('input[type="search"]');
    const nSelect = document.querySelectorAll('.n-base-selection');
    return { selects: selects.length, searchInputs: inputs.length, nSelects: nSelect.length };
  });
  log(`Filter elements: ${JSON.stringify(filterInfo)}`);

  if (filterInfo.nSelects > 0) {
    await page.click('.n-base-selection', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await ss(page, 'filter-dropdown-open');
  } else if (filterInfo.selects > 0) {
    await page.click('select', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await ss(page, 'filter-select-open');
  }
  await ss(page, 'overview-filter-state');

  // ==================== MOBILE RESPONSIVE ====================
  log('=========== 9. MOBILE RESPONSIVE ===========');
  // Stay on current page, just resize
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(2000);
  await ss(page, 'mobile-current-page');

  // Navigate to OKR in mobile
  const okrMobile = await page.$('a:has-text("OKR")');
  if (okrMobile) {
    const visible = await okrMobile.isVisible();
    if (visible) {
      await okrMobile.click();
      await page.waitForTimeout(2000);
      await ss(page, 'mobile-okr');
    } else {
      // Look for hamburger
      const hamBtn = await page.$('[class*="hamburger"], [class*="toggle"], button svg, [class*="sidebar-collapse"]');
      if (hamBtn) {
        await hamBtn.click();
        await page.waitForTimeout(1000);
        await ss(page, 'mobile-hamburger-open');
        const okrLink2 = await page.$('a:has-text("OKR")');
        if (okrLink2) {
          await okrLink2.click();
          await page.waitForTimeout(2000);
          await ss(page, 'mobile-okr');
        }
      }
    }
  }

  // Admin mobile
  const adminMobile = await page.$('a:has-text("Admin")');
  if (adminMobile && await adminMobile.isVisible().catch(() => false)) {
    await adminMobile.click();
    await page.waitForTimeout(2000);
    await ss(page, 'mobile-admin');
  }

  // Git mobile
  const gitMobile = await page.$('a:has-text("Git")');
  if (gitMobile && await gitMobile.isVisible().catch(() => false)) {
    await gitMobile.click();
    await page.waitForTimeout(2000);
    await ss(page, 'mobile-git');
  }

  // Reset
  await page.setViewportSize({ width: 1440, height: 900 });

  // ==================== CONSOLE ERROR SUMMARY ====================
  log('=========== CONSOLE ERRORS ===========');
  log(`Total errors: ${consoleErrors.length}`);
  consoleErrors.slice(0, 20).forEach((e, i) => log(`  [${i+1}] ${e.substring(0, 300)}`));

  await browser.close();
  log('=== ALL TESTS COMPLETE ===');
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
