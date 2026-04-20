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

  const consoleErrorsByPage = {};
  let currentPage = '';
  page.on('console', msg => {
    if (msg.type() === 'error') {
      if (!consoleErrorsByPage[currentPage]) consoleErrorsByPage[currentPage] = [];
      consoleErrorsByPage[currentPage].push(msg.text().substring(0, 200));
    }
  });

  async function screenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    log(`Screenshot: ${name}.png`);
  }

  // ============================================================
  // LOGIN
  // ============================================================
  currentPage = 'login';
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  const emailInput = await page.$('input[type="email"]') || await page.$('input[placeholder*="email" i]');
  const passwordInput = await page.$('input[type="password"]');
  await emailInput.fill(CREDENTIALS.email);
  await passwordInput.fill(CREDENTIALS.password);
  await page.waitForTimeout(500);
  const submitBtn = await page.$('button[type="submit"]');
  await Promise.all([
    page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }),
    submitBtn.click()
  ]);
  await page.waitForTimeout(2000);
  log(`Logged in. URL: ${page.url()}`);

  // ============================================================
  // TEST B-20: Member Detail Pagination
  // ============================================================
  log('\n=== B-20: Member Detail Pagination ===');
  currentPage = 'member-detail';
  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const paginationResult = await page.evaluate(() => {
    // Check for pagination components
    const paginationEls = document.querySelectorAll('[class*="pagination"], [class*="Pagination"], [class*="pager"], [class*="Pager"]');

    // Check for numbered buttons
    const allButtons = document.querySelectorAll('button');
    let pageNumberBtns = 0;
    let navBtns = 0;
    const btnTexts = [];
    allButtons.forEach(b => {
      const text = b.textContent.trim();
      if (/^\d+$/.test(text)) { pageNumberBtns++; btnTexts.push(text); }
      const lower = text.toLowerCase();
      if (['next', 'previous', 'prev', '>', '<', '>>', '<<'].includes(lower) ||
          text.includes('\u2190') || text.includes('\u2192') || text.includes('\u25C0') || text.includes('\u25B6')) {
        navBtns++;
        btnTexts.push(text);
      }
    });

    // Check for "X of Y" pattern in text
    const bodyText = document.body.innerText;
    const ofMatch = bodyText.match(/(\d+)\s*[-\u2013]\s*(\d+)\s+of\s+(\d+)/i);
    const pageMatch = bodyText.match(/page\s+(\d+)/i);
    const showingMatch = bodyText.match(/showing\s+(\d+)/i);

    // Check for rows per page
    const hasPerPage = bodyText.toLowerCase().includes('per page') || bodyText.toLowerCase().includes('rows per');

    // Check for n-pagination (Naive UI pagination component)
    const naivePagination = document.querySelectorAll('.n-pagination');

    return {
      paginationElements: paginationEls.length,
      naivePagination: naivePagination.length,
      pageNumberBtns,
      navBtns,
      btnTexts: btnTexts.slice(0, 10),
      ofMatch: ofMatch ? ofMatch[0] : null,
      pageMatch: pageMatch ? pageMatch[0] : null,
      showingMatch: showingMatch ? showingMatch[0] : null,
      hasPerPage
    };
  });
  log(`B-20: ${JSON.stringify(paginationResult)}`);
  await screenshot('20-member-pagination');

  // ============================================================
  // TEST B-25: Admin Sync Logs Status Colors
  // ============================================================
  log('\n=== B-25: Admin Sync Logs Status Colors ===');
  currentPage = 'admin';
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot('25-admin-before-tab');

  // Find and click Sync Logs tab
  const tabInfo = await page.evaluate(() => {
    // Look for tab elements
    const allClickable = document.querySelectorAll('[role="tab"], .n-tabs-tab, [class*="tab-"], [class*="Tab"]');
    const tabTexts = Array.from(allClickable).map(el => el.textContent.trim());

    // Try to click sync logs tab
    for (const el of allClickable) {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('sync') || text.includes('log')) {
        el.click();
        return { clicked: true, text: el.textContent.trim(), allTabs: tabTexts };
      }
    }

    // Fallback: look in ALL elements
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.children.length === 0 || el.children.length === 1) {
        const text = el.textContent.trim().toLowerCase();
        if ((text.includes('sync') || text.includes('log')) && text.length < 30) {
          el.click();
          return { clicked: true, text: el.textContent.trim(), method: 'fallback', allTabs: tabTexts };
        }
      }
    }

    return { clicked: false, allTabs: tabTexts };
  });
  log(`Tab click: ${JSON.stringify(tabInfo)}`);
  await page.waitForTimeout(2000);
  await screenshot('25-admin-sync-logs');

  // Now check status colors
  const syncLogsStatus = await page.evaluate(() => {
    const bodyText = document.body.innerText;

    // Find status-related text elements with color info
    const allElements = document.querySelectorAll('*');
    const statusElements = [];

    for (const el of allElements) {
      // Only leaf or near-leaf elements
      if (el.children.length > 3) continue;
      const text = el.textContent.trim().toLowerCase();
      if (text.length === 0 || text.length > 30) continue;

      const isStatus = ['success', 'error', 'failed', 'completed', 'running', 'pending', 'warning', 'partial'].some(s => text.includes(s));
      if (!isStatus) continue;

      const style = window.getComputedStyle(el);
      statusElements.push({
        text: el.textContent.trim(),
        bg: style.backgroundColor,
        color: style.color,
        tag: el.tagName,
        className: el.className.toString().substring(0, 80),
        borderColor: style.borderColor
      });
    }

    // Check for table rows in sync logs
    const tableRows = document.querySelectorAll('table tbody tr, .n-data-table-tr');
    const rowCount = tableRows.length;

    // Check for n-tag elements (Naive UI tags/badges)
    const nTags = document.querySelectorAll('.n-tag');
    const tagInfo = Array.from(nTags).map(t => ({
      text: t.textContent.trim(),
      bg: window.getComputedStyle(t).backgroundColor,
      color: window.getComputedStyle(t).color,
      className: t.className.substring(0, 80)
    }));

    return {
      statusElements: statusElements.slice(0, 15),
      tableRows: rowCount,
      nTags: tagInfo.slice(0, 10),
      hasSuccessText: bodyText.includes('success') || bodyText.includes('Success'),
      hasErrorText: bodyText.includes('error') || bodyText.includes('Error') || bodyText.includes('failed'),
      bodyExcerpt: bodyText.substring(0, 2000)
    };
  });
  log(`B-25: ${JSON.stringify(syncLogsStatus, null, 2)}`);

  // ============================================================
  // TEST B-26: Overview Sprint Delivery Chart (Canvas-based?)
  // ============================================================
  log('\n=== B-26: Overview Sprint Bar Chart ===');
  currentPage = 'overview';
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const overviewCharts = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    const svgs = document.querySelectorAll('svg');
    const bodyText = document.body.innerText;

    // Get all chart-related info
    const chartContainers = document.querySelectorAll('[class*="chart"], [class*="Chart"]');
    const containers = Array.from(chartContainers).map(c => ({
      className: c.className.toString().substring(0, 100),
      hasCanvas: c.querySelectorAll('canvas').length,
      hasSvg: c.querySelectorAll('svg').length,
      size: `${c.clientWidth}x${c.clientHeight}`
    }));

    // Count SVG rects that could be bar chart bars
    let svgBarInfo = [];
    svgs.forEach((svg, idx) => {
      const rects = svg.querySelectorAll('rect');
      if (rects.length > 0) {
        svgBarInfo.push({ svgIdx: idx, rectCount: rects.length, size: `${svg.clientWidth}x${svg.clientHeight}` });
      }
    });

    // Check for sprint/delivery keywords
    const hasSprintDelivery = bodyText.toLowerCase().includes('sprint') || bodyText.toLowerCase().includes('delivery');
    const hasBarData = bodyText.match(/\d+%/) !== null;

    return {
      canvasCount: canvases.length,
      svgCount: svgs.length,
      svgBarInfo,
      chartContainers: containers,
      hasSprintDelivery,
      hasBarData,
      bodyExcerpt: bodyText.substring(0, 2000)
    };
  });
  log(`B-26: ${JSON.stringify(overviewCharts, null, 2)}`);
  await screenshot('26-overview-charts');

  // ============================================================
  // DEEP CHECK B-13: Git Activity heatmap content
  // ============================================================
  log('\n=== B-13 DEEP: Git Heatmap Content ===');
  currentPage = 'git';
  await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const gitDeep = await page.evaluate(() => {
    // Find the heatmap element(s)
    const selectors = ['[class*="heatmap"]', '[class*="Heatmap"]', '[class*="contribution"]', '[class*="Contribution"]', '[class*="heat"]', '[class*="Heat"]', '[class*="calendar-heat"]'];
    let heatmapEl = null;
    for (const sel of selectors) {
      heatmapEl = document.querySelector(sel);
      if (heatmapEl) break;
    }

    if (!heatmapEl) {
      // Check all page content for heatmap indicators
      const bodyText = document.body.innerText;
      const allClasses = Array.from(document.querySelectorAll('*')).map(e => e.className.toString()).filter(c => c.length > 0);
      const heatRelated = allClasses.filter(c => c.toLowerCase().includes('heat') || c.toLowerCase().includes('calendar') || c.toLowerCase().includes('contribution'));
      return {
        found: false,
        heatRelatedClasses: heatRelated.slice(0, 10),
        bodySnippet: bodyText.substring(0, 500)
      };
    }

    // Analyze the heatmap element
    const children = heatmapEl.querySelectorAll('*');
    let coloredChildren = 0;
    const colors = new Set();
    children.forEach(child => {
      const bg = window.getComputedStyle(child).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        coloredChildren++;
        colors.add(bg);
      }
    });

    // Check for canvas
    const canvas = heatmapEl.querySelector('canvas');

    // Check for SVG
    const svg = heatmapEl.querySelector('svg');
    let svgRects = 0;
    if (svg) svgRects = svg.querySelectorAll('rect').length;

    return {
      found: true,
      className: heatmapEl.className.toString(),
      totalChildren: children.length,
      coloredChildren,
      uniqueColors: Array.from(colors).slice(0, 15),
      hasCanvas: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      hasSvg: !!svg,
      svgRects,
      innerHTML: heatmapEl.innerHTML.substring(0, 800),
      textContent: heatmapEl.textContent.trim().substring(0, 200)
    };
  });
  log(`B-13 deep: ${JSON.stringify(gitDeep, null, 2)}`);
  await screenshot('13-git-heatmap-deep');

  // ============================================================
  // DEEP CHECK B-14: Member Detail heatmap content
  // ============================================================
  log('\n=== B-14 DEEP: Member Heatmap Content ===');
  currentPage = 'member-detail';
  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const memberDeep = await page.evaluate(() => {
    const selectors = ['[class*="heatmap"]', '[class*="Heatmap"]', '[class*="contribution"]', '[class*="Contribution"]', '[class*="heat"]', '[class*="Heat"]', '[class*="calendar"]'];
    let heatmapEl = null;
    for (const sel of selectors) {
      heatmapEl = document.querySelector(sel);
      if (heatmapEl) break;
    }

    if (!heatmapEl) {
      const allClasses = Array.from(document.querySelectorAll('*')).map(e => e.className.toString()).filter(c => c.length > 0);
      const heatRelated = allClasses.filter(c => c.toLowerCase().includes('heat') || c.toLowerCase().includes('calendar') || c.toLowerCase().includes('contribution'));
      return { found: false, heatRelatedClasses: heatRelated.slice(0, 10) };
    }

    const children = heatmapEl.querySelectorAll('*');
    let coloredChildren = 0;
    const colors = new Set();
    children.forEach(child => {
      const bg = window.getComputedStyle(child).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        coloredChildren++;
        colors.add(bg);
      }
    });

    const canvas = heatmapEl.querySelector('canvas');
    const svg = heatmapEl.querySelector('svg');

    return {
      found: true,
      className: heatmapEl.className.toString(),
      totalChildren: children.length,
      coloredChildren,
      uniqueColors: Array.from(colors).slice(0, 15),
      hasCanvas: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      hasSvg: !!svg,
      innerHTML: heatmapEl.innerHTML.substring(0, 800),
      textContent: heatmapEl.textContent.trim().substring(0, 200)
    };
  });
  log(`B-14 deep: ${JSON.stringify(memberDeep, null, 2)}`);
  await screenshot('14-member-heatmap-deep');

  // ============================================================
  // PROJECT LIST -> CLICK -> DETAIL (with logged-in session)
  // ============================================================
  log('\n=== Project List Click Navigation ===');
  currentPage = 'projects';
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot('proj-list-before-click');

  // Try clicking a table row
  const clickNav = await page.evaluate(() => {
    // Find clickable rows with project links
    const links = document.querySelectorAll('a[href*="/projects/"]');
    if (links.length > 0) {
      return { method: 'link', href: links[0].getAttribute('href'), text: links[0].textContent.trim().substring(0, 50), count: links.length };
    }

    const rows = document.querySelectorAll('table tbody tr, .n-data-table-tr');
    if (rows.length > 0) {
      rows[0].click();
      return { method: 'row-click', count: rows.length };
    }

    return { method: 'none' };
  });
  log(`Click nav info: ${JSON.stringify(clickNav)}`);

  if (clickNav.method === 'link' && clickNav.href) {
    await page.click(`a[href="${clickNav.href}"]`);
    await page.waitForTimeout(2000);
  }

  const afterClickUrl = page.url();
  log(`After click URL: ${afterClickUrl}`);
  await screenshot('proj-detail-after-click');

  // ============================================================
  // CONSOLE ERRORS SUMMARY
  // ============================================================
  log('\n=== Console Errors Summary ===');
  for (const [pageName, errors] of Object.entries(consoleErrorsByPage)) {
    if (errors.length > 0) {
      log(`  ${pageName}: ${errors.length} errors`);
      errors.forEach((e, i) => log(`    ${i+1}. ${e}`));
    }
  }
  if (Object.keys(consoleErrorsByPage).length === 0) {
    log('  No console errors detected on any page');
  }

  await browser.close();
  log('\n=== FINAL CHECKS COMPLETE ===');
})();
