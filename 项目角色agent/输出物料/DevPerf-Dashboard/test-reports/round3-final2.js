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
  // LOGIN - Robust approach
  // ============================================================
  currentPage = 'login';
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  // Fill credentials
  const inputs = await page.$$('input');
  log(`Found ${inputs.length} input elements`);
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder') || '';
    if (type === 'email' || placeholder.toLowerCase().includes('email')) {
      await input.fill(CREDENTIALS.email);
      log('Filled email');
    }
    if (type === 'password' || placeholder.toLowerCase().includes('password')) {
      await input.fill(CREDENTIALS.password);
      log('Filled password');
    }
  }

  await page.waitForTimeout(500);

  // Find submit button - more robust
  const buttons = await page.$$('button');
  let submitBtn = null;
  for (const btn of buttons) {
    const text = await btn.textContent();
    const type = await btn.getAttribute('type');
    const disabled = await btn.isDisabled();
    log(`Button: "${text.trim()}" type=${type} disabled=${disabled}`);
    if (!disabled && (type === 'submit' || text.toLowerCase().includes('sign') || text.toLowerCase().includes('login') || text.toLowerCase().includes('log in'))) {
      submitBtn = btn;
    }
  }

  if (submitBtn) {
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(() => {}),
      submitBtn.click()
    ]);
    await page.waitForTimeout(2000);
    log(`After login: ${page.url()}`);
  } else {
    // Fallback: press Enter in password field
    log('No submit button found, pressing Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    log(`After Enter: ${page.url()}`);
  }

  if (page.url().includes('/login')) {
    log('WARN: Still on login, trying to navigate directly...');
    // Maybe the app already persists session
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    log(`Direct nav: ${page.url()}`);
  }

  // ============================================================
  // B-20: Member Detail Pagination
  // ============================================================
  log('\n=== B-20: Member Detail Pagination ===');
  currentPage = 'member-detail';
  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const b20 = await page.evaluate(() => {
    const pagination = document.querySelectorAll('[class*="pagination"], [class*="Pagination"], .n-pagination');
    const allBtns = document.querySelectorAll('button');
    let numBtns = 0, navBtns = 0;
    allBtns.forEach(b => {
      const t = b.textContent.trim();
      if (/^\d+$/.test(t)) numBtns++;
      if (['<', '>', '<<', '>>', '\u2190', '\u2192'].includes(t) || t.toLowerCase().includes('next') || t.toLowerCase().includes('prev')) navBtns++;
    });

    const text = document.body.innerText;
    const pageInfo = text.match(/(\d+)\s*[-\u2013/]\s*(\d+)\s*(of|\/)\s*(\d+)/i);

    // Also check for n-data-table pagination (Naive UI auto-adds pagination)
    const nDataTable = document.querySelector('.n-data-table');
    const nPagination = document.querySelector('.n-pagination');

    // Check "Current Tasks" section specifically
    const sections = document.querySelectorAll('h2, h3, h4, [class*="title"], [class*="Title"], [class*="heading"], [class*="Heading"]');
    let taskSectionFound = false;
    sections.forEach(s => {
      if (s.textContent.toLowerCase().includes('task') || s.textContent.toLowerCase().includes('current')) {
        taskSectionFound = true;
      }
    });

    return {
      pagination: pagination.length,
      nPagination: !!nPagination,
      numBtns,
      navBtns,
      pageInfo: pageInfo ? pageInfo[0] : null,
      nDataTable: !!nDataTable,
      taskSectionFound,
      bodyExcerpt: text.substring(0, 1500)
    };
  });
  log(`B-20: ${JSON.stringify(b20, null, 2)}`);
  await screenshot('20-member-pagination-final');

  // ============================================================
  // B-25: Admin Sync Logs Status Colors
  // ============================================================
  log('\n=== B-25: Admin Sync Logs ===');
  currentPage = 'admin';
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Get admin page structure
  const adminStructure = await page.evaluate(() => {
    const text = document.body.innerText;
    const tabs = document.querySelectorAll('.n-tabs-tab, [role="tab"]');
    const tabTexts = Array.from(tabs).map(t => t.textContent.trim());
    return { tabTexts, bodyExcerpt: text.substring(0, 1000) };
  });
  log(`Admin structure: ${JSON.stringify(adminStructure)}`);

  // Click sync logs tab
  if (adminStructure.tabTexts.length > 0) {
    for (const tabText of adminStructure.tabTexts) {
      if (tabText.toLowerCase().includes('sync') || tabText.toLowerCase().includes('log')) {
        await page.click(`.n-tabs-tab >> text="${tabText}"`).catch(async () => {
          // Fallback click
          await page.evaluate((txt) => {
            const tabs = document.querySelectorAll('.n-tabs-tab, [role="tab"]');
            for (const tab of tabs) {
              if (tab.textContent.trim() === txt) { tab.click(); break; }
            }
          }, tabText);
        });
        log(`Clicked tab: ${tabText}`);
        break;
      }
    }
  }

  await page.waitForTimeout(2000);
  await screenshot('25-sync-logs-final');

  const b25 = await page.evaluate(() => {
    const text = document.body.innerText;

    // Find all tag/badge elements
    const tags = document.querySelectorAll('.n-tag, [class*="badge"], [class*="Badge"], [class*="status"], [class*="Status"]');
    const tagDetails = Array.from(tags).map(t => {
      const style = window.getComputedStyle(t);
      return {
        text: t.textContent.trim(),
        bg: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        class: t.className.toString().substring(0, 80)
      };
    }).filter(t => t.text.length > 0 && t.text.length < 30);

    // Also look for colored text (not in tags)
    const tds = document.querySelectorAll('td');
    const coloredTds = [];
    tds.forEach(td => {
      const style = window.getComputedStyle(td);
      const text = td.textContent.trim().toLowerCase();
      if (['success', 'error', 'failed', 'warning', 'partial'].some(s => text.includes(s))) {
        coloredTds.push({ text: td.textContent.trim(), color: style.color, bg: style.backgroundColor });
      }
    });

    // Check for sync log entries
    const tableRows = document.querySelectorAll('table tbody tr, .n-data-table-tr');

    return {
      tags: tagDetails.slice(0, 15),
      coloredTds: coloredTds.slice(0, 10),
      tableRows: tableRows.length,
      hasSuccess: text.toLowerCase().includes('success'),
      hasError: text.toLowerCase().includes('error') || text.toLowerCase().includes('failed'),
      bodyExcerpt: text.substring(0, 2000)
    };
  });
  log(`B-25: ${JSON.stringify(b25, null, 2)}`);

  // ============================================================
  // B-26: Overview Sprint Chart (check canvas)
  // ============================================================
  log('\n=== B-26: Overview Charts ===');
  currentPage = 'overview';
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const b26 = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    const canvasInfo = Array.from(canvases).map(c => ({
      width: c.width,
      height: c.height,
      clientW: c.clientWidth,
      clientH: c.clientHeight,
      parentClass: c.parentElement?.className.toString().substring(0, 80) || '',
      id: c.id || ''
    }));

    const svgs = document.querySelectorAll('svg');
    let svgBarData = [];
    svgs.forEach((svg, i) => {
      const rects = svg.querySelectorAll('rect');
      const lines = svg.querySelectorAll('line');
      const paths = svg.querySelectorAll('path');
      if (rects.length > 0 || paths.length > 3) {
        svgBarData.push({ idx: i, rects: rects.length, lines: lines.length, paths: paths.length, size: `${svg.clientWidth}x${svg.clientHeight}` });
      }
    });

    // Get all headings to understand page sections
    const headings = document.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="Title"]');
    const headingTexts = Array.from(headings).map(h => h.textContent.trim()).filter(t => t.length > 0 && t.length < 60);

    const text = document.body.innerText;
    const hasSprint = text.toLowerCase().includes('sprint');
    const hasDelivery = text.toLowerCase().includes('delivery');
    const hasRate = text.toLowerCase().includes('rate');

    return {
      canvases: canvasInfo,
      svgCharts: svgBarData,
      headings: headingTexts.slice(0, 15),
      hasSprint,
      hasDelivery,
      hasRate,
      bodyExcerpt: text.substring(0, 2500)
    };
  });
  log(`B-26: ${JSON.stringify(b26, null, 2)}`);
  await screenshot('26-overview-final');

  // ============================================================
  // B-13 DEEP: Git Activity Heatmap
  // ============================================================
  log('\n=== B-13 DEEP: Git Heatmap ===');
  currentPage = 'git';
  await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const b13 = await page.evaluate(() => {
    // Search broadly for heatmap indicators
    const allEls = document.querySelectorAll('*');
    let heatmapFound = false;
    let heatmapInfo = {};

    for (const el of allEls) {
      const cls = el.className.toString().toLowerCase();
      if (cls.includes('heatmap') || cls.includes('heat-map') || cls.includes('contribution') || cls.includes('calendar-heat')) {
        heatmapFound = true;
        const children = el.querySelectorAll('*');
        let colored = 0;
        const uniqueColors = new Set();
        children.forEach(c => {
          const bg = window.getComputedStyle(c).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
            colored++;
            uniqueColors.add(bg);
          }
        });

        heatmapInfo = {
          className: cls.substring(0, 100),
          children: children.length,
          colored,
          colors: Array.from(uniqueColors).slice(0, 10),
          hasCanvas: el.querySelectorAll('canvas').length > 0,
          hasSvg: el.querySelectorAll('svg').length > 0,
          size: `${el.clientWidth}x${el.clientHeight}`,
          text: el.textContent.trim().substring(0, 200)
        };
        break;
      }
    }

    // Also check for canvas-based heatmap
    const canvases = document.querySelectorAll('canvas');
    const canvasInfo = Array.from(canvases).map(c => ({
      width: c.width, height: c.height,
      parentClass: c.parentElement?.className.toString().substring(0, 80) || ''
    }));

    const text = document.body.innerText;

    return {
      heatmapFound,
      heatmapInfo,
      canvases: canvasInfo,
      bodyExcerpt: text.substring(0, 1500)
    };
  });
  log(`B-13: ${JSON.stringify(b13, null, 2)}`);
  await screenshot('13-git-final');

  // ============================================================
  // B-14 DEEP: Member Heatmap
  // ============================================================
  log('\n=== B-14 DEEP: Member Heatmap ===');
  currentPage = 'member-detail';
  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const b14 = await page.evaluate(() => {
    const allEls = document.querySelectorAll('*');
    let heatmapFound = false;
    let heatmapInfo = {};

    for (const el of allEls) {
      const cls = el.className.toString().toLowerCase();
      if (cls.includes('heatmap') || cls.includes('heat-map') || cls.includes('contribution') || cls.includes('calendar-heat')) {
        heatmapFound = true;
        const children = el.querySelectorAll('*');
        let colored = 0;
        const uniqueColors = new Set();
        children.forEach(c => {
          const bg = window.getComputedStyle(c).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
            colored++;
            uniqueColors.add(bg);
          }
        });

        heatmapInfo = {
          className: cls.substring(0, 100),
          children: children.length,
          colored,
          colors: Array.from(uniqueColors).slice(0, 10),
          hasCanvas: el.querySelectorAll('canvas').length > 0,
          hasSvg: el.querySelectorAll('svg').length > 0,
          size: `${el.clientWidth}x${el.clientHeight}`,
          text: el.textContent.trim().substring(0, 200)
        };
        break;
      }
    }

    const canvases = document.querySelectorAll('canvas');
    const canvasInfo = Array.from(canvases).map(c => ({
      width: c.width, height: c.height,
      parentClass: c.parentElement?.className.toString().substring(0, 80) || ''
    }));

    return {
      heatmapFound,
      heatmapInfo,
      canvases: canvasInfo
    };
  });
  log(`B-14: ${JSON.stringify(b14, null, 2)}`);
  await screenshot('14-member-final');

  // ============================================================
  // Project List Click -> Detail Navigation
  // ============================================================
  log('\n=== Project Click Nav ===');
  currentPage = 'projects';
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const projLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/projects/"]');
    return Array.from(links).map(l => ({
      href: l.getAttribute('href'),
      text: l.textContent.trim().substring(0, 50)
    })).slice(0, 5);
  });
  log(`Project links: ${JSON.stringify(projLinks)}`);

  if (projLinks.length > 0) {
    await page.click(`a[href="${projLinks[0].href}"]`);
    await page.waitForTimeout(2000);
    log(`Navigated to: ${page.url()}`);
    await screenshot('proj-click-nav-final');
  }

  // ============================================================
  // CONSOLE ERRORS
  // ============================================================
  log('\n=== Console Errors ===');
  let totalErrors = 0;
  for (const [pageName, errors] of Object.entries(consoleErrorsByPage)) {
    if (errors.length > 0) {
      totalErrors += errors.length;
      log(`  ${pageName}: ${errors.length} errors`);
      errors.slice(0, 3).forEach((e, i) => log(`    ${i+1}. ${e}`));
    }
  }
  if (totalErrors === 0) log('  Zero console errors across all pages');

  await browser.close();
  log('\n=== ALL CHECKS COMPLETE ===');
})();
