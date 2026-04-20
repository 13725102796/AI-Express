import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve('screenshots/round2');
const BASE_URL = 'http://localhost:5173';

async function ss(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [SS] ${name}.png`);
}

async function countCanvases(page) {
  return await page.evaluate(() => document.querySelectorAll('canvas').length);
}

async function getCanvasDetails(page) {
  return await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    return Array.from(canvases).map((canvas, i) => {
      let el = canvas.parentElement;
      let title = '';
      for (let d = 0; d < 12 && el; d++) {
        const h = el.querySelector('h2, h3, h4');
        if (h && h.textContent.trim()) { title = h.textContent.trim(); break; }
        el = el.parentElement;
      }
      return { index: i, title: title || '(unknown)', w: canvas.width, h: canvas.height };
    });
  });
}

async function getPageTextContent(page) {
  return await page.evaluate(() => document.body.innerText.substring(0, 500));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = {};
  let currentPage = 'login';
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      if (!consoleErrors[currentPage]) consoleErrors[currentPage] = [];
      consoleErrors[currentPage].push(msg.text().substring(0, 300));
    }
  });

  // ========== STEP 1: LOGIN ==========
  console.log('\n=== STEP 1: LOGIN ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await ss(page, 'r2-01-initial');

  // Naive UI NInput: find inputs inside login card
  const emailInput = page.locator('.login-card input').first();
  const passwordInput = page.locator('.login-card input[type="password"]');
  await emailInput.fill('admin@jasonqiyuan.com');
  await passwordInput.fill('Admin123!');
  await ss(page, 'r2-02-login-filled');

  await page.locator('.login-card button').filter({ hasText: /Sign in/i }).click();
  await page.waitForTimeout(3000);
  await ss(page, 'r2-03-after-login');

  const afterLoginUrl = page.url();
  console.log(`  URL: ${afterLoginUrl}`);
  const loginOk = !afterLoginUrl.includes('/login');
  console.log(`  Login: ${loginOk ? 'PASS' : 'FAIL'}`);

  if (!loginOk) {
    console.log('  FATAL: Login failed. Aborting.');
    await browser.close();
    process.exit(1);
  }

  // Verify localStorage has token
  const hasToken = await page.evaluate(() => !!localStorage.getItem('token'));
  console.log(`  Token in localStorage: ${hasToken}`);

  // ========== STEP 2: TEAM OVERVIEW (route: /) ==========
  console.log('\n=== STEP 2: TEAM OVERVIEW (current page after login) ===');
  currentPage = 'overview';

  // The default route after login is "/" which is the Overview page
  // Wait extra time for data loading + chart rendering
  await page.waitForTimeout(5000);

  // Check what's on page
  const overviewText = await getPageTextContent(page);
  console.log(`  Page text (first 200): ${overviewText.substring(0, 200)}`);

  // Count canvases
  let overviewCanvases = await countCanvases(page);
  console.log(`  Canvas count: ${overviewCanvases}`);

  // Screenshot current viewport (top of overview)
  await ss(page, 'r2-04-overview-top');

  // Scroll down to see more panels
  await page.evaluate(() => {
    const main = document.querySelector('main, .main-content, [class*="content"]') || document.documentElement;
    main.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Use the main content area for scrolling (not window - sidebar layout)
  const scrollTarget = await page.evaluate(() => {
    // Find the scrollable content area (not the sidebar)
    const candidates = [
      document.querySelector('main'),
      document.querySelector('.main-content'),
      document.querySelector('[class*="content-area"]'),
      document.querySelector('[class*="page-content"]'),
    ].filter(Boolean);
    if (candidates.length > 0) {
      return candidates[0].tagName + '.' + candidates[0].className;
    }
    return 'NONE';
  });
  console.log(`  Scroll target: ${scrollTarget}`);

  // Scroll using the main content area or fallback to window
  async function scrollMainContent(px) {
    await page.evaluate((scrollPx) => {
      const main = document.querySelector('main') ||
                   document.querySelector('.main-content') ||
                   document.querySelector('[class*="content"]');
      if (main && main.scrollHeight > main.clientHeight) {
        main.scrollTop += scrollPx;
      } else {
        window.scrollBy(0, scrollPx);
      }
    }, px);
    await page.waitForTimeout(500);
  }

  await scrollMainContent(500);
  await ss(page, 'r2-05-overview-mid1');

  await scrollMainContent(500);
  await ss(page, 'r2-06-overview-mid2');

  await scrollMainContent(500);
  await ss(page, 'r2-07-overview-bottom');

  await scrollMainContent(500);
  await ss(page, 'r2-08-overview-bottom2');

  // Re-count canvases after scrolling (in case lazy loading)
  overviewCanvases = await countCanvases(page);
  console.log(`  Canvas count (after scroll): ${overviewCanvases}`);
  let overviewDetails = await getCanvasDetails(page);
  overviewDetails.forEach(c => console.log(`    [${c.index}] "${c.title}" ${c.w}x${c.h}`));

  // Check for chart containers that might use SVG instead of canvas
  const chartInfo = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="chart"], [class*="echart"], [id*="chart"]');
    return Array.from(all).map(el => ({
      tag: el.tagName,
      cls: el.className.substring(0, 80),
      hasCanvas: !!el.querySelector('canvas'),
      hasSVG: !!el.querySelector('svg'),
      w: el.offsetWidth,
      h: el.offsetHeight,
    }));
  });
  console.log(`  Chart containers found: ${chartInfo.length}`);
  chartInfo.forEach((c, i) => console.log(`    [${i}] <${c.tag}> cls="${c.cls}" canvas=${c.hasCanvas} svg=${c.hasSVG} ${c.w}x${c.h}`));

  // ========== STEP 3: PROJECT DETAIL via SPA nav ==========
  console.log('\n=== STEP 3: PROJECT DETAIL ===');
  currentPage = 'projectDetail';

  // Use SPA navigation by evaluating router push
  await page.evaluate(() => {
    // Access Vue router via the app instance
    const app = document.querySelector('#app')?.__vue_app__;
    if (app) {
      const router = app.config.globalProperties.$router;
      if (router) router.push('/projects/p-avatar');
    }
  });
  await page.waitForTimeout(4000);

  // Alternatively, try navigating by URL but staying in same session
  let projUrl = page.url();
  console.log(`  URL: ${projUrl}`);

  if (!projUrl.includes('/projects')) {
    // Fallback: use goto (same origin, localStorage should persist)
    await page.goto(`${BASE_URL}/projects/p-avatar`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(4000);
    projUrl = page.url();
    console.log(`  URL (after goto): ${projUrl}`);
  }

  const projText = await getPageTextContent(page);
  console.log(`  Page text (first 200): ${projText.substring(0, 200)}`);

  await ss(page, 'r2-09-project-top');

  await scrollMainContent(400);
  await ss(page, 'r2-10-project-mid');

  await scrollMainContent(400);
  await ss(page, 'r2-11-project-bottom');

  const projCanvases = await countCanvases(page);
  console.log(`  Canvas count: ${projCanvases}`);
  const projDetails = await getCanvasDetails(page);
  projDetails.forEach(c => console.log(`    [${c.index}] "${c.title}" ${c.w}x${c.h}`));

  // ========== STEP 4: MEMBER DETAIL ==========
  console.log('\n=== STEP 4: MEMBER DETAIL ===');
  currentPage = 'memberDetail';

  await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    if (app) {
      const router = app.config.globalProperties.$router;
      if (router) router.push('/members/u-dev-1');
    }
  });
  await page.waitForTimeout(4000);

  let memberUrl = page.url();
  console.log(`  URL: ${memberUrl}`);

  if (!memberUrl.includes('/members')) {
    await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(4000);
    memberUrl = page.url();
    console.log(`  URL (after goto): ${memberUrl}`);
  }

  const memberText = await getPageTextContent(page);
  console.log(`  Page text (first 200): ${memberText.substring(0, 200)}`);

  // Scroll to top first
  await page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('[class*="content"]');
    if (main) main.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  await ss(page, 'r2-12-member-top');

  await scrollMainContent(500);
  await ss(page, 'r2-13-member-mid');

  await scrollMainContent(500);
  await ss(page, 'r2-14-member-bottom');

  await scrollMainContent(500);
  await ss(page, 'r2-15-member-bottom2');

  const memberCanvases = await countCanvases(page);
  console.log(`  Canvas count: ${memberCanvases}`);
  const memberDetails = await getCanvasDetails(page);
  memberDetails.forEach(c => console.log(`    [${c.index}] "${c.title}" ${c.w}x${c.h}`));

  // ========== STEP 5: GIT ACTIVITY ==========
  console.log('\n=== STEP 5: GIT ACTIVITY ===');
  currentPage = 'gitActivity';

  await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    if (app) {
      const router = app.config.globalProperties.$router;
      if (router) router.push('/git');
    }
  });
  await page.waitForTimeout(4000);

  let gitUrl = page.url();
  console.log(`  URL: ${gitUrl}`);

  if (!gitUrl.includes('/git')) {
    await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(4000);
    gitUrl = page.url();
    console.log(`  URL (after goto): ${gitUrl}`);
  }

  const gitText = await getPageTextContent(page);
  console.log(`  Page text (first 200): ${gitText.substring(0, 200)}`);

  await page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('[class*="content"]');
    if (main) main.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  await ss(page, 'r2-16-git-top');

  await scrollMainContent(500);
  await ss(page, 'r2-17-git-mid');

  await scrollMainContent(500);
  await ss(page, 'r2-18-git-bottom');

  const gitCanvases = await countCanvases(page);
  console.log(`  Canvas count: ${gitCanvases}`);
  const gitDetails = await getCanvasDetails(page);
  gitDetails.forEach(c => console.log(`    [${c.index}] "${c.title}" ${c.w}x${c.h}`));

  // ========== SUMMARY ==========
  console.log('\n========== CONSOLE ERRORS ==========');
  let totalErrors = 0;
  for (const [pg, errors] of Object.entries(consoleErrors)) {
    if (errors.length > 0) {
      console.log(`  ${pg}: ${errors.length} errors`);
      errors.slice(0, 5).forEach((e, i) => console.log(`    [${i}] ${e}`));
      totalErrors += errors.length;
    }
  }
  if (totalErrors === 0) console.log('  (zero console errors)');

  console.log('\n========== CANVAS COUNT SUMMARY ==========');
  console.log(`  Overview:       ${overviewCanvases}`);
  console.log(`  Project Detail: ${projCanvases}`);
  console.log(`  Member Detail:  ${memberCanvases}`);
  console.log(`  Git Activity:   ${gitCanvases}`);
  console.log(`  TOTAL:          ${overviewCanvases + projCanvases + memberCanvases + gitCanvases}`);

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'results.json'), JSON.stringify({
    consoleErrors,
    canvasCounts: { overview: overviewCanvases, projectDetail: projCanvases, memberDetail: memberCanvases, gitActivity: gitCanvases },
    canvasDetails: { overview: overviewDetails, projectDetail: projDetails, memberDetail: memberDetails, gitActivity: gitDetails },
    chartContainers: chartInfo,
  }, null, 2));

  await browser.close();
  console.log('\n=== DONE ===');
})();
