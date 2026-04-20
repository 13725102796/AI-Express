import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';
let screenshotIndex = 100;

function log(msg) {
  console.log(`[SPA-TEST] ${msg}`);
}

async function screenshot(page, name) {
  screenshotIndex++;
  const filename = `${String(screenshotIndex).padStart(3, '0')}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log(`Screenshot: ${filename}`);
  return filename;
}

async function run() {
  log('Starting SPA Navigation E2E Tests (Round 2)');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN'
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('DevTools')) {
        consoleErrors.push(text);
      }
    }
  });

  // === STEP 1: Login ===
  log('=== STEP 1: Login ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passInput = await page.$('input[type="password"]');
  if (emailInput && passInput) {
    await emailInput.fill('admin@jasonqiyuan.com');
    await passInput.fill('Admin123!');
    const btn = await page.$('button[type="submit"], button:has-text("登录"), button:has-text("Sign")');
    if (btn) await btn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  log(`After login URL: ${page.url()}`);

  // === STEP 2: Overview page (should be here after login) ===
  log('=== STEP 2: Overview Page ===');
  await page.waitForTimeout(2000);
  const ss_overview = await screenshot(page, 'spa-overview-afterlogin');

  // Get detailed data about what's visible
  const overviewData = await page.evaluate(() => {
    const text = document.body.innerText;
    const canvases = document.querySelectorAll('canvas').length;
    const svgs = document.querySelectorAll('svg').length;
    // Check for specific data sections
    const sections = document.querySelectorAll('[class*="card"], [class*="panel"], [class*="section"], [class*="Chart"], [class*="chart"]');
    return {
      textLength: text.length,
      hasAvatar: text.includes('Avatar'),
      hasAirFlow: text.includes('AirFlow'),
      hasSprint: text.includes('Sprint'),
      hasOKR: text.includes('OKR'),
      canvases, svgs,
      sectionCount: sections.length,
      firstText: text.substring(0, 500)
    };
  });
  log(`Overview: text=${overviewData.textLength}, Avatar:${overviewData.hasAvatar}, AirFlow:${overviewData.hasAirFlow}, canvases:${overviewData.canvases}, SVGs:${overviewData.svgs}`);
  log(`First text: ${overviewData.firstText.substring(0, 300)}`);

  // Scroll down to see all panels
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(500);
  const ss_overview_scroll = await screenshot(page, 'spa-overview-mid-scroll');

  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);
  const ss_overview_bottom = await screenshot(page, 'spa-overview-bottom');

  // Check Sprint Delivery chart specifically
  const sprintChart = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('h2, h3, [class*="title"]'));
    const sprintCard = cards.find(c => c.textContent.includes('Sprint'));
    if (sprintCard) {
      const parent = sprintCard.closest('[class*="card"], [class*="panel"], div') || sprintCard.parentElement;
      const canvas = parent?.querySelector('canvas');
      const svg = parent?.querySelector('svg');
      return { found: true, hasCanvas: !!canvas, hasSVG: !!svg, parentClass: parent?.className || '' };
    }
    return { found: false };
  });
  log(`Sprint chart check: ${JSON.stringify(sprintChart)}`);

  // === STEP 3: Navigate to OKR via sidebar click ===
  log('=== STEP 3: OKR via Sidebar ===');
  const okrLink = await page.$('a[href*="okr"], nav a:has-text("OKR"), [class*="sidebar"] a:has-text("OKR")');
  if (okrLink) {
    await okrLink.click();
    await page.waitForTimeout(3000);
  }
  const ss_okr = await screenshot(page, 'spa-okr-via-sidebar');
  log(`OKR URL: ${page.url()}`);

  const okrData = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      has68: text.includes('68'),
      has55: text.includes('55'),
      has42: text.includes('42'),
      hasObj1: text.includes('交付效率'),
      hasObj2: text.includes('代码质量'),
      hasObj3: text.includes('DataHub'),
      textSnippet: text.substring(0, 400)
    };
  });
  log(`OKR data: ${JSON.stringify(okrData)}`);

  // === STEP 4: Navigate to Git Activity via sidebar ===
  log('=== STEP 4: Git Activity via Sidebar ===');
  const gitLink = await page.$('a[href*="git"], nav a:has-text("Git"), [class*="sidebar"] a:has-text("Git")');
  if (gitLink) {
    await gitLink.click();
    await page.waitForTimeout(3000);
  }
  const ss_git = await screenshot(page, 'spa-git-via-sidebar');
  log(`Git URL: ${page.url()}`);

  const gitData = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      has119: text.includes('119'),
      has116: text.includes('116'),
      hasHeatmap: text.includes('Heatmap') || text.includes('heatmap') || text.includes('贡献'),
      hasPR: text.includes('PR') || text.includes('Pull'),
      hasMergeTime: text.includes('39.6') || text.includes('Merge'),
      textSnippet: text.substring(0, 400)
    };
  });
  log(`Git data: ${JSON.stringify(gitData)}`);

  // === STEP 5: Navigate to Admin via sidebar ===
  log('=== STEP 5: Admin via Sidebar ===');
  const adminLink = await page.$('a[href*="admin"], nav a:has-text("Admin"), [class*="sidebar"] a:has-text("Admin")');
  if (adminLink) {
    await adminLink.click();
    await page.waitForTimeout(3000);
  }
  const ss_admin = await screenshot(page, 'spa-admin-via-sidebar');
  log(`Admin URL: ${page.url()}`);

  // Click Author Mapping tab
  const authorTab = await page.$('button:has-text("Author"), a:has-text("Author"), [role="tab"]:has-text("Author"), button:has-text("映射"), a:has-text("映射")');
  if (authorTab) {
    await authorTab.click();
    await page.waitForTimeout(2000);
    const ss_mapping = await screenshot(page, 'spa-admin-author-mapping');
    const mappingData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasChenqiang: text.includes('chenqiang'),
        hasLiming: text.includes('liming'),
        hasWangfang: text.includes('wangfang'),
        rowCount: document.querySelectorAll('tbody tr, [class*="row"]').length,
        textSnippet: text.substring(0, 400)
      };
    });
    log(`Author mapping data: ${JSON.stringify(mappingData)}`);
  } else {
    log('Author Mapping tab not found');
  }

  // Click Sync Logs tab
  const syncTab = await page.$('button:has-text("Sync"), a:has-text("Sync"), [role="tab"]:has-text("Sync"), button:has-text("同步"), a:has-text("同步")');
  if (syncTab) {
    await syncTab.click();
    await page.waitForTimeout(2000);
    const ss_sync = await screenshot(page, 'spa-admin-sync-logs');
    const syncData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSuccess: text.includes('success') || text.includes('成功'),
        hasError: text.includes('error') || text.includes('失败'),
        hasSyncEntries: text.includes('gitea') || text.includes('plane') || text.includes('Plane') || text.includes('Gitea'),
        rowCount: document.querySelectorAll('tbody tr').length,
        textSnippet: text.substring(0, 500)
      };
    });
    log(`Sync logs data: ${JSON.stringify(syncData)}`);
  } else {
    log('Sync Logs tab not found');
  }

  // === STEP 6: Navigate to Overview and check project links ===
  log('=== STEP 6: Back to Overview, test project navigation ===');
  const overviewLink = await page.$('a[href*="overview"], a[href="/"], nav a:has-text("Overview"), [class*="sidebar"] a:has-text("Overview")');
  if (overviewLink) {
    await overviewLink.click();
    await page.waitForTimeout(3000);
  }
  const ss_overview2 = await screenshot(page, 'spa-overview-return');

  // Try to find and click a project link (Avatar)
  const projectLink = await page.$('a[href*="p-avatar"], a:has-text("Avatar"), [class*="project"]:has-text("Avatar"), tr:has-text("Avatar") a, [class*="progress"]:has-text("Avatar")');
  if (projectLink) {
    await projectLink.click();
    await page.waitForTimeout(3000);
    const ss_project = await screenshot(page, 'spa-project-from-overview');
    log(`Project URL: ${page.url()}`);

    const projectData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasAvatar: text.includes('Avatar') || text.includes('数字人'),
        hasBurndown: text.includes('Burndown') || text.includes('燃尽'),
        hasMilestone: text.includes('里程碑') || text.includes('Milestone') || text.includes('MVP'),
        hasMembers: text.includes('陈强') || text.includes('刘洋'),
        textSnippet: text.substring(0, 500)
      };
    });
    log(`Project data: ${JSON.stringify(projectData)}`);

    // Scroll down on project page
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    const ss_project_mid = await screenshot(page, 'spa-project-scrolled');
  } else {
    log('No project link found on overview');
    // Try navigating to project directly from sidebar/breadcrumb
  }

  // === STEP 7: Navigate to a Member page ===
  log('=== STEP 7: Member page ===');
  // Go back to a project and find a member link
  // Or try to find member links on the current page
  const memberLink = await page.$('a[href*="members"], a[href*="u-dev-1"], a:has-text("陈强")');
  if (memberLink) {
    await memberLink.click();
    await page.waitForTimeout(3000);
    const ss_member = await screenshot(page, 'spa-member-from-project');
    log(`Member URL: ${page.url()}`);
  }

  // === STEP 8: Filter test on Overview ===
  log('=== STEP 8: Filter test ===');
  // Go back to overview
  const overviewLink2 = await page.$('a[href*="overview"], a[href="/"], nav a:has-text("Overview")');
  if (overviewLink2) {
    await overviewLink2.click();
    await page.waitForTimeout(3000);
  }

  // Look for filter/search elements
  const filterData = await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    const inputs = document.querySelectorAll('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"], input[placeholder*="筛选"]');
    const filterButtons = Array.from(document.querySelectorAll('button')).filter(b => {
      const t = (b.textContent || '').toLowerCase();
      return t.includes('filter') || t.includes('筛选') || t.includes('全部');
    });
    const dropdowns = document.querySelectorAll('[class*="select"], [class*="dropdown"], [class*="filter"]');
    return {
      selectCount: selects.length,
      searchInputs: inputs.length,
      filterButtons: filterButtons.length,
      dropdowns: dropdowns.length,
      selectOptions: Array.from(selects).map(s => Array.from(s.options).map(o => o.text).join(',')),
    };
  });
  log(`Filter elements: ${JSON.stringify(filterData)}`);

  if (filterData.selectCount > 0) {
    // Try to interact with first select
    const select = await page.$('select');
    if (select) {
      const options = await page.$$eval('select option', opts => opts.map(o => ({ value: o.value, text: o.text })));
      log(`Select options: ${JSON.stringify(options)}`);
      if (options.length > 1) {
        await select.selectOption(options[1].value);
        await page.waitForTimeout(2000);
        const ss_filtered = await screenshot(page, 'spa-overview-filtered');
        log('Filter applied successfully');
      }
    }
  }

  const ss_filter = await screenshot(page, 'spa-overview-filter-state');

  // === STEP 9: Mobile responsive test ===
  log('=== STEP 9: Mobile responsive ===');

  // We stay on the current page (overview) and resize
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(2000);
  const ss_mobile_overview = await screenshot(page, 'spa-mobile-overview');

  // Check for hamburger/mobile menu
  const mobileNav = await page.evaluate(() => {
    const body = document.body.innerText;
    const hamburger = document.querySelector('[class*="hamburger"], [class*="menu-toggle"], [aria-label*="menu"], button svg');
    const sidebar = document.querySelector('[class*="sidebar"], nav');
    const sidebarVisible = sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false;
    return {
      hasHamburger: !!hamburger,
      sidebarVisible,
      bodyLength: body.length,
      hasData: body.includes('Avatar') || body.includes('Sprint') || body.includes('OKR')
    };
  });
  log(`Mobile nav: ${JSON.stringify(mobileNav)}`);

  // Navigate to other pages in mobile
  // Click OKR in sidebar (may need hamburger first)
  if (!mobileNav.sidebarVisible) {
    const hamburgerBtn = await page.$('[class*="hamburger"], [class*="menu-toggle"], [aria-label*="menu"], button:has(svg)');
    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await page.waitForTimeout(1000);
      const ss_hamburger = await screenshot(page, 'spa-mobile-hamburger-open');
    }
  }

  const okrMobileLink = await page.$('a[href*="okr"], a:has-text("OKR")');
  if (okrMobileLink) {
    await okrMobileLink.click();
    await page.waitForTimeout(2000);
    const ss_mobile_okr = await screenshot(page, 'spa-mobile-okr');
  }

  // Navigate to admin in mobile
  const adminMobileLink = await page.$('a[href*="admin"], a:has-text("Admin")');
  if (adminMobileLink) {
    await adminMobileLink.click();
    await page.waitForTimeout(2000);
    const ss_mobile_admin = await screenshot(page, 'spa-mobile-admin');
  }

  // Navigate to git in mobile
  const gitMobileLink = await page.$('a[href*="git"], a:has-text("Git")');
  if (gitMobileLink) {
    await gitMobileLink.click();
    await page.waitForTimeout(2000);
    const ss_mobile_git = await screenshot(page, 'spa-mobile-git');
  }

  // Reset viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  // === STEP 10: Console error summary ===
  log('=== Console Error Summary ===');
  if (consoleErrors.length > 0) {
    log(`Total console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e, i) => {
      if (i < 15) log(`  [${i+1}] ${e.substring(0, 300)}`);
    });
  } else {
    log('No console errors detected');
  }

  await browser.close();
  log('SPA Navigation tests complete');
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
