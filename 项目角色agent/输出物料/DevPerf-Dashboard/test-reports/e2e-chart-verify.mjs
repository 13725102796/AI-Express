import { chromium } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';
let idx = 400;

function log(msg) { console.log(`[CHART] ${msg}`); }

async function ss(page, name) {
  idx++;
  const fn = `${String(idx).padStart(3,'0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fn), fullPage: false });
  log(`Screenshot: ${fn}`);
  return fn;
}

async function ssFull(page, name) {
  idx++;
  const fn = `${String(idx).padStart(3,'0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fn), fullPage: true });
  log(`Screenshot (full): ${fn}`);
  return fn;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const emailEl = await page.$('input[placeholder="Enter your email"]');
  const passEl = await page.$('input[placeholder="Enter your password"]');
  await emailEl.click();
  await page.keyboard.type('admin@jasonqiyuan.com', { delay: 20 });
  await passEl.click();
  await page.keyboard.type('Admin123!', { delay: 20 });
  await page.waitForTimeout(300);
  await page.click('.n-button--primary-type', { force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});
  log(`After login: ${page.url()}`);

  if (page.url().includes('/login')) {
    log('Login failed');
    await browser.close();
    return;
  }

  // Wait for charts to render
  await page.waitForTimeout(3000);

  // Take viewport-level screenshot (not fullPage) to see exactly what user sees
  await ss(page, 'overview-viewport');

  // Check all canvas elements
  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    return Array.from(canvases).map((c, i) => ({
      index: i,
      width: c.width,
      height: c.height,
      offsetWidth: c.offsetWidth,
      offsetHeight: c.offsetHeight,
      parentClass: c.parentElement?.className?.substring(0, 80) || '',
      parentId: c.parentElement?.id || '',
      visible: c.offsetWidth > 0 && c.offsetHeight > 0,
      boundingRect: c.getBoundingClientRect(),
      dataURL: c.toDataURL('image/png').length > 1000 ? 'HAS_CONTENT' : 'EMPTY_OR_TINY',
    }));
  });
  log(`Canvas elements: ${JSON.stringify(canvasInfo, null, 2)}`);

  // Take element-level screenshots of each data card
  const cards = await page.$$('[class*="data-card"], [class*="DataCard"], .panels-grid > *');
  log(`Found ${cards.length} data cards`);

  for (let i = 0; i < cards.length; i++) {
    try {
      const cardText = await cards[i].evaluate(el => {
        const title = el.querySelector('h3, .card-title, [class*="title"]');
        return title?.textContent?.trim() || `Card-${i}`;
      });
      log(`Card ${i}: "${cardText}"`);
      await cards[i].screenshot({ path: path.join(SCREENSHOT_DIR, `${String(++idx).padStart(3,'0')}-card-${i}-${cardText.replace(/[^\w]/g, '_').substring(0, 30)}.png`) });
      log(`Card screenshot taken: card-${i}`);
    } catch (e) {
      log(`Card ${i} screenshot failed: ${e.message}`);
    }
  }

  // Also check for the specific chart containers
  const chartContainers = await page.evaluate(() => {
    const refs = document.querySelectorAll('[style*="height: 260px"], [style*="height:260px"]');
    return Array.from(refs).map((el, i) => ({
      index: i,
      tagName: el.tagName,
      className: el.className?.substring(0, 80),
      innerHTML: el.innerHTML?.substring(0, 100),
      hasCanvas: !!el.querySelector('canvas'),
      childCount: el.children.length,
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
    }));
  });
  log(`Chart containers (height:260px): ${JSON.stringify(chartContainers, null, 2)}`);

  // Scroll and take screenshots at each section
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await ss(page, 'overview-top-viewport');

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await ss(page, 'overview-400px');

  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await ss(page, 'overview-800px');

  // =============================================
  // Navigate to Git Activity and check heatmap/charts
  // =============================================
  log('=== Git Activity ===');
  const gitLink = await page.$('a:has-text("Git Activity")');
  if (gitLink) {
    await gitLink.click();
    await page.waitForTimeout(3000);
    await ssFull(page, 'git-activity-full');
    await ss(page, 'git-activity-viewport');
    log(`Git URL: ${page.url()}`);

    const gitCanvases = await page.evaluate(() => {
      const cs = document.querySelectorAll('canvas');
      return Array.from(cs).map((c, i) => ({
        index: i,
        width: c.width,
        height: c.height,
        visible: c.offsetWidth > 0 && c.offsetHeight > 0,
        dataLen: c.toDataURL('image/png').length,
      }));
    });
    log(`Git page canvases: ${JSON.stringify(gitCanvases)}`);
  }

  // =============================================
  // Navigate to OKR
  // =============================================
  log('=== OKR ===');
  const okrLink = await page.$('a:has-text("OKR")');
  if (okrLink) {
    await okrLink.click();
    await page.waitForTimeout(3000);
    await ssFull(page, 'okr-full');
    log(`OKR URL: ${page.url()}`);
  }

  // =============================================
  // Navigate to Admin
  // =============================================
  log('=== Admin ===');
  // The sidebar has "Admin" which might match the project. Let's be more precise.
  const allLinks = await page.$$('nav a, [class*="sidebar"] a');
  for (const link of allLinks) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    log(`Sidebar link: href="${href}" text="${text?.trim()}"`);
  }

  // Try clicking by href
  const adminLink = await page.$('a[href="/admin"]');
  if (adminLink) {
    await adminLink.click();
    await page.waitForTimeout(3000);
    await ssFull(page, 'admin-panel-full');
    log(`Admin URL: ${page.url()}`);

    // Click Author Mapping tab
    const amTab = await page.$('[class*="tab"]:has-text("Author"), button:has-text("Author")');
    if (amTab) {
      await amTab.click();
      await page.waitForTimeout(2000);
      await ssFull(page, 'admin-author-mapping');
    }

    // Click Sync Logs tab
    const slTab = await page.$('[class*="tab"]:has-text("Sync"), button:has-text("Sync")');
    if (slTab) {
      await slTab.click();
      await page.waitForTimeout(2000);
      await ssFull(page, 'admin-sync-logs');
    }
  } else {
    log('No a[href="/admin"] found');
    // Try evaluate to navigate
    await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const router = app?.config?.globalProperties?.$router;
      if (router) router.push('/admin');
    });
    await page.waitForTimeout(3000);
    await ssFull(page, 'admin-via-router');
    log(`Admin URL: ${page.url()}`);
  }

  // =============================================
  // Mobile test
  // =============================================
  log('=== Mobile ===');
  // Go back to overview
  const overviewLink = await page.$('a[href="/"], a[href="/overview"], a:has-text("Overview")');
  if (overviewLink) {
    await overviewLink.click();
    await page.waitForTimeout(3000);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(2000);
  await ssFull(page, 'mobile-overview-full');
  await ss(page, 'mobile-overview-viewport');

  // Check sidebar visibility
  const sidebarVisible = await page.evaluate(() => {
    const sidebar = document.querySelector('[class*="sidebar"], nav, [class*="Sidebar"]');
    if (!sidebar) return 'NOT_FOUND';
    const style = window.getComputedStyle(sidebar);
    return `display:${style.display} transform:${style.transform} width:${style.width} left:${style.left}`;
  });
  log(`Sidebar in mobile: ${sidebarVisible}`);

  // Look for any toggle button
  const toggleBtns = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.filter(b => {
      const rect = b.getBoundingClientRect();
      return rect.width > 0 && rect.width < 60; // Small buttons likely are toggles
    }).map(b => ({
      text: b.textContent?.trim().substring(0, 20),
      class: b.className?.substring(0, 50),
      ariaLabel: b.getAttribute('aria-label'),
      rect: b.getBoundingClientRect(),
    }));
  });
  log(`Small buttons (possible toggles): ${JSON.stringify(toggleBtns)}`);

  // Reset
  await page.setViewportSize({ width: 1440, height: 900 });

  await browser.close();
  log('=== Chart verification complete ===');
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
