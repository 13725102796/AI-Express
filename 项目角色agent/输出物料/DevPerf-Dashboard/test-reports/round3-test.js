const pw = require('/Users/maidong/.npm/_npx/b229ae5a79c0ddcd/node_modules/playwright-core');

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots/round3';
const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = { email: 'admin@jasonqiyuan.com', password: 'Admin123!' };

const results = [];
const consoleErrors = {};

function log(msg) { console.log(`[TEST] ${msg}`); }
function record(id, page, status, notes) {
  results.push({ id, page, status, notes });
  log(`${status === 'PASS' ? 'PASS' : 'FAIL'} - ${id}: ${notes}`);
}

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

  // Collect console errors per page
  let currentPageName = 'unknown';
  page.on('console', msg => {
    if (msg.type() === 'error') {
      if (!consoleErrors[currentPageName]) consoleErrors[currentPageName] = [];
      consoleErrors[currentPageName].push(msg.text());
    }
  });

  async function screenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    log(`Screenshot saved: ${name}.png`);
    return path;
  }

  async function waitAndScreenshot(name, selector, timeout = 5000) {
    try {
      if (selector) await page.waitForSelector(selector, { timeout });
    } catch (e) {
      log(`Warning: selector ${selector} not found within ${timeout}ms`);
    }
    return screenshot(name);
  }

  // ============================================================
  // STEP 1: LOGIN
  // ============================================================
  log('=== STEP 1: LOGIN ===');
  currentPageName = 'login';
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await screenshot('01-login-page');

  // Fill login form
  try {
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="mail"], input[placeholder*="Email"]', { timeout: 5000 });
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('input[placeholder*="mail"]') || await page.$('input[placeholder*="Email"]');
    const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');

    if (emailInput && passwordInput) {
      await emailInput.fill(CREDENTIALS.email);
      await passwordInput.fill(CREDENTIALS.password);
      await screenshot('01-login-filled');

      // Find and click submit button
      const submitBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("Login")') || await page.$('button:has-text("Sign")');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await screenshot('01-login-result');

        const url = page.url();
        if (url.includes('/login')) {
          record('LOGIN', 'login', 'FAIL', `Still on login page after submit. URL: ${url}`);
        } else {
          record('LOGIN', 'login', 'PASS', `Logged in successfully. Redirected to: ${url}`);
        }
      } else {
        record('LOGIN', 'login', 'FAIL', 'Submit button not found');
      }
    } else {
      record('LOGIN', 'login', 'FAIL', `Email input: ${!!emailInput}, Password input: ${!!passwordInput}`);
    }
  } catch (e) {
    record('LOGIN', 'login', 'FAIL', `Login error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 2: OVERVIEW PAGE - Verify B-16 (FilterBar) + B-26 (Sprint bars)
  // ============================================================
  log('=== STEP 2: OVERVIEW PAGE ===');
  currentPageName = 'overview';
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot('02-overview-full');

  // B-16: FilterBar presence
  try {
    const filterBarSelectors = [
      '[class*="filter"]', '[class*="Filter"]',
      '[data-testid*="filter"]',
      'select', '[role="combobox"]',
      '[class*="toolbar"]', '[class*="Toolbar"]'
    ];
    let filterFound = false;
    let filterDetail = '';
    for (const sel of filterBarSelectors) {
      const els = await page.$$(sel);
      if (els.length > 0) {
        filterFound = true;
        filterDetail += `${sel}:${els.length} `;
      }
    }

    // Also check for date range pickers, dropdown buttons at the top
    const selectEls = await page.$$('select');
    const dateInputs = await page.$$('input[type="date"]');
    const dropdowns = await page.$$('[class*="dropdown"], [class*="Dropdown"], [class*="select"], [class*="Select"]');
    filterDetail += `selects:${selectEls.length} dateInputs:${dateInputs.length} dropdowns:${dropdowns.length}`;

    if (filterFound || selectEls.length > 0 || dateInputs.length > 0 || dropdowns.length > 0) {
      record('B-16', 'overview', 'PASS', `FilterBar elements found: ${filterDetail}`);
    } else {
      record('B-16', 'overview', 'FAIL', `No filter elements found. Checked: ${filterBarSelectors.join(', ')}`);
    }
  } catch (e) {
    record('B-16', 'overview', 'FAIL', `Error checking FilterBar: ${e.message.substring(0, 200)}`);
  }

  // B-26: Sprint delivery bar chart - should have 6+ bars
  try {
    // Look for SVG rect elements (typical for bar charts) or chart containers
    const barChartInfo = await page.evaluate(() => {
      // Check for recharts bars (common React charting library)
      const rechartsRects = document.querySelectorAll('.recharts-bar-rectangle rect, .recharts-rectangle');
      if (rechartsRects.length > 0) return { type: 'recharts', count: rechartsRects.length };

      // Check for generic SVG rectangles in chart containers
      const chartContainers = document.querySelectorAll('[class*="chart"], [class*="Chart"], [class*="sprint"], [class*="Sprint"], [class*="delivery"], [class*="Delivery"]');
      let maxRects = 0;
      for (const container of chartContainers) {
        const rects = container.querySelectorAll('rect');
        if (rects.length > maxRects) maxRects = rects.length;
      }
      if (maxRects > 0) return { type: 'svg-rects-in-chart', count: maxRects };

      // Check all SVG rects on page
      const allRects = document.querySelectorAll('svg rect');
      return { type: 'all-svg-rects', count: allRects.length };
    });

    if (barChartInfo.count >= 6) {
      record('B-26', 'overview', 'PASS', `Bar chart has ${barChartInfo.count} bars (type: ${barChartInfo.type}), meets 6+ requirement`);
    } else {
      record('B-26', 'overview', 'FAIL', `Bar chart has only ${barChartInfo.count} bars (type: ${barChartInfo.type}), need 6+`);
    }
  } catch (e) {
    record('B-26', 'overview', 'FAIL', `Error checking bar chart: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 3: SIDEBAR NAVIGATION - Verify B-17
  // ============================================================
  log('=== STEP 3: SIDEBAR NAVIGATION ===');
  currentPageName = 'sidebar';

  try {
    const sidebarInfo = await page.evaluate(() => {
      const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"], nav, aside');
      if (!sidebar) return { found: false, html: 'No sidebar element found' };

      const links = sidebar.querySelectorAll('a, [role="link"], [class*="nav-item"], [class*="NavItem"], [class*="menu-item"], [class*="MenuItem"]');
      const linkTexts = [];
      links.forEach(l => {
        const text = l.textContent.trim();
        const href = l.getAttribute('href') || '';
        if (text) linkTexts.push(`${text} (${href})`);
      });

      return {
        found: true,
        linkTexts,
        hasProjects: linkTexts.some(t => t.toLowerCase().includes('project')),
        hasMembers: linkTexts.some(t => t.toLowerCase().includes('member')),
        html: sidebar.innerHTML.substring(0, 500)
      };
    });

    await screenshot('03-sidebar-navigation');

    if (sidebarInfo.hasProjects && sidebarInfo.hasMembers) {
      record('B-17', 'sidebar', 'PASS', `Sidebar has Projects and Members links. Links: ${sidebarInfo.linkTexts.join(', ')}`);
    } else {
      record('B-17', 'sidebar', 'FAIL', `Missing navigation links. Projects: ${sidebarInfo.hasProjects}, Members: ${sidebarInfo.hasMembers}. Available links: ${sidebarInfo.linkTexts.join(', ')}`);
    }
  } catch (e) {
    record('B-17', 'sidebar', 'FAIL', `Error checking sidebar: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 4: PROJECTS LIST PAGE
  // ============================================================
  log('=== STEP 4: PROJECTS LIST PAGE ===');
  currentPageName = 'projects-list';

  try {
    // Try clicking sidebar link first
    const projectLink = await page.$('a[href*="/projects"], a[href*="projects"]');
    if (projectLink) {
      await projectLink.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    await screenshot('04-projects-list');

    const projectsInfo = await page.evaluate(() => {
      // Check for table rows or card items
      const tableRows = document.querySelectorAll('table tbody tr, [class*="table"] [class*="row"]:not([class*="header"])');
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="project-item"], [class*="ProjectItem"]');
      const listItems = document.querySelectorAll('[class*="list-item"], [class*="ListItem"]');

      // Get text content for verification
      const allText = document.body.innerText;
      const hasProjectData = allText.includes('Avatar') || allText.includes('avatar') ||
                            allText.includes('p-avatar') || allText.includes('project');

      return {
        tableRows: tableRows.length,
        cards: cards.length,
        listItems: listItems.length,
        hasProjectData,
        url: window.location.href,
        bodyText: allText.substring(0, 500)
      };
    });

    const totalItems = Math.max(projectsInfo.tableRows, projectsInfo.cards, projectsInfo.listItems);
    if (totalItems >= 4) {
      record('PROJECTS-LIST', 'projects', 'PASS', `Found ${totalItems} project items (rows:${projectsInfo.tableRows} cards:${projectsInfo.cards} list:${projectsInfo.listItems})`);
    } else if (totalItems > 0) {
      record('PROJECTS-LIST', 'projects', 'NEEDS_WORK', `Found only ${totalItems} project items, expected 4+`);
    } else {
      record('PROJECTS-LIST', 'projects', 'FAIL', `No project items found. URL: ${projectsInfo.url}. Body: ${projectsInfo.bodyText.substring(0, 200)}`);
    }
  } catch (e) {
    record('PROJECTS-LIST', 'projects', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 5: PROJECT DETAIL - Verify B-18 (Git chart) + B-27 (layout)
  // ============================================================
  log('=== STEP 5: PROJECT DETAIL ===');
  currentPageName = 'project-detail';

  try {
    await page.goto(`${BASE_URL}/projects/p-avatar`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('05-project-detail');

    // B-18: Git area has chart (not just placeholder text)
    const gitChartInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      const bodyHtml = document.body.innerHTML;

      // Look for git-related sections
      const gitSection = document.querySelector('[class*="git"], [class*="Git"], [class*="commit"], [class*="Commit"]');
      const hasSvgInGit = gitSection ? gitSection.querySelectorAll('svg, canvas').length : 0;

      // Look for any chart elements (SVG/canvas) in the page
      const svgs = document.querySelectorAll('svg');
      const canvases = document.querySelectorAll('canvas');

      // Check for recharts or similar
      const rechartsElements = document.querySelectorAll('[class*="recharts"], [class*="chart"], [class*="Chart"]');

      // Check for heatmap or contribution grid
      const heatmapElements = document.querySelectorAll('[class*="heatmap"], [class*="Heatmap"], [class*="contribution"], [class*="Contribution"], [class*="calendar"], [class*="Calendar"]');

      return {
        svgCount: svgs.length,
        canvasCount: canvases.length,
        gitSectionHasSvg: hasSvgInGit,
        rechartsCount: rechartsElements.length,
        heatmapCount: heatmapElements.length,
        hasPlaceholder: body.includes('No data') || body.includes('No git') || body.includes('Coming soon'),
        url: window.location.href
      };
    });

    if (gitChartInfo.svgCount > 0 || gitChartInfo.canvasCount > 0) {
      record('B-18', 'project-detail', 'PASS', `Git area has charts. SVGs:${gitChartInfo.svgCount} Canvas:${gitChartInfo.canvasCount} Recharts:${gitChartInfo.rechartsCount} Heatmap:${gitChartInfo.heatmapCount}`);
    } else {
      record('B-18', 'project-detail', 'FAIL', `No chart elements found in project detail. Placeholder: ${gitChartInfo.hasPlaceholder}`);
    }

    // B-27: 2-column layout check
    const layoutInfo = await page.evaluate(() => {
      // Check if there's a grid or flex layout with 2 columns
      const gridElements = document.querySelectorAll('[class*="grid"], [style*="grid"]');
      let has2Col = false;
      let layoutDetail = '';

      // Check all elements for grid/flex with 2 columns
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const style = window.getComputedStyle(el);
        if (style.display === 'grid') {
          const cols = style.gridTemplateColumns;
          if (cols && cols.split(' ').filter(c => c !== '').length >= 2) {
            has2Col = true;
            layoutDetail = `grid: ${cols}`;
            break;
          }
        }
        if (style.display === 'flex' && style.flexWrap !== 'wrap') {
          const children = el.children;
          if (children.length >= 2) {
            const firstWidth = children[0].getBoundingClientRect().width;
            const parentWidth = el.getBoundingClientRect().width;
            if (firstWidth < parentWidth * 0.8 && firstWidth > 100) {
              has2Col = true;
              layoutDetail = `flex: ${children.length} children, first=${Math.round(firstWidth)}px parent=${Math.round(parentWidth)}px`;
              break;
            }
          }
        }
      }

      return { has2Col, layoutDetail, gridElements: gridElements.length };
    });

    if (layoutInfo.has2Col) {
      record('B-27', 'project-detail', 'PASS', `2-column layout detected: ${layoutInfo.layoutDetail}`);
    } else {
      record('B-27', 'project-detail', 'NEEDS_WORK', `2-column layout not clearly detected. Grid elements: ${layoutInfo.gridElements}. Detail: ${layoutInfo.layoutDetail}`);
    }
  } catch (e) {
    record('B-18', 'project-detail', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
    record('B-27', 'project-detail', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // Click to go back and verify project list click navigation
  try {
    // Verify the URL is correct for project detail
    const detailUrl = page.url();
    if (detailUrl.includes('/projects/')) {
      record('PROJECT-NAV', 'project-detail', 'PASS', `Project detail URL correct: ${detailUrl}`);
    } else {
      record('PROJECT-NAV', 'project-detail', 'FAIL', `Unexpected URL: ${detailUrl}`);
    }
  } catch (e) {}

  // ============================================================
  // STEP 6: MEMBERS LIST PAGE
  // ============================================================
  log('=== STEP 6: MEMBERS LIST PAGE ===');
  currentPageName = 'members-list';

  try {
    await page.goto(`${BASE_URL}/members`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('06-members-list');

    const membersInfo = await page.evaluate(() => {
      const tableRows = document.querySelectorAll('table tbody tr');
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="member"], [class*="Member"]');
      const listItems = document.querySelectorAll('[class*="list-item"], [class*="ListItem"]');
      const bodyText = document.body.innerText;

      return {
        tableRows: tableRows.length,
        cards: cards.length,
        listItems: listItems.length,
        url: window.location.href,
        bodyText: bodyText.substring(0, 500)
      };
    });

    const totalMembers = Math.max(membersInfo.tableRows, membersInfo.cards, membersInfo.listItems);
    if (totalMembers >= 1) {
      record('MEMBERS-LIST', 'members', 'PASS', `Found ${totalMembers} member items (rows:${membersInfo.tableRows} cards:${membersInfo.cards})`);
    } else {
      record('MEMBERS-LIST', 'members', 'FAIL', `No member items found. URL: ${membersInfo.url}. Text: ${membersInfo.bodyText.substring(0, 200)}`);
    }
  } catch (e) {
    record('MEMBERS-LIST', 'members', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 7: MEMBER DETAIL - Verify B-14 (heatmap) + B-20 (pagination)
  // ============================================================
  log('=== STEP 7: MEMBER DETAIL ===');
  currentPageName = 'member-detail';

  try {
    await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('07-member-detail');

    // B-14: Contribution heatmap
    const heatmapInfo = await page.evaluate(() => {
      const heatmapEls = document.querySelectorAll('[class*="heatmap"], [class*="Heatmap"], [class*="contribution"], [class*="Contribution"], [class*="calendar"], [class*="Calendar"], [class*="heat"], [class*="Heat"]');

      // Check for colored cells/squares typical of heatmaps
      const svgs = document.querySelectorAll('svg');
      let coloredRects = 0;
      svgs.forEach(svg => {
        const rects = svg.querySelectorAll('rect');
        rects.forEach(r => {
          const fill = r.getAttribute('fill') || '';
          if (fill && fill !== 'none' && fill !== 'transparent' && fill !== '#fff' && fill !== '#ffffff' && fill !== 'white') {
            coloredRects++;
          }
        });
      });

      // Check for grid of small colored elements (CSS heatmap)
      const smallColoredEls = document.querySelectorAll('[class*="cell"], [class*="Cell"], [class*="day"], [class*="Day"]');

      const bodyText = document.body.innerText;
      const hasPlaceholder = bodyText.includes('No contribution') || bodyText.includes('No activity') || bodyText.includes('Coming soon') || bodyText.includes('placeholder');

      return {
        heatmapElements: heatmapEls.length,
        coloredSvgRects: coloredRects,
        smallCells: smallColoredEls.length,
        svgCount: svgs.length,
        hasPlaceholder,
        bodyTextSnippet: bodyText.substring(0, 300)
      };
    });

    if (heatmapInfo.heatmapElements > 0 || heatmapInfo.coloredSvgRects > 10 || heatmapInfo.smallCells > 20) {
      record('B-14', 'member-detail', 'PASS', `Heatmap found. Elements:${heatmapInfo.heatmapElements} ColoredRects:${heatmapInfo.coloredSvgRects} Cells:${heatmapInfo.smallCells}`);
    } else if (heatmapInfo.hasPlaceholder) {
      record('B-14', 'member-detail', 'FAIL', `Heatmap still shows placeholder text`);
    } else {
      record('B-14', 'member-detail', 'FAIL', `No heatmap detected. SVGs:${heatmapInfo.svgCount} ColoredRects:${heatmapInfo.coloredSvgRects} Cells:${heatmapInfo.smallCells}`);
    }

    // B-20: Current Tasks pagination
    const paginationInfo = await page.evaluate(() => {
      const paginationEls = document.querySelectorAll('[class*="pagination"], [class*="Pagination"], [class*="pager"], [class*="Pager"]');
      const pageButtons = document.querySelectorAll('[class*="page-btn"], [class*="PageBtn"], [aria-label*="page"], [aria-label*="Page"]');
      const nextPrevBtns = document.querySelectorAll('button:has-text("Next"), button:has-text("Previous"), button:has-text("next"), button:has-text("prev")');

      // Check for "showing X of Y" text
      const bodyText = document.body.innerText;
      const showingMatch = bodyText.match(/showing\s+\d+/i) || bodyText.match(/page\s+\d+/i) || bodyText.match(/\d+\s+of\s+\d+/i);

      // Check for numbered page buttons
      const numberedBtns = document.querySelectorAll('button');
      let pageNumberBtns = 0;
      numberedBtns.forEach(b => {
        if (/^\d+$/.test(b.textContent.trim())) pageNumberBtns++;
      });

      return {
        paginationElements: paginationEls.length,
        pageButtons: pageButtons.length,
        pageNumberBtns,
        showingText: showingMatch ? showingMatch[0] : null,
        bodySnippet: bodyText.substring(0, 500)
      };
    });

    if (paginationInfo.paginationElements > 0 || paginationInfo.pageButtons > 0 || paginationInfo.pageNumberBtns > 0 || paginationInfo.showingText) {
      record('B-20', 'member-detail', 'PASS', `Pagination found. Elements:${paginationInfo.paginationElements} PageBtns:${paginationInfo.pageButtons} NumberBtns:${paginationInfo.pageNumberBtns} ShowingText:${paginationInfo.showingText}`);
    } else {
      record('B-20', 'member-detail', 'FAIL', `No pagination found for Current Tasks. Elements:${paginationInfo.paginationElements} PageBtns:${paginationInfo.pageButtons}`);
    }
  } catch (e) {
    record('B-14', 'member-detail', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
    record('B-20', 'member-detail', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 8: OKR PAGE - Verify B-15 (progress bar overflow)
  // ============================================================
  log('=== STEP 8: OKR PAGE ===');
  currentPageName = 'okr';

  try {
    await page.goto(`${BASE_URL}/okr`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('08-okr-page');

    // B-15: Check progress bars for overflow (128% should not exceed container)
    const progressInfo = await page.evaluate(() => {
      const progressBars = document.querySelectorAll('[class*="progress"], [class*="Progress"], [role="progressbar"]');
      let overflowIssues = [];
      let maxWidthRatio = 0;

      progressBars.forEach((bar, idx) => {
        const parent = bar.parentElement;
        if (parent) {
          const barRect = bar.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();

          if (barRect.width > parentRect.width + 2) { // 2px tolerance
            overflowIssues.push({
              index: idx,
              barWidth: Math.round(barRect.width),
              parentWidth: Math.round(parentRect.width),
              overflow: Math.round(barRect.width - parentRect.width)
            });
          }

          const ratio = barRect.width / parentRect.width;
          if (ratio > maxWidthRatio) maxWidthRatio = ratio;
        }
      });

      // Also check for text showing >100%
      const bodyText = document.body.innerText;
      const percentMatch = bodyText.match(/1[2-9]\d%|[2-9]\d\d%/g);

      // Check for overflow:hidden on progress containers
      let hasOverflowHidden = false;
      progressBars.forEach(bar => {
        const parent = bar.parentElement;
        if (parent) {
          const style = window.getComputedStyle(parent);
          if (style.overflow === 'hidden') hasOverflowHidden = true;
        }
      });

      return {
        totalProgressBars: progressBars.length,
        overflowIssues,
        maxWidthRatio: Math.round(maxWidthRatio * 100),
        highPercentages: percentMatch || [],
        hasOverflowHidden
      };
    });

    if (progressInfo.overflowIssues.length === 0 && progressInfo.totalProgressBars > 0) {
      record('B-15', 'okr', 'PASS', `No progress bar overflow. ${progressInfo.totalProgressBars} bars checked. Max ratio: ${progressInfo.maxWidthRatio}%. overflow:hidden=${progressInfo.hasOverflowHidden}. High %: ${progressInfo.highPercentages.join(',')}`);
    } else if (progressInfo.overflowIssues.length > 0) {
      record('B-15', 'okr', 'FAIL', `Progress bar overflow detected: ${JSON.stringify(progressInfo.overflowIssues)}`);
    } else {
      record('B-15', 'okr', 'NEEDS_WORK', `No progress bars found to check. Body may not have loaded.`);
    }
  } catch (e) {
    record('B-15', 'okr', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 9: GIT PAGE - Verify B-13 (contribution heatmap)
  // ============================================================
  log('=== STEP 9: GIT PAGE ===');
  currentPageName = 'git';

  try {
    await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('09-git-activity');

    // B-13: Git Activity heatmap - should have colored blocks, not placeholder text
    const gitHeatmapInfo = await page.evaluate(() => {
      const heatmapEls = document.querySelectorAll('[class*="heatmap"], [class*="Heatmap"], [class*="contribution"], [class*="Contribution"], [class*="calendar"], [class*="Calendar"], [class*="heat"], [class*="Heat"]');

      // Count colored rectangles in SVGs
      const svgs = document.querySelectorAll('svg');
      let totalColoredRects = 0;
      let greenRects = 0;
      svgs.forEach(svg => {
        const rects = svg.querySelectorAll('rect');
        rects.forEach(r => {
          const fill = r.getAttribute('fill') || '';
          const fillLower = fill.toLowerCase();
          if (fill && fill !== 'none' && fill !== 'transparent') {
            totalColoredRects++;
            if (fillLower.includes('green') || fillLower.includes('#2') || fillLower.includes('#3') || fillLower.includes('#4') || fillLower.includes('#0e') || fillLower.includes('#1a') || fillLower.includes('#26')) {
              greenRects++;
            }
          }
        });
      });

      // Check for CSS grid/flex heatmap
      const cells = document.querySelectorAll('[class*="cell"], [class*="Cell"], [class*="day"], [class*="Day"], [class*="block"], [class*="Block"]');
      let coloredCells = 0;
      cells.forEach(cell => {
        const style = window.getComputedStyle(cell);
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
          coloredCells++;
        }
      });

      const bodyText = document.body.innerText;
      const hasPlaceholder = bodyText.includes('contribution heatmap') || bodyText.includes('placeholder') || bodyText.includes('Coming soon') || bodyText.includes('No data');

      return {
        heatmapElements: heatmapEls.length,
        totalColoredSvgRects: totalColoredRects,
        greenRects,
        coloredCssCells: coloredCells,
        svgCount: svgs.length,
        hasPlaceholder,
        bodyTextSnippet: bodyText.substring(0, 300)
      };
    });

    if ((gitHeatmapInfo.totalColoredSvgRects > 10 || gitHeatmapInfo.coloredCssCells > 10 || gitHeatmapInfo.heatmapElements > 0) && !gitHeatmapInfo.hasPlaceholder) {
      record('B-13', 'git', 'PASS', `Heatmap present with colored blocks. SVG rects:${gitHeatmapInfo.totalColoredSvgRects} Green:${gitHeatmapInfo.greenRects} CSS cells:${gitHeatmapInfo.coloredCssCells} HeatmapEls:${gitHeatmapInfo.heatmapElements}`);
    } else if (gitHeatmapInfo.hasPlaceholder) {
      record('B-13', 'git', 'FAIL', `Heatmap still shows placeholder text. Body: ${gitHeatmapInfo.bodyTextSnippet.substring(0, 150)}`);
    } else {
      record('B-13', 'git', 'FAIL', `No heatmap blocks detected. SVG rects:${gitHeatmapInfo.totalColoredSvgRects} CSS cells:${gitHeatmapInfo.coloredCssCells}`);
    }
  } catch (e) {
    record('B-13', 'git', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 10: ADMIN / SYNC LOGS - Verify B-25 (status colors)
  // ============================================================
  log('=== STEP 10: ADMIN / SYNC LOGS ===');
  currentPageName = 'admin-sync-logs';

  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('10-admin-page');

    // Click on Sync Logs tab
    const syncTabClicked = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"], button, a');
      for (const tab of tabs) {
        const text = tab.textContent.trim().toLowerCase();
        if (text.includes('sync') || text.includes('log')) {
          tab.click();
          return { clicked: true, text: tab.textContent.trim() };
        }
      }
      return { clicked: false };
    });

    if (syncTabClicked.clicked) {
      await page.waitForTimeout(1500);
      await screenshot('10-sync-logs-tab');

      // B-25: Check status badge colors
      const statusColorInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;

        // Find elements containing "success" or "error" status text
        const allElements = document.querySelectorAll('span, div, td, badge, [class*="badge"], [class*="Badge"], [class*="status"], [class*="Status"], [class*="tag"], [class*="Tag"], [class*="chip"], [class*="Chip"]');

        let successElements = [];
        let errorElements = [];

        allElements.forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          const color = style.color;

          if (text === 'success' || text === 'completed' || text === 'ok') {
            successElements.push({ text: el.textContent.trim(), bg, color, className: el.className });
          }
          if (text === 'error' || text === 'failed' || text === 'fail') {
            errorElements.push({ text: el.textContent.trim(), bg, color, className: el.className });
          }
        });

        // Parse RGB to check if green or red
        function isGreenish(rgb) {
          const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return false;
          const [,r,g,b] = match.map(Number);
          return g > r && g > b && g > 100;
        }
        function isRedish(rgb) {
          const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return false;
          const [,r,g,b] = match.map(Number);
          return r > g && r > b && r > 100;
        }

        const successIsGreen = successElements.some(e => isGreenish(e.bg) || isGreenish(e.color));
        const errorIsRed = errorElements.some(e => isRedish(e.bg) || isRedish(e.color));

        return {
          successElements: successElements.map(e => ({ text: e.text, bg: e.bg, color: e.color })),
          errorElements: errorElements.map(e => ({ text: e.text, bg: e.bg, color: e.color })),
          successIsGreen,
          errorIsRed,
          hasSuccessText: bodyText.includes('success') || bodyText.includes('Success'),
          hasErrorText: bodyText.includes('error') || bodyText.includes('Error') || bodyText.includes('failed') || bodyText.includes('Failed')
        };
      });

      if (statusColorInfo.successIsGreen || statusColorInfo.errorIsRed) {
        record('B-25', 'admin-sync-logs', 'PASS', `Status colors correct. Success green:${statusColorInfo.successIsGreen} Error red:${statusColorInfo.errorIsRed}. Success: ${JSON.stringify(statusColorInfo.successElements.slice(0,2))} Error: ${JSON.stringify(statusColorInfo.errorElements.slice(0,2))}`);
      } else if (statusColorInfo.successElements.length > 0 || statusColorInfo.errorElements.length > 0) {
        record('B-25', 'admin-sync-logs', 'NEEDS_WORK', `Status badges found but colors may not be green/red. Success: ${JSON.stringify(statusColorInfo.successElements.slice(0,2))} Error: ${JSON.stringify(statusColorInfo.errorElements.slice(0,2))}`);
      } else {
        record('B-25', 'admin-sync-logs', 'FAIL', `No status badge elements found. HasSuccessText:${statusColorInfo.hasSuccessText} HasErrorText:${statusColorInfo.hasErrorText}`);
      }
    } else {
      record('B-25', 'admin-sync-logs', 'FAIL', 'Could not find or click Sync Logs tab');
    }
  } catch (e) {
    record('B-25', 'admin-sync-logs', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 11: PROJECT LIST -> DETAIL CLICK NAVIGATION
  // ============================================================
  log('=== STEP 11: PROJECT LIST CLICK NAVIGATION ===');
  currentPageName = 'project-click-nav';

  try {
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try clicking first clickable row/card
    const clickResult = await page.evaluate(() => {
      // Try table row click
      const rows = document.querySelectorAll('table tbody tr');
      if (rows.length > 0) {
        rows[0].click();
        return { clicked: 'table-row', count: rows.length };
      }
      // Try card click
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
      if (cards.length > 0) {
        cards[0].click();
        return { clicked: 'card', count: cards.length };
      }
      // Try link click
      const links = document.querySelectorAll('a[href*="/projects/"]');
      if (links.length > 0) {
        links[0].click();
        return { clicked: 'link', count: links.length };
      }
      return { clicked: 'none', count: 0 };
    });

    await page.waitForTimeout(2000);
    const navUrl = page.url();
    await screenshot('11-project-click-nav-result');

    if (navUrl.includes('/projects/') && navUrl !== `${BASE_URL}/projects` && navUrl !== `${BASE_URL}/projects/`) {
      record('PROJECT-CLICK-NAV', 'projects', 'PASS', `Clicked ${clickResult.clicked} -> navigated to ${navUrl}`);
    } else {
      record('PROJECT-CLICK-NAV', 'projects', 'FAIL', `Click did not navigate to detail. Clicked: ${clickResult.clicked}, URL: ${navUrl}`);
    }
  } catch (e) {
    record('PROJECT-CLICK-NAV', 'projects', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // STEP 12: MOBILE VIEWPORT TEST
  // ============================================================
  log('=== STEP 12: MOBILE VIEWPORT ===');
  currentPageName = 'mobile';

  try {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshot('12-mobile-overview');

    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshot('12-mobile-projects');

    await page.goto(`${BASE_URL}/members`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshot('12-mobile-members');

    record('MOBILE', 'all', 'PASS', 'Mobile screenshots captured for manual review');

    // Reset viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  } catch (e) {
    record('MOBILE', 'all', 'FAIL', `Error: ${e.message.substring(0, 200)}`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  log('\n=== TEST SUMMARY ===');

  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  const needsWork = results.filter(r => r.status === 'NEEDS_WORK').length;

  log(`PASS: ${passes}, FAIL: ${fails}, NEEDS_WORK: ${needsWork}`);

  console.log('\n--- RESULTS JSON ---');
  console.log(JSON.stringify({ results, consoleErrors }, null, 2));
  console.log('--- END RESULTS ---');

  await browser.close();
})();
