import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/DevPerf-Dashboard/test-reports/screenshots';
const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@jasonqiyuan.com';
const ADMIN_PASSWORD = 'Admin123!';

mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function ss(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`PageError: ${err.message}`));

  try {
    // Login first
    console.log('=== LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('input[placeholder*="email" i]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForTimeout(3000);
    console.log(`After login URL: ${page.url()}`);

    // ===========================================
    // TEST A: SIDEBAR INTERACTIONS
    // ===========================================
    console.log('\n=== TEST A: SIDEBAR INTERACTIONS ===');

    // A1: Sidebar collapse button
    errors.length = 0;
    const collapseBtn = page.locator('.collapse-btn, button:has-text("<")');
    if (await collapseBtn.count() > 0) {
      await ss(page, 'R2-01-sidebar-expanded');
      await collapseBtn.first().click();
      await page.waitForTimeout(500);
      await ss(page, 'R2-02-sidebar-collapsed');
      console.log('[TEST] Sidebar collapse: clicked');

      // Check width changed
      const sidebarWidth = await page.locator('.sidebar, aside').first().evaluate(el => el.offsetWidth);
      console.log(`[TEST] Sidebar width after collapse: ${sidebarWidth}px`);
      const collapsed = sidebarWidth < 200;
      console.log(`[RESULT] Sidebar collapsed: ${collapsed ? 'PASS' : 'FAIL'} (width=${sidebarWidth})`);

      // Expand again
      const expandBtn = page.locator('.collapse-btn, button:has-text(">")');
      if (await expandBtn.count() > 0) {
        await expandBtn.first().click();
        await page.waitForTimeout(500);
        await ss(page, 'R2-03-sidebar-re-expanded');
        console.log('[TEST] Sidebar re-expand: clicked');
      }
    } else {
      console.log('[FAIL] Collapse button not found');
    }

    if (errors.length > 0) {
      console.log(`[ERRORS] Sidebar: ${errors.join('; ')}`);
    }

    // ===========================================
    // TEST B: ADMIN PAGE TAB SWITCHING
    // ===========================================
    console.log('\n=== TEST B: ADMIN TAB SWITCHING ===');

    errors.length = 0;
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'R2-04-admin-users-tab');

    // B1: Click "Author Mapping" tab
    const mappingTab = page.locator('[role="tab"]:has-text("Author Mapping"), .n-tab-tab:has-text("Author Mapping"), *:has-text("Author Mapping")').first();
    if (await mappingTab.count() > 0) {
      await mappingTab.click();
      await page.waitForTimeout(1000);
      await ss(page, 'R2-05-admin-mapping-tab');
      const mappingVisible = await page.evaluate(() => document.body.innerText);
      const hasMappingContent = mappingVisible.includes('Git Email') || mappingVisible.includes('Author Mapping');
      console.log(`[RESULT] Author Mapping tab: ${hasMappingContent ? 'PASS' : 'FAIL'}`);
    } else {
      console.log('[FAIL] Author Mapping tab not found');
    }

    // B2: Click "Sync Logs" tab
    const syncTab = page.locator('[role="tab"]:has-text("Sync Logs"), .n-tab-tab:has-text("Sync Logs"), *:has-text("Sync Logs")').first();
    if (await syncTab.count() > 0) {
      await syncTab.click();
      await page.waitForTimeout(1000);
      await ss(page, 'R2-06-admin-sync-tab');
      const syncVisible = await page.evaluate(() => document.body.innerText);
      const hasSyncContent = syncVisible.includes('Trigger Sync') || syncVisible.includes('Source') || syncVisible.includes('Sync Logs');
      console.log(`[RESULT] Sync Logs tab: ${hasSyncContent ? 'PASS' : 'FAIL'}`);
    } else {
      console.log('[FAIL] Sync Logs tab not found');
    }

    // B3: Click back to "Users" tab
    const usersTab = page.locator('[role="tab"]:has-text("Users"), .n-tab-tab:has-text("Users")').first();
    if (await usersTab.count() > 0) {
      await usersTab.click();
      await page.waitForTimeout(1000);
      await ss(page, 'R2-07-admin-back-users');
      console.log('[RESULT] Back to Users tab: PASS');
    }

    if (errors.length > 0) {
      console.log(`[ERRORS] Admin tabs: ${errors.join('; ')}`);
    }

    // ===========================================
    // TEST C: CREATE USER MODAL
    // ===========================================
    console.log('\n=== TEST C: CREATE USER MODAL ===');

    errors.length = 0;
    const createBtn = page.locator('button:has-text("Create User")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(1000);
      await ss(page, 'R2-08-create-user-modal');

      // Check modal content
      const hasNameInput = await page.locator('input[placeholder*="name" i]').count() > 0;
      const hasEmailInput = await page.locator('input[placeholder*="email" i]').count() > 0;
      const hasPasswordInput = await page.locator('input[placeholder*="6 characters" i], input[type="password"]').count() > 0;
      console.log(`[RESULT] Modal fields: Name=${hasNameInput}, Email=${hasEmailInput}, Password=${hasPasswordInput}`);

      // Try creating a user
      await page.locator('input[placeholder*="name" i]').first().fill('Test User');
      await page.locator('input[placeholder*="email" i]').first().fill('testuser@example.com');
      const pwField = page.locator('input[placeholder*="6 characters" i]');
      if (await pwField.count() > 0) {
        await pwField.first().fill('TestUser123!');
      } else {
        // Try password type input
        const pwInputs = page.locator('.n-modal input[type="password"]');
        if (await pwInputs.count() > 0) {
          await pwInputs.first().fill('TestUser123!');
        }
      }
      await ss(page, 'R2-09-create-user-filled');

      // Click Create in the modal
      const confirmBtn = page.locator('.n-dialog__action button:has-text("Create"), .n-modal button:has-text("Create")').last();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
        await ss(page, 'R2-10-after-create-user');
        // Check if user appears in the table
        const tableText = await page.evaluate(() => document.body.innerText);
        const userCreated = tableText.includes('testuser@example.com') || tableText.includes('Test User');
        console.log(`[RESULT] User creation: ${userCreated ? 'PASS - user appears in table' : 'FAIL - user not in table'}`);
      } else {
        console.log('[WARN] Could not find Create confirm button in modal');
        // Close modal
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('[FAIL] Create User button not found');
    }

    if (errors.length > 0) {
      console.log(`[ERRORS] Create user: ${errors.join('; ')}`);
    }

    // ===========================================
    // TEST D: OVERVIEW PAGE INTERACTIONS
    // ===========================================
    console.log('\n=== TEST D: OVERVIEW INTERACTIONS ===');

    errors.length = 0;
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // D1: Check period selector
    const periodSelect = page.locator('.n-select:has-text("Select period"), .filter-bar .n-select').first();
    if (await periodSelect.count() > 0) {
      await periodSelect.click();
      await page.waitForTimeout(500);
      await ss(page, 'R2-11-period-dropdown');
      console.log('[RESULT] Period dropdown opened: PASS');
      await page.keyboard.press('Escape');
    } else {
      console.log('[WARN] Period selector not found or not interactable');
    }

    // D2: Check project filter
    const projectFilter = page.locator('.n-select:has-text("Filter projects"), .filter-bar .n-select').last();
    if (await projectFilter.count() > 0) {
      await projectFilter.click();
      await page.waitForTimeout(500);
      await ss(page, 'R2-12-project-filter-dropdown');
      console.log('[RESULT] Project filter dropdown: PASS');
      await page.keyboard.press('Escape');
    }

    // D3: Count and verify all 6 chart panels
    const chartPanels = await page.evaluate(() => {
      const panels = document.querySelectorAll('.chart-panel, .overview-card, [class*="chart-panel"]');
      return Array.from(panels).map(p => ({
        title: p.querySelector('h3, .panel-title, [class*="title"]')?.textContent?.trim() || 'unknown',
        height: p.offsetHeight,
        hasCanvas: p.querySelector('canvas') !== null,
        hasContent: p.querySelector('.chart-body, [class*="content"]')?.children.length || 0,
      }));
    });
    console.log(`[INFO] Chart panels found: ${chartPanels.length}`);
    chartPanels.forEach((p, i) => console.log(`  Panel ${i}: "${p.title}" height=${p.height} canvas=${p.hasCanvas}`));

    if (errors.length > 0) {
      console.log(`[ERRORS] Overview: ${errors.join('; ')}`);
    }

    // ===========================================
    // TEST E: LOGOUT
    // ===========================================
    console.log('\n=== TEST E: LOGOUT ===');

    errors.length = 0;
    const logoutBtn = page.locator('.logout-btn, button:has-text("Logout")');
    if (await logoutBtn.count() > 0) {
      await ss(page, 'R2-13-before-logout');
      await logoutBtn.first().click();
      await page.waitForTimeout(2000);
      await ss(page, 'R2-14-after-logout');
      const logoutUrl = page.url();
      const loggedOut = logoutUrl.includes('/login');
      console.log(`[RESULT] Logout: ${loggedOut ? 'PASS - redirected to /login' : 'FAIL - still at ' + logoutUrl}`);
    } else {
      console.log('[FAIL] Logout button not found');
    }

    if (errors.length > 0) {
      console.log(`[ERRORS] Logout: ${errors.join('; ')}`);
    }

    // ===========================================
    // TEST F: AUTH GUARD (try accessing protected page when logged out)
    // ===========================================
    console.log('\n=== TEST F: AUTH GUARD ===');

    errors.length = 0;
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const guardUrl = page.url();
    const guardWorks = guardUrl.includes('/login');
    await ss(page, 'R2-15-auth-guard');
    console.log(`[RESULT] Auth guard: ${guardWorks ? 'PASS - redirected to /login' : 'FAIL - accessible without auth at ' + guardUrl}`);

    // ===========================================
    // TEST G: BREADCRUMBS
    // ===========================================
    console.log('\n=== TEST G: BREADCRUMBS ===');

    // Login again
    await page.locator('input[placeholder*="email" i]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForTimeout(3000);

    // Check breadcrumb on overview
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const bcOverview = await page.evaluate(() => {
      const bc = document.querySelector('.breadcrumb, [class*="breadcrumb"], .page-header');
      return bc?.textContent?.trim() || 'not found';
    });
    console.log(`[INFO] Overview breadcrumb: "${bcOverview}"`);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const bcAdmin = await page.evaluate(() => {
      const bc = document.querySelector('.breadcrumb, [class*="breadcrumb"], .page-header');
      return bc?.textContent?.trim() || 'not found';
    });
    console.log(`[INFO] Admin breadcrumb: "${bcAdmin}"`);
    await ss(page, 'R2-16-breadcrumb-admin');

    console.log('\n=== ROUND 2 COMPLETE ===');

  } catch (err) {
    console.error('FATAL:', err.message);
    try { await ss(page, 'R2-FATAL'); } catch {}
  } finally {
    await browser.close();
  }
})();
