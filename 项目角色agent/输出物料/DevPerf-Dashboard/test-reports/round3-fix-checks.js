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

  // Collect all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text(), url: page.url() });
  });

  async function screenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    log(`Screenshot: ${name}.png`);
  }

  // ============================================================
  // LOGIN FIRST
  // ============================================================
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const passwordInput = await page.$('input[type="password"]');
  if (emailInput && passwordInput) {
    await emailInput.fill(CREDENTIALS.email);
    await passwordInput.fill(CREDENTIALS.password);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
  }
  log(`After login URL: ${page.url()}`);

  // ============================================================
  // RE-CHECK B-20: Member Detail pagination (fixed selector)
  // ============================================================
  log('=== B-20: Member Detail Pagination ===');
  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const paginationInfo = await page.evaluate(() => {
    const paginationEls = document.querySelectorAll('[class*="pagination"], [class*="Pagination"], [class*="pager"], [class*="Pager"]');

    // Check for numbered page buttons (digits only)
    const allButtons = document.querySelectorAll('button');
    let pageNumberBtns = 0;
    let nextPrevBtns = 0;
    allButtons.forEach(b => {
      const text = b.textContent.trim().toLowerCase();
      if (/^\d+$/.test(text)) pageNumberBtns++;
      if (text === 'next' || text === 'previous' || text === 'prev' || text === '>' || text === '<' || text === '>>' || text === '<<') nextPrevBtns++;
    });

    // Check for "showing X of Y" or "X - Y of Z" pattern
    const bodyText = document.body.innerText;
    const showingMatch = bodyText.match(/(\d+)\s*[-–]\s*(\d+)\s+of\s+(\d+)/i) || bodyText.match(/showing\s+(\d+)/i) || bodyText.match(/page\s+(\d+)/i);

    // Check for SVG icons that look like pagination arrows
    const svgArrows = document.querySelectorAll('[class*="pagination"] svg, [class*="Pagination"] svg');

    // Check for "Rows per page" or similar
    const hasRowsPerPage = bodyText.toLowerCase().includes('rows per page') || bodyText.toLowerCase().includes('per page');

    return {
      paginationElements: paginationEls.length,
      pageNumberBtns,
      nextPrevBtns,
      svgArrows: svgArrows.length,
      showingText: showingMatch ? showingMatch[0] : null,
      hasRowsPerPage,
      bodySnippet: bodyText.substring(0, 1000)
    };
  });
  log(`B-20 result: ${JSON.stringify(paginationInfo, null, 2)}`);
  await screenshot('07b-member-detail-pagination-check');

  // ============================================================
  // RE-CHECK B-25: Admin Sync Logs status colors
  // ============================================================
  log('=== B-25: Admin Sync Logs ===');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Get all tab-like elements and their text
  const tabsInfo = await page.evaluate(() => {
    const tabs = document.querySelectorAll('[role="tab"], button, a, [class*="tab"], [class*="Tab"]');
    return Array.from(tabs).map(t => ({
      text: t.textContent.trim(),
      tag: t.tagName,
      className: t.className.toString().substring(0, 80)
    })).filter(t => t.text.length > 0 && t.text.length < 50);
  });
  log(`Admin tabs: ${JSON.stringify(tabsInfo.slice(0, 15))}`);

  // Click sync logs tab
  const clickedSync = await page.evaluate(() => {
    const elements = document.querySelectorAll('[role="tab"], button, a, [class*="tab"], [class*="Tab"]');
    for (const el of elements) {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('sync') || text.includes('log')) {
        el.click();
        return text;
      }
    }
    return null;
  });
  log(`Clicked sync tab: ${clickedSync}`);
  await page.waitForTimeout(2000);
  await screenshot('10b-admin-sync-logs-detail');

  // Comprehensive status badge search
  const statusInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const bodyHtml = document.body.innerHTML;

    // Search for status-related text patterns
    const statusPatterns = ['success', 'error', 'failed', 'completed', 'running', 'pending', 'warning'];
    const foundPatterns = statusPatterns.filter(p => bodyText.toLowerCase().includes(p));

    // Find ALL elements and check for colored backgrounds
    const allSpans = document.querySelectorAll('span, td, div, p');
    const coloredElements = [];

    allSpans.forEach(el => {
      const text = el.textContent.trim().toLowerCase();
      if (text.length > 0 && text.length < 20) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        const borderColor = style.borderColor;

        // Check if it has a non-default background
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' && bg !== 'transparent') {
          if (statusPatterns.some(p => text.includes(p))) {
            coloredElements.push({
              text: el.textContent.trim(),
              bg,
              color,
              tag: el.tagName,
              className: el.className.toString().substring(0, 60)
            });
          }
        }
      }
    });

    // Check for badge/chip/tag specific classes
    const badges = document.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="chip"], [class*="Chip"], [class*="tag"], [class*="Tag"], [class*="label"], [class*="Label"], [class*="status"], [class*="Status"]');
    const badgeInfo = Array.from(badges).map(b => {
      const style = window.getComputedStyle(b);
      return {
        text: b.textContent.trim(),
        bg: style.backgroundColor,
        color: style.color,
        className: b.className.toString().substring(0, 60)
      };
    }).filter(b => b.text.length > 0 && b.text.length < 30);

    return {
      foundPatterns,
      coloredElements: coloredElements.slice(0, 10),
      badges: badgeInfo.slice(0, 10),
      bodyTextExcerpt: bodyText.substring(0, 2000)
    };
  });
  log(`B-25 status info: ${JSON.stringify(statusInfo, null, 2)}`);

  // ============================================================
  // RE-CHECK B-26: Overview bar chart (check for Canvas instead of SVG)
  // ============================================================
  log('=== B-26: Overview Sprint Delivery Bar Chart ===');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const chartInfo = await page.evaluate(() => {
    // Check for canvas elements (Chart.js uses canvas)
    const canvases = document.querySelectorAll('canvas');

    // Check for SVG-based charts
    const svgs = document.querySelectorAll('svg');
    let svgRects = 0;
    svgs.forEach(svg => {
      svgRects += svg.querySelectorAll('rect').length;
    });

    // Check for recharts
    const rechartsEls = document.querySelectorAll('[class*="recharts"]');

    // Check for chart containers
    const chartContainers = document.querySelectorAll('[class*="chart"], [class*="Chart"], [class*="sprint"], [class*="Sprint"], [class*="delivery"], [class*="Delivery"], [class*="bar"], [class*="Bar"]');
    const containerInfo = Array.from(chartContainers).map(c => ({
      className: c.className.toString().substring(0, 80),
      hasCanvas: c.querySelectorAll('canvas').length,
      hasSvg: c.querySelectorAll('svg').length,
      innerHTML: c.innerHTML.substring(0, 200)
    }));

    // Check body text for sprint/delivery related content
    const bodyText = document.body.innerText;
    const hasSprintText = bodyText.toLowerCase().includes('sprint') || bodyText.toLowerCase().includes('delivery');

    return {
      canvasCount: canvases.length,
      svgCount: svgs.length,
      svgRects,
      rechartsCount: rechartsEls.length,
      chartContainers: containerInfo.slice(0, 5),
      hasSprintText,
      bodyTextExcerpt: bodyText.substring(0, 1500)
    };
  });
  log(`B-26 chart info: ${JSON.stringify(chartInfo, null, 2)}`);
  await screenshot('02b-overview-chart-detail');

  // ============================================================
  // B-13/B-14 DEEP CHECK: Verify heatmaps have actual colored content
  // ============================================================
  log('=== B-13 DEEP CHECK: Git Heatmap ===');
  await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const gitHeatmapDeep = await page.evaluate(() => {
    const heatmapEl = document.querySelector('[class*="heatmap"], [class*="Heatmap"], [class*="contribution"], [class*="Contribution"], [class*="heat"], [class*="Heat"]');
    if (!heatmapEl) return { found: false };

    // Check for child elements with background colors
    const children = heatmapEl.querySelectorAll('*');
    let coloredCount = 0;
    let totalChildren = children.length;
    const colors = new Set();

    children.forEach(child => {
      const style = window.getComputedStyle(child);
      const bg = style.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        coloredCount++;
        colors.add(bg);
      }
    });

    // Also check canvas
    const canvases = heatmapEl.querySelectorAll('canvas');

    // Check innerHTML size (real heatmap has substantial markup)
    const innerHtmlSize = heatmapEl.innerHTML.length;

    // Check for tooltip/title attributes
    const titledEls = heatmapEl.querySelectorAll('[title], [data-tooltip]');

    return {
      found: true,
      totalChildren,
      coloredCount,
      uniqueColors: Array.from(colors).slice(0, 10),
      canvasCount: canvases.length,
      innerHtmlSize,
      titledElements: titledEls.length,
      outerHtml: heatmapEl.outerHTML.substring(0, 500),
      textContent: heatmapEl.textContent.trim().substring(0, 200)
    };
  });
  log(`B-13 deep check: ${JSON.stringify(gitHeatmapDeep, null, 2)}`);
  await screenshot('09b-git-heatmap-deep');

  log('=== B-14 DEEP CHECK: Member Heatmap ===');
  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const memberHeatmapDeep = await page.evaluate(() => {
    const heatmapEl = document.querySelector('[class*="heatmap"], [class*="Heatmap"], [class*="contribution"], [class*="Contribution"], [class*="heat"], [class*="Heat"]');
    if (!heatmapEl) return { found: false };

    const children = heatmapEl.querySelectorAll('*');
    let coloredCount = 0;
    const colors = new Set();

    children.forEach(child => {
      const style = window.getComputedStyle(child);
      const bg = style.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        coloredCount++;
        colors.add(bg);
      }
    });

    const canvases = heatmapEl.querySelectorAll('canvas');
    const innerHtmlSize = heatmapEl.innerHTML.length;

    return {
      found: true,
      totalChildren: children.length,
      coloredCount,
      uniqueColors: Array.from(colors).slice(0, 10),
      canvasCount: canvases.length,
      innerHtmlSize,
      textContent: heatmapEl.textContent.trim().substring(0, 200)
    };
  });
  log(`B-14 deep check: ${JSON.stringify(memberHeatmapDeep, null, 2)}`);
  await screenshot('07c-member-heatmap-deep');

  // ============================================================
  // CONSOLE ERRORS SUMMARY
  // ============================================================
  const errors = consoleMessages.filter(m => m.type === 'error');
  log(`\nTotal console errors: ${errors.length}`);
  errors.forEach((e, i) => {
    log(`  Error ${i+1}: ${e.text.substring(0, 150)} (on ${e.url})`);
  });

  await browser.close();
  log('\n=== FIX CHECKS COMPLETE ===');
})();
