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

  async function screenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    log(`Screenshot: ${name}.png`);
  }

  // LOGIN
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  const inputs = await page.$$('input');
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder') || '';
    if (type === 'email' || placeholder.toLowerCase().includes('email')) await input.fill(CREDENTIALS.email);
    if (type === 'password' || placeholder.toLowerCase().includes('password')) await input.fill(CREDENTIALS.password);
  }
  await page.waitForTimeout(500);
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text.toLowerCase().includes('sign')) {
      await Promise.all([
        page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(() => {}),
        btn.click()
      ]);
      break;
    }
  }
  await page.waitForTimeout(2000);
  log(`Logged in: ${page.url()}`);

  // ============================================================
  // TEST: Projects List Page - What does /projects actually show?
  // ============================================================
  log('\n=== Projects List Page ===');

  // First, check if sidebar "Projects" is an expandable menu or a link
  const sidebarInfo = await page.evaluate(() => {
    const sidebar = document.querySelector('nav, aside, [class*="sidebar"], [class*="Sidebar"]');
    if (!sidebar) return { found: false };

    const allLinks = sidebar.querySelectorAll('a, [class*="nav"], [class*="menu"]');
    const items = [];
    allLinks.forEach(el => {
      items.push({
        text: el.textContent.trim().substring(0, 40),
        href: el.getAttribute('href') || '',
        tag: el.tagName,
        className: el.className.toString().substring(0, 60),
        hasChildren: el.querySelectorAll('a, [class*="sub"]').length
      });
    });

    return { found: true, items: items.filter(i => i.text.length > 0 && i.text.length < 30) };
  });
  log(`Sidebar items: ${JSON.stringify(sidebarInfo.items, null, 2)}`);

  // Click the Projects sidebar item
  const projectsClicked = await page.evaluate(() => {
    const sidebar = document.querySelector('nav, aside, [class*="sidebar"], [class*="Sidebar"]');
    if (!sidebar) return { clicked: false, reason: 'no sidebar' };

    const items = sidebar.querySelectorAll('a, [class*="menu-item"], [class*="MenuItem"], [class*="nav-item"]');
    for (const item of items) {
      const text = item.textContent.trim().toLowerCase();
      if (text === 'projects' || text.startsWith('projects')) {
        item.click();
        return { clicked: true, text: item.textContent.trim(), href: item.getAttribute('href') || '' };
      }
    }
    return { clicked: false, reason: 'no projects item found' };
  });
  log(`Projects sidebar click: ${JSON.stringify(projectsClicked)}`);
  await page.waitForTimeout(2000);
  log(`After projects click URL: ${page.url()}`);
  await screenshot('nav-01-after-projects-sidebar-click');

  // Check if sub-menu appeared
  const subMenuInfo = await page.evaluate(() => {
    const sidebar = document.querySelector('nav, aside, [class*="sidebar"], [class*="Sidebar"]');
    if (!sidebar) return { found: false };

    const subItems = sidebar.querySelectorAll('[class*="sub"], [class*="Sub"], [class*="child"], [class*="nested"]');
    const allLinks = sidebar.querySelectorAll('a');
    const projectLinks = [];
    allLinks.forEach(l => {
      const href = l.getAttribute('href') || '';
      if (href.includes('/projects/')) {
        projectLinks.push({ text: l.textContent.trim(), href });
      }
    });

    return {
      subItems: subItems.length,
      projectLinks,
      allLinksCount: allLinks.length
    };
  });
  log(`Sub-menu info: ${JSON.stringify(subMenuInfo, null, 2)}`);

  // Now navigate to /projects directly
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  log(`/projects URL: ${page.url()}`);
  await screenshot('nav-02-projects-direct');

  // Check what's on this page
  const projectsPageInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const tables = document.querySelectorAll('table');
    const tableRows = document.querySelectorAll('table tbody tr');
    const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
    const links = document.querySelectorAll('a');
    const projectLinks = Array.from(links).filter(l => (l.getAttribute('href') || '').includes('/projects/'));

    return {
      tables: tables.length,
      tableRows: tableRows.length,
      cards: cards.length,
      projectLinks: projectLinks.map(l => ({ href: l.getAttribute('href'), text: l.textContent.trim().substring(0, 40) })),
      bodyExcerpt: bodyText.substring(0, 1500)
    };
  });
  log(`Projects page content: ${JSON.stringify(projectsPageInfo, null, 2)}`);

  // If /projects redirected to a specific project, try /projects without trailing content
  if (page.url().includes('/projects/p-')) {
    log('Redirected to a specific project. Checking if there is a separate list page...');
  }

  // Try clicking a project link if available
  if (projectsPageInfo.projectLinks.length > 0) {
    const firstLink = projectsPageInfo.projectLinks[0];
    log(`Clicking project link: ${firstLink.text} -> ${firstLink.href}`);
    await page.click(`a[href="${firstLink.href}"]`);
    await page.waitForTimeout(2000);
    log(`After click URL: ${page.url()}`);
    await screenshot('nav-03-project-detail-from-list');
  } else {
    // Maybe the project list uses table rows as click targets
    const rowClicked = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      if (rows.length > 0) {
        // Check if rows have click handlers or are wrapped in links
        const firstRow = rows[0];
        const link = firstRow.querySelector('a');
        if (link) {
          return { type: 'link-in-row', href: link.getAttribute('href'), text: link.textContent.trim() };
        }
        // Check if row itself is clickable
        const style = window.getComputedStyle(firstRow);
        firstRow.click();
        return { type: 'row-click', cursor: style.cursor, rows: rows.length };
      }
      return { type: 'no-rows' };
    });
    log(`Row click attempt: ${JSON.stringify(rowClicked)}`);
    await page.waitForTimeout(2000);
    log(`After row click URL: ${page.url()}`);
    await screenshot('nav-03-after-row-click');
  }

  // ============================================================
  // MOBILE TEST (with proper session persistence)
  // ============================================================
  log('\n=== Mobile Tests ===');

  // Resize viewport (session should persist in same context)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const mobileUrl = page.url();
  log(`Mobile overview URL: ${mobileUrl}`);

  if (mobileUrl.includes('/login')) {
    // Need to re-login at mobile size
    log('Session lost on mobile, re-logging in...');
    const mInputs = await page.$$('input');
    for (const input of mInputs) {
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder') || '';
      if (type === 'email' || placeholder.toLowerCase().includes('email')) await input.fill(CREDENTIALS.email);
      if (type === 'password' || placeholder.toLowerCase().includes('password')) await input.fill(CREDENTIALS.password);
    }
    await page.waitForTimeout(500);
    const mButtons = await page.$$('button');
    for (const btn of mButtons) {
      const text = await btn.textContent();
      if (text.toLowerCase().includes('sign')) {
        await Promise.all([
          page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(() => {}),
          btn.click()
        ]);
        break;
      }
    }
    await page.waitForTimeout(2000);
    log(`Mobile after login: ${page.url()}`);
  }

  await screenshot('mobile-01-overview');

  await page.goto(`${BASE_URL}/members/u-dev-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot('mobile-02-member-detail');

  await page.goto(`${BASE_URL}/git`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot('mobile-03-git');

  await page.goto(`${BASE_URL}/okr`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot('mobile-04-okr');

  await browser.close();
  log('\n=== NAV + MOBILE TESTS COMPLETE ===');
})();
