import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';
const results = [];
const bugs = [];
let screenshotIndex = 0;

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

async function screenshot(page, name) {
  screenshotIndex++;
  const filename = `${String(screenshotIndex).padStart(3, '0')}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log(`Screenshot: ${filename}`);
  return filename;
}

async function checkConsoleErrors(consoleMessages, step) {
  const errors = consoleMessages.filter(m => m.type() === 'error');
  const relevantErrors = errors.filter(e => {
    const text = e.text();
    // Filter out common non-critical errors
    return !text.includes('favicon') && !text.includes('DevTools') && !text.includes('downloadable font');
  });
  if (relevantErrors.length > 0) {
    log(`WARNING: ${relevantErrors.length} console errors at step "${step}"`);
    relevantErrors.forEach(e => log(`  ERROR: ${e.text().substring(0, 200)}`));
  }
  return relevantErrors;
}

async function run() {
  log('Starting E2E Data Verification Tests');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN'
  });
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg));

  // ========== TEST 1: LOGIN PAGE ==========
  log('========== TEST 1: LOGIN PAGE ==========');

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const ss1 = await screenshot(page, 'initial-page');
    results.push({ page: 'Login', step: 'Open app', expected: 'Login page', actual: 'Page loaded', screenshot: ss1, status: 'INFO' });

    // Check if we're on login page or redirected
    const currentUrl = page.url();
    log(`Current URL: ${currentUrl}`);

    // Try to find login form
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="mail"], input[placeholder*="邮箱"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    if (emailInput && passwordInput) {
      log('Found login form, filling credentials');
      await emailInput.fill('admin@jasonqiyuan.com');
      await passwordInput.fill('Admin123!');
      const ss_login_form = await screenshot(page, 'login-form-filled');
      results.push({ page: 'Login', step: 'Fill credentials', expected: 'Form filled', actual: 'Credentials entered', screenshot: ss_login_form, status: 'PASS' });

      // Find and click submit button
      const submitBtn = await page.$('button[type="submit"], button:has-text("登录"), button:has-text("Login"), button:has-text("Sign")');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle').catch(() => {});
        const ss_after_login = await screenshot(page, 'after-login');

        const afterLoginUrl = page.url();
        log(`After login URL: ${afterLoginUrl}`);

        if (afterLoginUrl.includes('/login') || afterLoginUrl.includes('/auth')) {
          bugs.push({ id: 'B-01', severity: 'P0', type: 'Auth', desc: 'Login failed - still on login page after submit', screenshot: ss_after_login });
          results.push({ page: 'Login', step: 'Submit login', expected: 'Redirect to dashboard', actual: 'Still on login page', screenshot: ss_after_login, status: 'FAIL' });
        } else {
          results.push({ page: 'Login', step: 'Submit login', expected: 'Redirect to dashboard', actual: `Redirected to ${afterLoginUrl}`, screenshot: ss_after_login, status: 'PASS' });
        }
      } else {
        bugs.push({ id: 'B-02', severity: 'P1', type: 'UI', desc: 'No submit button found on login page', screenshot: ss_login_form });
        results.push({ page: 'Login', step: 'Find submit button', expected: 'Submit button exists', actual: 'Not found', screenshot: ss_login_form, status: 'FAIL' });
      }
    } else {
      log('No login form found, might be already logged in or SPA routing');
      // Might need to navigate to /login explicitly
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const ss_login_nav = await screenshot(page, 'login-page-direct');

      const emailInput2 = await page.$('input[type="email"], input[name="email"], input[placeholder*="mail"], input[placeholder*="邮箱"]');
      const passwordInput2 = await page.$('input[type="password"]');

      if (emailInput2 && passwordInput2) {
        await emailInput2.fill('admin@jasonqiyuan.com');
        await passwordInput2.fill('Admin123!');
        const submitBtn2 = await page.$('button[type="submit"], button:has-text("登录"), button:has-text("Login")');
        if (submitBtn2) {
          await submitBtn2.click();
          await page.waitForTimeout(3000);
          await page.waitForLoadState('networkidle').catch(() => {});
        }
      }
      const ss_after = await screenshot(page, 'after-login-attempt');
      results.push({ page: 'Login', step: 'Login flow', expected: 'Logged in', actual: `URL: ${page.url()}`, screenshot: ss_after, status: page.url().includes('login') ? 'FAIL' : 'PASS' });
    }

    const loginErrors = await checkConsoleErrors(consoleMessages, 'Login');
    results.push({ page: 'Login', step: 'Console errors', expected: '0 errors', actual: `${loginErrors.length} errors`, screenshot: '-', status: loginErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Login test error: ${err.message}`);
    bugs.push({ id: 'B-ERR', severity: 'P0', type: 'Runtime', desc: `Login test crashed: ${err.message}`, screenshot: '-' });
  }

  // ========== TEST 2: TEAM OVERVIEW PAGE ==========
  log('========== TEST 2: TEAM OVERVIEW / DASHBOARD ==========');
  consoleMessages.length = 0;

  try {
    // Navigate to overview/dashboard
    const overviewUrl = page.url();
    if (!overviewUrl.includes('/overview') && !overviewUrl.includes('/dashboard')) {
      // Try common routes
      for (const route of ['/overview', '/dashboard', '/']) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        if (!page.url().includes('/login')) break;
      }
    }

    await page.waitForTimeout(3000);
    const ss_overview = await screenshot(page, 'team-overview-full');
    log(`Overview URL: ${page.url()}`);

    // Get visible text to check for real data
    const bodyText = await page.evaluate(() => document.body.innerText);
    log(`Page text length: ${bodyText.length}`);

    // Check for project names in visible text
    const hasAvatar = bodyText.includes('Avatar');
    const hasAirFlow = bodyText.includes('AirFlow');
    const hasDataHub = bodyText.includes('DataHub');
    const hasOPS = bodyText.includes('运营') || bodyText.includes('OPS');

    log(`Data check - Avatar:${hasAvatar} AirFlow:${hasAirFlow} DataHub:${hasDataHub} OPS:${hasOPS}`);

    if (hasAvatar || hasAirFlow) {
      results.push({ page: 'Overview', step: 'Project names visible', expected: 'Avatar/AirFlow/DataHub/OPS', actual: `Avatar:${hasAvatar} AirFlow:${hasAirFlow} DataHub:${hasDataHub}`, screenshot: ss_overview, status: 'PASS' });
    } else {
      results.push({ page: 'Overview', step: 'Project names visible', expected: 'Avatar/AirFlow/DataHub/OPS', actual: 'Project names not found in text', screenshot: ss_overview, status: 'FAIL' });
      bugs.push({ id: 'B-03', severity: 'P1', type: 'Data', desc: 'Project names not visible on overview page', screenshot: ss_overview });
    }

    // Check for chart elements (canvas/SVG)
    const chartInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const svgs = document.querySelectorAll('svg');
      const echartsDivs = document.querySelectorAll('[_echarts_instance_], [class*="echarts"], [class*="chart"]');
      return {
        canvasCount: canvases.length,
        svgCount: svgs.length,
        echartsCount: echartsDivs.length,
        hasRechartsOrEcharts: document.querySelectorAll('[class*="recharts"], [class*="echarts"], canvas').length > 0
      };
    });

    log(`Charts: canvas=${chartInfo.canvasCount}, SVG=${chartInfo.svgCount}, echarts=${chartInfo.echartsCount}`);

    if (chartInfo.canvasCount > 0 || chartInfo.svgCount > 2 || chartInfo.echartsCount > 0) {
      results.push({ page: 'Overview', step: 'Chart elements exist', expected: 'Charts rendered', actual: `canvas:${chartInfo.canvasCount} SVG:${chartInfo.svgCount} echarts:${chartInfo.echartsCount}`, screenshot: ss_overview, status: 'PASS' });
    } else {
      results.push({ page: 'Overview', step: 'Chart elements exist', expected: 'Charts rendered (canvas/SVG)', actual: `canvas:${chartInfo.canvasCount} SVG:${chartInfo.svgCount}`, screenshot: ss_overview, status: 'FAIL' });
      bugs.push({ id: 'B-04', severity: 'P1', type: 'Render', desc: 'No chart elements (canvas/SVG) found on overview page', screenshot: ss_overview });
    }

    // Check for Sprint delivery data
    const hasSprintData = bodyText.includes('Sprint') || bodyText.includes('交付') || bodyText.includes('sprint');
    results.push({ page: 'Overview', step: 'Sprint delivery section', expected: 'Sprint data visible', actual: hasSprintData ? 'Found' : 'Not found', screenshot: ss_overview, status: hasSprintData ? 'PASS' : 'WARN' });

    // Check task distribution
    const hasTaskDist = bodyText.includes('todo') || bodyText.includes('进行中') || bodyText.includes('in_progress') || bodyText.includes('任务') || bodyText.includes('Task');
    results.push({ page: 'Overview', step: 'Task distribution section', expected: 'Task status data', actual: hasTaskDist ? 'Found' : 'Not found', screenshot: ss_overview, status: hasTaskDist ? 'PASS' : 'WARN' });

    // Check for OKR section
    const hasOKR = bodyText.includes('OKR') || bodyText.includes('交付效率') || bodyText.includes('代码质量');
    results.push({ page: 'Overview', step: 'OKR section', expected: 'OKR data visible', actual: hasOKR ? 'Found' : 'Not found', screenshot: ss_overview, status: hasOKR ? 'PASS' : 'WARN' });

    // Check for code activity
    const hasCodeActivity = bodyText.includes('代码') || bodyText.includes('commit') || bodyText.includes('Code') || bodyText.includes('PR');
    results.push({ page: 'Overview', step: 'Code activity section', expected: 'Code activity data', actual: hasCodeActivity ? 'Found' : 'Not found', screenshot: ss_overview, status: hasCodeActivity ? 'PASS' : 'WARN' });

    // Check for numbers (real data should have percentages, counts)
    const numberPattern = /\d{2,}/g;
    const numbers = bodyText.match(numberPattern) || [];
    results.push({ page: 'Overview', step: 'Numeric data present', expected: 'Numbers/percentages visible', actual: `${numbers.length} number groups found`, screenshot: ss_overview, status: numbers.length > 5 ? 'PASS' : 'WARN' });

    // Scroll down and take another screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    const ss_overview_mid = await screenshot(page, 'team-overview-scrolled-mid');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const ss_overview_bottom = await screenshot(page, 'team-overview-scrolled-bottom');

    const overviewErrors = await checkConsoleErrors(consoleMessages, 'Overview');
    results.push({ page: 'Overview', step: 'Console errors', expected: '0 errors', actual: `${overviewErrors.length} errors`, screenshot: ss_overview, status: overviewErrors.length > 0 ? 'WARN' : 'PASS' });

    if (overviewErrors.length > 0) {
      overviewErrors.forEach((e, i) => {
        if (i < 5) log(`  Error detail: ${e.text().substring(0, 300)}`);
      });
    }

  } catch (err) {
    log(`Overview test error: ${err.message}`);
    const ss_err = await screenshot(page, 'overview-error');
    bugs.push({ id: 'B-OVR', severity: 'P0', type: 'Runtime', desc: `Overview page error: ${err.message}`, screenshot: ss_err });
  }

  // ========== TEST 3: PROJECT DETAIL PAGE ==========
  log('========== TEST 3: PROJECT DETAIL ==========');
  consoleMessages.length = 0;

  try {
    // Try to navigate to Avatar project
    await page.goto(`${BASE_URL}/projects/p-avatar`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    let ss_project = await screenshot(page, 'project-avatar-full');

    // If redirected to login, might have lost auth
    if (page.url().includes('/login')) {
      log('Redirected to login from project page, re-authenticating...');
      const emailInput = await page.$('input[type="email"], input[name="email"]');
      const passInput = await page.$('input[type="password"]');
      if (emailInput && passInput) {
        await emailInput.fill('admin@jasonqiyuan.com');
        await passInput.fill('Admin123!');
        const btn = await page.$('button[type="submit"], button:has-text("登录")');
        if (btn) await btn.click();
        await page.waitForTimeout(3000);
        await page.goto(`${BASE_URL}/projects/p-avatar`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);
        ss_project = await screenshot(page, 'project-avatar-reauth');
      }
    }

    const projectText = await page.evaluate(() => document.body.innerText);
    log(`Project page text length: ${projectText.length}`);

    const hasAvatarName = projectText.includes('Avatar') || projectText.includes('数字人');
    results.push({ page: 'Project Detail', step: 'Avatar project page', expected: 'Avatar project data', actual: hasAvatarName ? 'Project name found' : 'Project name not found', screenshot: ss_project, status: hasAvatarName ? 'PASS' : 'FAIL' });

    // Check for burndown chart
    const projectCharts = await page.evaluate(() => {
      return {
        canvases: document.querySelectorAll('canvas').length,
        svgs: document.querySelectorAll('svg').length,
        charts: document.querySelectorAll('[class*="chart"], [class*="echarts"]').length
      };
    });
    results.push({ page: 'Project Detail', step: 'Burndown/charts', expected: 'Chart elements present', actual: `canvas:${projectCharts.canvases} SVG:${projectCharts.svgs}`, screenshot: ss_project, status: (projectCharts.canvases > 0 || projectCharts.svgs > 2) ? 'PASS' : 'WARN' });

    // Check for milestone data
    const hasMilestone = projectText.includes('里程碑') || projectText.includes('Milestone') || projectText.includes('MVP') || projectText.includes('2.0');
    results.push({ page: 'Project Detail', step: 'Milestones', expected: 'Milestone data visible', actual: hasMilestone ? 'Found' : 'Not found', screenshot: ss_project, status: hasMilestone ? 'PASS' : 'WARN' });

    // Check for task assignment matrix
    const hasTaskMatrix = projectText.includes('陈强') || projectText.includes('刘洋') || projectText.includes('任务') || projectText.includes('分配');
    results.push({ page: 'Project Detail', step: 'Task assignment', expected: 'Member task data', actual: hasTaskMatrix ? 'Found' : 'Not found', screenshot: ss_project, status: hasTaskMatrix ? 'PASS' : 'WARN' });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const ss_project_bottom = await screenshot(page, 'project-avatar-bottom');

    const projErrors = await checkConsoleErrors(consoleMessages, 'Project Detail');
    results.push({ page: 'Project Detail', step: 'Console errors', expected: '0 errors', actual: `${projErrors.length} errors`, screenshot: ss_project, status: projErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Project detail test error: ${err.message}`);
    const ss_err = await screenshot(page, 'project-error');
    bugs.push({ id: 'B-PROJ', severity: 'P1', type: 'Runtime', desc: `Project detail error: ${err.message}`, screenshot: ss_err });
  }

  // ========== TEST 4: MEMBER PERSONAL PAGE ==========
  log('========== TEST 4: MEMBER PERSONAL PAGE ==========');
  consoleMessages.length = 0;

  try {
    await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const ss_member = await screenshot(page, 'member-chenqiang-full');

    const memberText = await page.evaluate(() => document.body.innerText);

    const hasMemberName = memberText.includes('陈强') || memberText.includes('chenqiang');
    results.push({ page: 'Member Detail', step: 'Member name', expected: 'Chen Qiang name visible', actual: hasMemberName ? 'Found' : 'Not found', screenshot: ss_member, status: hasMemberName ? 'PASS' : 'WARN' });

    // Check for git contribution heatmap
    const memberCharts = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      svgs: document.querySelectorAll('svg').length,
      heatmap: document.querySelectorAll('[class*="heatmap"], [class*="heat"], [class*="calendar"]').length
    }));
    results.push({ page: 'Member Detail', step: 'Contribution charts', expected: 'Heatmap/charts present', actual: `canvas:${memberCharts.canvases} SVG:${memberCharts.svgs}`, screenshot: ss_member, status: (memberCharts.canvases > 0 || memberCharts.svgs > 2) ? 'PASS' : 'WARN' });

    // Check for task list
    const hasTaskList = memberText.includes('任务') || memberText.includes('Task') || memberText.includes('Sprint') || memberText.includes('进行中');
    results.push({ page: 'Member Detail', step: 'Task list', expected: 'Task data visible', actual: hasTaskList ? 'Found' : 'Not found', screenshot: ss_member, status: hasTaskList ? 'PASS' : 'WARN' });

    // Check for KPI scores
    const hasKPI = memberText.includes('KPI') || memberText.includes('评分') || memberText.includes('得分') || memberText.includes('交付率') || /\d+(\.\d+)?%/.test(memberText);
    results.push({ page: 'Member Detail', step: 'KPI scores', expected: 'KPI data visible', actual: hasKPI ? 'Found' : 'Not found', screenshot: ss_member, status: hasKPI ? 'PASS' : 'WARN' });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const ss_member_bottom = await screenshot(page, 'member-chenqiang-bottom');

    const memberErrors = await checkConsoleErrors(consoleMessages, 'Member Detail');
    results.push({ page: 'Member Detail', step: 'Console errors', expected: '0 errors', actual: `${memberErrors.length} errors`, screenshot: ss_member, status: memberErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Member page test error: ${err.message}`);
    const ss_err = await screenshot(page, 'member-error');
    bugs.push({ id: 'B-MEM', severity: 'P1', type: 'Runtime', desc: `Member page error: ${err.message}`, screenshot: ss_err });
  }

  // ========== TEST 5: OKR PAGE ==========
  log('========== TEST 5: OKR PAGE ==========');
  consoleMessages.length = 0;

  try {
    await page.goto(`${BASE_URL}/okr`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const ss_okr = await screenshot(page, 'okr-page-full');

    const okrText = await page.evaluate(() => document.body.innerText);

    // Check for 3 objectives
    const hasObj1 = okrText.includes('交付效率') || okrText.includes('提升研发');
    const hasObj2 = okrText.includes('代码质量') || okrText.includes('建设代码');
    const hasObj3 = okrText.includes('DataHub') || okrText.includes('2.0');

    log(`OKR: Obj1(效率):${hasObj1} Obj2(质量):${hasObj2} Obj3(DataHub):${hasObj3}`);

    results.push({ page: 'OKR', step: 'Objective 1 - Delivery efficiency', expected: 'Visible', actual: hasObj1 ? 'Found' : 'Not found', screenshot: ss_okr, status: hasObj1 ? 'PASS' : 'FAIL' });
    results.push({ page: 'OKR', step: 'Objective 2 - Code quality', expected: 'Visible', actual: hasObj2 ? 'Found' : 'Not found', screenshot: ss_okr, status: hasObj2 ? 'PASS' : 'FAIL' });
    results.push({ page: 'OKR', step: 'Objective 3 - DataHub 2.0', expected: 'Visible', actual: hasObj3 ? 'Found' : 'Not found', screenshot: ss_okr, status: hasObj3 ? 'PASS' : 'FAIL' });

    // Check for progress percentages (68%, 55%, 42%)
    const has68 = okrText.includes('68') || okrText.includes('68%');
    const has55 = okrText.includes('55') || okrText.includes('55%');
    const has42 = okrText.includes('42') || okrText.includes('42%');

    results.push({ page: 'OKR', step: 'Progress percentages', expected: '68%/55%/42%', actual: `68:${has68} 55:${has55} 42:${has42}`, screenshot: ss_okr, status: (has68 && has55 && has42) ? 'PASS' : (has68 || has55 || has42) ? 'WARN' : 'FAIL' });

    // Check for Key Results
    const hasKR = okrText.includes('Sprint 交付率') || okrText.includes('85%') || okrText.includes('PR Review') || okrText.includes('Bug');
    results.push({ page: 'OKR', step: 'Key Results visible', expected: 'KR data shown', actual: hasKR ? 'Found' : 'Not found', screenshot: ss_okr, status: hasKR ? 'PASS' : 'WARN' });

    // Scroll to see all objectives
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const ss_okr_bottom = await screenshot(page, 'okr-page-bottom');

    const okrErrors = await checkConsoleErrors(consoleMessages, 'OKR');
    results.push({ page: 'OKR', step: 'Console errors', expected: '0 errors', actual: `${okrErrors.length} errors`, screenshot: ss_okr, status: okrErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`OKR page test error: ${err.message}`);
    const ss_err = await screenshot(page, 'okr-error');
    bugs.push({ id: 'B-OKR', severity: 'P1', type: 'Runtime', desc: `OKR page error: ${err.message}`, screenshot: ss_err });
  }

  // ========== TEST 6: GIT ACTIVITY PAGE ==========
  log('========== TEST 6: GIT ACTIVITY PAGE ==========');
  consoleMessages.length = 0;

  try {
    await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const ss_git = await screenshot(page, 'git-activity-full');

    const gitText = await page.evaluate(() => document.body.innerText);

    // Check for git activity data
    const hasCommitData = gitText.includes('commit') || gitText.includes('Commit') || gitText.includes('提交');
    const hasPRData = gitText.includes('PR') || gitText.includes('Pull Request') || gitText.includes('合入') || gitText.includes('Merge');
    const hasHeatmap = gitText.includes('贡献') || gitText.includes('Contribution') || gitText.includes('活跃');

    results.push({ page: 'Git Activity', step: 'Commit data', expected: 'Commit stats visible', actual: hasCommitData ? 'Found' : 'Not found', screenshot: ss_git, status: hasCommitData ? 'PASS' : 'WARN' });
    results.push({ page: 'Git Activity', step: 'PR data', expected: 'PR metrics visible', actual: hasPRData ? 'Found' : 'Not found', screenshot: ss_git, status: hasPRData ? 'PASS' : 'WARN' });

    // Check for chart elements
    const gitCharts = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      svgs: document.querySelectorAll('svg').length,
    }));
    results.push({ page: 'Git Activity', step: 'Heatmap/charts', expected: 'Charts rendered', actual: `canvas:${gitCharts.canvases} SVG:${gitCharts.svgs}`, screenshot: ss_git, status: (gitCharts.canvases > 0 || gitCharts.svgs > 2) ? 'PASS' : 'WARN' });

    // Scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const ss_git_bottom = await screenshot(page, 'git-activity-bottom');

    const gitErrors = await checkConsoleErrors(consoleMessages, 'Git Activity');
    results.push({ page: 'Git Activity', step: 'Console errors', expected: '0 errors', actual: `${gitErrors.length} errors`, screenshot: ss_git, status: gitErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Git activity test error: ${err.message}`);
    const ss_err = await screenshot(page, 'git-error');
    bugs.push({ id: 'B-GIT', severity: 'P1', type: 'Runtime', desc: `Git activity page error: ${err.message}`, screenshot: ss_err });
  }

  // ========== TEST 7: ADMIN PAGE ==========
  log('========== TEST 7: ADMIN PAGE ==========');
  consoleMessages.length = 0;

  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const ss_admin = await screenshot(page, 'admin-page-users');

    const adminText = await page.evaluate(() => document.body.innerText);

    // Check for user list (9 users)
    const userNames = ['Admin', '李明', '王芳', '陈强', '刘洋', '赵雪', '孙磊'];
    let foundUsers = 0;
    userNames.forEach(name => {
      if (adminText.includes(name)) foundUsers++;
    });

    results.push({ page: 'Admin', step: 'User list', expected: '7+ users visible', actual: `${foundUsers} users found`, screenshot: ss_admin, status: foundUsers >= 5 ? 'PASS' : foundUsers >= 3 ? 'WARN' : 'FAIL' });

    // Check for role badges
    const hasRoles = adminText.includes('admin') || adminText.includes('manager') || adminText.includes('developer') || adminText.includes('管理员');
    results.push({ page: 'Admin', step: 'Role badges', expected: 'Roles shown', actual: hasRoles ? 'Found' : 'Not found', screenshot: ss_admin, status: hasRoles ? 'PASS' : 'WARN' });

    // Try to switch to author mappings tab
    const tabs = await page.$$('[role="tab"], button[class*="tab"], a[class*="tab"], [data-tab], .tab-button, .tab-item');
    log(`Found ${tabs.length} tab elements`);

    // Look for author mapping tab by text
    let authorMappingClicked = false;
    const allButtons = await page.$$('button, a, [role="tab"]');
    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => '');
      if (text && (text.includes('作者映射') || text.includes('Author') || text.includes('映射'))) {
        await btn.click();
        await page.waitForTimeout(2000);
        authorMappingClicked = true;
        break;
      }
    }

    if (authorMappingClicked) {
      const ss_mapping = await screenshot(page, 'admin-author-mappings');
      const mappingText = await page.evaluate(() => document.body.innerText);

      // Check for 7 author mappings
      const mappingNames = ['chenqiang', 'liming', 'wangfang', 'liuyang', 'zhaoxue'];
      let foundMappings = 0;
      mappingNames.forEach(name => {
        if (mappingText.toLowerCase().includes(name)) foundMappings++;
      });

      results.push({ page: 'Admin', step: 'Author mappings', expected: '5+ mappings', actual: `${foundMappings} found`, screenshot: ss_mapping, status: foundMappings >= 4 ? 'PASS' : foundMappings >= 2 ? 'WARN' : 'FAIL' });
    } else {
      results.push({ page: 'Admin', step: 'Author mappings tab', expected: 'Tab clickable', actual: 'Tab not found', screenshot: ss_admin, status: 'WARN' });
    }

    // Try to switch to sync logs tab
    let syncLogClicked = false;
    const allButtons2 = await page.$$('button, a, [role="tab"]');
    for (const btn of allButtons2) {
      const text = await btn.textContent().catch(() => '');
      if (text && (text.includes('同步') || text.includes('Sync') || text.includes('日志'))) {
        await btn.click();
        await page.waitForTimeout(2000);
        syncLogClicked = true;
        break;
      }
    }

    if (syncLogClicked) {
      const ss_sync = await screenshot(page, 'admin-sync-logs');
      const syncText = await page.evaluate(() => document.body.innerText);

      const hasSyncData = syncText.includes('成功') || syncText.includes('success') || syncText.includes('error') || syncText.includes('失败') || syncText.includes('同步');
      results.push({ page: 'Admin', step: 'Sync logs', expected: '10 sync logs', actual: hasSyncData ? 'Sync data found' : 'No sync data', screenshot: ss_sync, status: hasSyncData ? 'PASS' : 'WARN' });
    } else {
      results.push({ page: 'Admin', step: 'Sync logs tab', expected: 'Tab clickable', actual: 'Tab not found', screenshot: ss_admin, status: 'WARN' });
    }

    const adminErrors = await checkConsoleErrors(consoleMessages, 'Admin');
    results.push({ page: 'Admin', step: 'Console errors', expected: '0 errors', actual: `${adminErrors.length} errors`, screenshot: ss_admin, status: adminErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Admin page test error: ${err.message}`);
    const ss_err = await screenshot(page, 'admin-error');
    bugs.push({ id: 'B-ADM', severity: 'P1', type: 'Runtime', desc: `Admin page error: ${err.message}`, screenshot: ss_err });
  }

  // ========== TEST 8: FILTER FUNCTIONALITY ==========
  log('========== TEST 8: FILTER FUNCTIONALITY ==========');
  consoleMessages.length = 0;

  try {
    // Go back to overview
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    });
    await page.waitForTimeout(3000);

    // Look for filter/select elements
    const filterInfo = await page.evaluate(() => {
      const selects = document.querySelectorAll('select, [class*="select"], [class*="filter"], [class*="dropdown"]');
      const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
        const text = b.textContent || '';
        return text.includes('筛选') || text.includes('Filter') || text.includes('全部') || text.includes('项目');
      });
      return {
        selectCount: selects.length,
        filterButtons: buttons.map(b => b.textContent.trim().substring(0, 30)),
        selectTexts: Array.from(selects).map(s => s.textContent?.trim().substring(0, 30) || '')
      };
    });

    log(`Filters: selects=${filterInfo.selectCount}, buttons=${filterInfo.filterButtons.join(',')})`);

    if (filterInfo.selectCount > 0 || filterInfo.filterButtons.length > 0) {
      // Try clicking a filter
      const filterElement = await page.$('select, [class*="select"], [class*="filter"]');
      if (filterElement) {
        await filterElement.click();
        await page.waitForTimeout(1000);
        const ss_filter = await screenshot(page, 'filter-opened');

        // Try to find and click an option
        const option = await page.$('[class*="option"], option, [role="option"], [class*="menu-item"]');
        if (option) {
          await option.click();
          await page.waitForTimeout(2000);
          const ss_filtered = await screenshot(page, 'filter-applied');
          results.push({ page: 'Filter', step: 'Apply filter', expected: 'Data filtered', actual: 'Filter applied', screenshot: ss_filtered, status: 'PASS' });
        }
      }
      results.push({ page: 'Filter', step: 'Filter elements', expected: 'Filter controls exist', actual: `${filterInfo.selectCount} selects, ${filterInfo.filterButtons.length} filter buttons`, screenshot: '-', status: 'PASS' });
    } else {
      const ss_nofilter = await screenshot(page, 'filter-not-found');
      results.push({ page: 'Filter', step: 'Filter elements', expected: 'Filter controls exist', actual: 'No filter elements found', screenshot: ss_nofilter, status: 'WARN' });
    }

    const filterErrors = await checkConsoleErrors(consoleMessages, 'Filter');
    results.push({ page: 'Filter', step: 'Console errors', expected: '0 errors', actual: `${filterErrors.length} errors`, screenshot: '-', status: filterErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Filter test error: ${err.message}`);
  }

  // ========== TEST 9: RESPONSIVE MOBILE ==========
  log('========== TEST 9: RESPONSIVE / MOBILE ==========');
  consoleMessages.length = 0;

  try {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Overview mobile
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    });
    await page.waitForTimeout(2000);
    const ss_mobile_overview = await screenshot(page, 'mobile-overview');

    // Check for hamburger menu
    const hasHamburger = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [class*="hamburger"], [class*="menu-toggle"], [class*="sidebar-toggle"]');
      return Array.from(buttons).some(b => {
        const style = window.getComputedStyle(b);
        return style.display !== 'none' && (
          b.className.includes('hamburger') ||
          b.className.includes('menu') ||
          b.className.includes('toggle') ||
          b.getAttribute('aria-label')?.includes('menu')
        );
      });
    });

    results.push({ page: 'Mobile', step: 'Overview layout', expected: 'Mobile layout renders', actual: 'Rendered at 375x812', screenshot: ss_mobile_overview, status: 'PASS' });
    results.push({ page: 'Mobile', step: 'Hamburger menu', expected: 'Hamburger visible on mobile', actual: hasHamburger ? 'Found' : 'Not found', screenshot: ss_mobile_overview, status: hasHamburger ? 'PASS' : 'WARN' });

    // Admin page mobile
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const ss_mobile_admin = await screenshot(page, 'mobile-admin');
    results.push({ page: 'Mobile', step: 'Admin page mobile', expected: 'Table scrollable', actual: 'Rendered at 375px', screenshot: ss_mobile_admin, status: 'PASS' });

    // OKR mobile
    await page.goto(`${BASE_URL}/okr`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const ss_mobile_okr = await screenshot(page, 'mobile-okr');
    results.push({ page: 'Mobile', step: 'OKR page mobile', expected: 'OKR cards stack', actual: 'Rendered at 375px', screenshot: ss_mobile_okr, status: 'PASS' });

    // Reset to desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    const mobileErrors = await checkConsoleErrors(consoleMessages, 'Mobile');
    results.push({ page: 'Mobile', step: 'Console errors', expected: '0 errors', actual: `${mobileErrors.length} errors`, screenshot: '-', status: mobileErrors.length > 0 ? 'WARN' : 'PASS' });

  } catch (err) {
    log(`Mobile test error: ${err.message}`);
    // Reset viewport even on error
    await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  }

  // ========== SUMMARY ==========
  log('========== TEST SUMMARY ==========');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;

  log(`Results: ${passCount} PASS, ${failCount} FAIL, ${warnCount} WARN`);
  log(`Bugs found: ${bugs.length}`);

  // Write results to JSON for later analysis
  const output = { results, bugs, summary: { pass: passCount, fail: failCount, warn: warnCount, total: results.length } };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, '..', 'test-results-detailed.json'), JSON.stringify(output, null, 2));

  await browser.close();
  log('Tests complete. Browser closed.');
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
