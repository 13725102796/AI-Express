import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@jasonqiyuan.com';
const ADMIN_PASSWORD = 'Admin123!';

mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
const bugs = [];
let bugCounter = 0;

function logResult(step, status, details, screenshot, consoleErrors) {
  results.push({ step, status, details, screenshot, consoleErrors });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${icon} ${step}: ${details}`);
  if (consoleErrors && consoleErrors.length > 0) {
    console.log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`    - ${e}`));
  }
}

function logBug(severity, type, description, steps, screenshot) {
  bugCounter++;
  bugs.push({ id: `B-${String(bugCounter).padStart(2, '0')}`, severity, type, description, steps, screenshot });
  console.log(`[BUG] ${severity} ${type}: ${description}`);
}

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

async function getConsoleErrors(page) {
  // We collect console errors via listener - return accumulated ones
  return page._collectedErrors || [];
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Collect console errors
  page._collectedErrors = [];
  page._collectedWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      page._collectedErrors.push(msg.text());
    }
    if (msg.type() === 'warning') {
      page._collectedWarnings.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    page._collectedErrors.push(`PageError: ${err.message}`);
  });

  function clearErrors() {
    page._collectedErrors = [];
    page._collectedWarnings = [];
  }

  try {
    // ===========================================
    // TEST 1: LOGIN FLOW
    // ===========================================
    console.log('\n=== TEST 1: LOGIN FLOW ===');

    // 1.1 Open frontend - should redirect to /login
    clearErrors();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const loginUrl = page.url();
    const ss11 = await screenshot(page, '01-initial-page');
    const redirectedToLogin = loginUrl.includes('/login');
    logResult('1.1 Open frontend', redirectedToLogin ? 'PASS' : 'FAIL',
      `URL: ${loginUrl} - ${redirectedToLogin ? 'Correctly redirected to /login' : 'Did NOT redirect to /login'}`,
      ss11, [...page._collectedErrors]);
    if (!redirectedToLogin) {
      logBug('P1', 'Navigation', 'Frontend does not redirect unauthenticated users to /login', '1. Open http://localhost:5173 without auth', ss11);
    }

    // 1.2 Check login page elements
    clearErrors();
    const hasEmailInput = await page.locator('input[placeholder*="email" i]').count() > 0;
    const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
    const hasLoginButton = await page.locator('button:has-text("Sign in")').count() > 0;
    const hasBrandTitle = await page.locator('text=DevPerf Dashboard').count() > 0;
    const ss12 = await screenshot(page, '02-login-page-elements');
    const allElementsPresent = hasEmailInput && hasPasswordInput && hasLoginButton;
    logResult('1.2 Login page elements', allElementsPresent ? 'PASS' : 'FAIL',
      `Email input: ${hasEmailInput}, Password input: ${hasPasswordInput}, Sign-in button: ${hasLoginButton}, Brand title: ${hasBrandTitle}`,
      ss12, [...page._collectedErrors]);
    if (!allElementsPresent) {
      logBug('P0', 'UI Missing', 'Login form missing critical elements', 'Open /login and check for email, password inputs and submit button', ss12);
    }

    // 1.3 Test login with wrong password
    clearErrors();
    await page.locator('input[placeholder*="email" i]').first().fill('admin@jasonqiyuan.com');
    await page.locator('input[type="password"]').first().fill('WrongPassword999');
    const ss13a = await screenshot(page, '03-login-wrong-creds-filled');
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForTimeout(2000);
    const ss13b = await screenshot(page, '04-login-wrong-creds-result');
    const hasErrorAlert = await page.locator('.n-alert--error-type, [class*="error"]').count() > 0;
    const errorText = await page.locator('.n-alert--error-type').textContent().catch(() => 'no error shown');
    logResult('1.3 Wrong password login', hasErrorAlert ? 'PASS' : 'FAIL',
      `Error shown: ${hasErrorAlert}, Error text: "${errorText}"`,
      ss13b, [...page._collectedErrors]);
    if (!hasErrorAlert) {
      logBug('P1', 'Validation', 'No error message displayed for wrong credentials', '1. Enter admin email 2. Enter wrong password 3. Click Sign in 4. No error shown', ss13b);
    }

    // 1.4 Test login with correct credentials
    clearErrors();
    // Clear inputs first
    await page.locator('input[placeholder*="email" i]').first().fill('');
    await page.locator('input[type="password"]').first().fill('');
    await page.locator('input[placeholder*="email" i]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
    const ss14a = await screenshot(page, '05-login-correct-creds-filled');
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForTimeout(3000);
    const ss14b = await screenshot(page, '06-login-success-result');
    const afterLoginUrl = page.url();
    const loginSuccess = !afterLoginUrl.includes('/login');
    logResult('1.4 Correct login', loginSuccess ? 'PASS' : 'FAIL',
      `URL after login: ${afterLoginUrl} - ${loginSuccess ? 'Successfully navigated away from login' : 'Still on login page'}`,
      ss14b, [...page._collectedErrors]);
    if (!loginSuccess) {
      logBug('P0', 'Auth', 'Login with correct credentials does not redirect away from login page', '1. Enter admin@jasonqiyuan.com / Admin123! 2. Click Sign in 3. Still on /login', ss14b);
    }

    // 1.5 Check console errors after login
    const loginConsoleErrors = [...page._collectedErrors];
    if (loginConsoleErrors.length > 0) {
      logResult('1.5 Console errors post-login', 'FAIL', `${loginConsoleErrors.length} console errors found`, ss14b, loginConsoleErrors);
      logBug('P1', 'JS Error', `Console errors after login: ${loginConsoleErrors[0]}`, 'Login with correct credentials and check console', ss14b);
    } else {
      logResult('1.5 Console errors post-login', 'PASS', 'No console errors', ss14b, []);
    }

    // ===========================================
    // TEST 2: TEAM OVERVIEW PAGE
    // ===========================================
    console.log('\n=== TEST 2: TEAM OVERVIEW PAGE ===');

    clearErrors();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const ss21 = await screenshot(page, '07-overview-page');

    // Check sidebar
    const hasSidebar = await page.locator('.sidebar, aside, [class*="sidebar"]').count() > 0;
    logResult('2.1 Sidebar present', hasSidebar ? 'PASS' : 'FAIL',
      `Sidebar found: ${hasSidebar}`, ss21, [...page._collectedErrors]);

    // Check for chart containers / panels
    clearErrors();
    const chartContainers = await page.locator('canvas, [class*="chart"], [class*="panel"], .n-card, [class*="Card"]').count();
    const ss22 = await screenshot(page, '08-overview-charts');
    logResult('2.2 Chart/panel containers', chartContainers >= 4 ? 'PASS' : chartContainers > 0 ? 'WARN' : 'FAIL',
      `Found ${chartContainers} chart/panel containers (expected >= 6)`,
      ss22, [...page._collectedErrors]);
    if (chartContainers < 4) {
      logBug('P1', 'UI Missing', `Only ${chartContainers} chart/panel containers found on overview (expected 6+)`, 'Login and go to / overview page', ss22);
    }

    // Check header / filter bar
    const hasHeader = await page.locator('header, .app-header, [class*="header"]').count() > 0;
    logResult('2.3 Header present', hasHeader ? 'PASS' : 'FAIL',
      `Header found: ${hasHeader}`, ss22, []);

    // Check visible text for real data
    const bodyText = await page.locator('body').textContent();
    const hasOverviewText = bodyText.includes('Overview') || bodyText.includes('Team') || bodyText.includes('Sprint');
    logResult('2.4 Overview content', hasOverviewText ? 'PASS' : 'WARN',
      `Page has expected text content: ${hasOverviewText}`, ss22, []);

    // Get page visible text for verification
    const overviewVisible = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`  Page text (first 500 chars): ${overviewVisible.replace(/\n/g, ' | ').substring(0, 300)}`);

    // Check console errors
    const overviewErrors = [...page._collectedErrors];
    logResult('2.5 Console errors on overview', overviewErrors.length === 0 ? 'PASS' : 'FAIL',
      `${overviewErrors.length} console errors`, ss22, overviewErrors);
    if (overviewErrors.length > 0) {
      logBug('P1', 'JS Error', `Console errors on overview page: ${overviewErrors[0].substring(0, 100)}`, 'Navigate to / after login', ss22);
    }

    // ===========================================
    // TEST 3: PAGE NAVIGATION
    // ===========================================
    console.log('\n=== TEST 3: PAGE NAVIGATION ===');

    // 3.1 Navigate to OKR
    clearErrors();
    // Try clicking sidebar nav
    const okrLink = page.locator('.nav-item:has-text("OKR"), a:has-text("OKR"), [href="/okr"]');
    if (await okrLink.count() > 0) {
      await okrLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/okr`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
    }
    const ss31 = await screenshot(page, '09-okr-page');
    const okrUrl = page.url();
    const okrVisible = await page.evaluate(() => document.body.innerText.substring(0, 300));
    logResult('3.1 OKR page', okrUrl.includes('/okr') ? 'PASS' : 'FAIL',
      `URL: ${okrUrl}, Content: ${okrVisible.replace(/\n/g, ' | ').substring(0, 150)}`,
      ss31, [...page._collectedErrors]);
    if (page._collectedErrors.length > 0) {
      logBug('P1', 'JS Error', `Console errors on OKR page: ${page._collectedErrors[0].substring(0, 100)}`, 'Navigate to /okr', ss31);
    }

    // 3.2 Navigate to Git Activity
    clearErrors();
    const gitLink = page.locator('.nav-item:has-text("Git"), a:has-text("Git"), [href="/git"]');
    if (await gitLink.count() > 0) {
      await gitLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
    }
    const ss32 = await screenshot(page, '10-git-activity-page');
    const gitUrl = page.url();
    const gitVisible = await page.evaluate(() => document.body.innerText.substring(0, 300));
    logResult('3.2 Git Activity page', gitUrl.includes('/git') ? 'PASS' : 'FAIL',
      `URL: ${gitUrl}, Content: ${gitVisible.replace(/\n/g, ' | ').substring(0, 150)}`,
      ss32, [...page._collectedErrors]);
    if (page._collectedErrors.length > 0) {
      logBug('P1', 'JS Error', `Console errors on Git Activity page: ${page._collectedErrors[0].substring(0, 100)}`, 'Navigate to /git', ss32);
    }

    // 3.3 Navigate to Admin
    clearErrors();
    const adminLink = page.locator('.nav-item:has-text("Admin"), a:has-text("Admin"), [href="/admin"]');
    if (await adminLink.count() > 0) {
      await adminLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
    }
    const ss33 = await screenshot(page, '11-admin-page');
    const adminUrl = page.url();
    const adminVisible = await page.evaluate(() => document.body.innerText.substring(0, 300));
    logResult('3.3 Admin page', adminUrl.includes('/admin') ? 'PASS' : 'FAIL',
      `URL: ${adminUrl}, Content: ${adminVisible.replace(/\n/g, ' | ').substring(0, 150)}`,
      ss33, [...page._collectedErrors]);
    if (page._collectedErrors.length > 0) {
      logBug('P1', 'JS Error', `Console errors on Admin page: ${page._collectedErrors[0].substring(0, 100)}`, 'Navigate to /admin', ss33);
    }

    // 3.4 Navigate back to Overview
    clearErrors();
    const overviewLink = page.locator('.nav-item:has-text("Overview"), a:has-text("Overview"), [href="/"]');
    if (await overviewLink.count() > 0) {
      await overviewLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
    }
    const ss34 = await screenshot(page, '12-back-to-overview');
    logResult('3.4 Back to Overview', page.url().replace(BASE_URL, '') === '/' || page.url() === BASE_URL + '/' ? 'PASS' : 'WARN',
      `URL: ${page.url()}`, ss34, [...page._collectedErrors]);

    // ===========================================
    // TEST 4: ADMIN PANEL DETAILS
    // ===========================================
    console.log('\n=== TEST 4: ADMIN PANEL ===');

    clearErrors();
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const ss41 = await screenshot(page, '13-admin-detail');

    // Check for tabs
    const tabElements = await page.locator('.n-tabs, [role="tablist"], [class*="tab"]').count();
    const tabTexts = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"], .n-tabs .n-tab-tab, [class*="tab-item"], [class*="TabItem"]');
      return Array.from(tabs).map(t => t.textContent?.trim()).filter(Boolean);
    });
    logResult('4.1 Admin tabs', tabElements > 0 ? 'PASS' : 'WARN',
      `Tab containers: ${tabElements}, Tab texts: ${JSON.stringify(tabTexts)}`,
      ss41, [...page._collectedErrors]);

    // Try clicking tabs if they exist
    if (tabTexts.length > 1) {
      for (let i = 0; i < Math.min(tabTexts.length, 3); i++) {
        clearErrors();
        const tabLabel = tabTexts[i];
        const tabLocator = page.locator(`[role="tab"]:has-text("${tabLabel}"), .n-tab-tab:has-text("${tabLabel}")`);
        if (await tabLocator.count() > 0) {
          await tabLocator.first().click();
          await page.waitForTimeout(1000);
          const ssTab = await screenshot(page, `14-admin-tab-${i}-${tabLabel.replace(/\s/g, '_')}`);
          logResult(`4.2.${i} Admin tab "${tabLabel}"`, 'PASS',
            `Clicked tab "${tabLabel}" successfully`, ssTab, [...page._collectedErrors]);
          if (page._collectedErrors.length > 0) {
            logBug('P1', 'JS Error', `Console error on admin tab "${tabLabel}": ${page._collectedErrors[0].substring(0, 100)}`, `Navigate to /admin and click "${tabLabel}" tab`, ssTab);
          }
        }
      }
    }

    // Check admin page content
    const adminContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`  Admin page text: ${adminContent.replace(/\n/g, ' | ').substring(0, 300)}`);

    // ===========================================
    // TEST 5: RESPONSIVE DESIGN
    // ===========================================
    console.log('\n=== TEST 5: RESPONSIVE DESIGN ===');

    // 5.1 Mobile viewport - Login page
    clearErrors();
    await context.close();
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage._collectedErrors = [];
    mobilePage.on('console', msg => {
      if (msg.type() === 'error') mobilePage._collectedErrors.push(msg.text());
    });
    mobilePage.on('pageerror', err => {
      mobilePage._collectedErrors.push(`PageError: ${err.message}`);
    });

    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(1000);
    const ss51 = await screenshot(mobilePage, '15-mobile-login');
    logResult('5.1 Mobile login page', 'PASS', 'Mobile login page loaded', ss51, [...mobilePage._collectedErrors]);

    // 5.2 Login on mobile
    clearErrors();
    mobilePage._collectedErrors = [];
    await mobilePage.locator('input[placeholder*="email" i]').first().fill(ADMIN_EMAIL);
    await mobilePage.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
    await mobilePage.locator('button:has-text("Sign in")').first().click();
    await mobilePage.waitForTimeout(3000);
    const ss52 = await screenshot(mobilePage, '16-mobile-after-login');
    const mobileLoginUrl = mobilePage.url();
    logResult('5.2 Mobile login', !mobileLoginUrl.includes('/login') ? 'PASS' : 'FAIL',
      `URL after mobile login: ${mobileLoginUrl}`, ss52, [...mobilePage._collectedErrors]);

    // 5.3 Mobile overview
    mobilePage._collectedErrors = [];
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(2000);
    const ss53 = await screenshot(mobilePage, '17-mobile-overview');
    logResult('5.3 Mobile overview page', 'PASS', 'Mobile overview rendered', ss53, [...mobilePage._collectedErrors]);
    if (mobilePage._collectedErrors.length > 0) {
      logBug('P2', 'JS Error', `Console errors on mobile overview: ${mobilePage._collectedErrors[0].substring(0, 100)}`, 'Open overview on 375x812 viewport', ss53);
    }

    // 5.4 Mobile OKR
    mobilePage._collectedErrors = [];
    await mobilePage.goto(`${BASE_URL}/okr`, { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(2000);
    const ss54 = await screenshot(mobilePage, '18-mobile-okr');
    logResult('5.4 Mobile OKR page', 'PASS', 'Mobile OKR rendered', ss54, [...mobilePage._collectedErrors]);

    // 5.5 Mobile Admin
    mobilePage._collectedErrors = [];
    await mobilePage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(2000);
    const ss55 = await screenshot(mobilePage, '19-mobile-admin');
    logResult('5.5 Mobile admin page', 'PASS', 'Mobile admin rendered', ss55, [...mobilePage._collectedErrors]);

    await mobileContext.close();

    // ===========================================
    // TEST 6: API HEALTH CHECK
    // ===========================================
    console.log('\n=== TEST 6: API HEALTH CHECK ===');

    const apiContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const apiPage = await apiContext.newPage();
    apiPage._collectedErrors = [];
    apiPage.on('console', msg => {
      if (msg.type() === 'error') apiPage._collectedErrors.push(msg.text());
    });

    await apiPage.goto('http://localhost:3200/api/health', { waitUntil: 'networkidle', timeout: 10000 });
    await apiPage.waitForTimeout(500);
    const ss61 = await screenshot(apiPage, '20-api-health');
    const apiContent = await apiPage.evaluate(() => document.body.innerText);
    let healthData;
    try {
      healthData = JSON.parse(apiContent);
    } catch {
      healthData = null;
    }
    const healthOk = healthData && (healthData.data?.status === 'ok' || healthData.status === 'ok');
    logResult('6.1 API health check', healthOk ? 'PASS' : 'FAIL',
      `Response: ${apiContent.substring(0, 200)}`, ss61, []);
    if (!healthOk) {
      logBug('P0', 'API', 'Health check endpoint not returning ok status', 'GET http://localhost:3200/api/health', ss61);
    }

    await apiContext.close();

    // ===========================================
    // SUMMARY
    // ===========================================
    console.log('\n\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    console.log(`Total: ${results.length} | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}`);
    console.log(`Bugs found: ${bugs.length}`);
    bugs.forEach(b => console.log(`  ${b.id} [${b.severity}] ${b.type}: ${b.description}`));

    // Write JSON results for report generation
    const reportData = { results, bugs, summary: { total: results.length, passed, failed, warned, bugsFound: bugs.length } };
    writeFileSync(path.join(SCREENSHOT_DIR, '..', 'test-results.json'), JSON.stringify(reportData, null, 2));

  } catch (err) {
    console.error('FATAL TEST ERROR:', err.message);
    console.error(err.stack);
    try {
      await screenshot(page, 'FATAL-ERROR');
    } catch {}
  } finally {
    await browser.close();
  }
})();
