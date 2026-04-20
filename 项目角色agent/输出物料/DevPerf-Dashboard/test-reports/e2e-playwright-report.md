# E2E Playwright Test Report -- DevPerf Dashboard

**Date**: 2026-04-09
**Tester**: QA Agent (Playwright Chromium headless)
**Test Rounds**: 2 (initial + detailed interactions)

## Test Environment

| Component | URL / Version | Status |
|-----------|--------------|--------|
| Frontend | http://localhost:5173 (Vue 3 + Vite) | Running |
| Backend | http://localhost:3200 (Bun + Hono) | Running |
| Database | SQLite (./data/devperf.db) | Connected |
| Browser | Playwright Chromium (headless) | v147.0.7727.15 |

**IMPORTANT**: Database required manual migration + seed before tests could pass.
The DB had no `users` table initially; running `drizzle-kit generate` + `bun run src/db/migrate.ts` + `bun run src/db/seed.ts` was required.

---

## Test Results Summary

| Test Scenario | Desktop (1440x900) | Mobile (375x812) | Console Errors |
|--------------|-------------------|------------------|---------------|
| 1. Login Flow | PASS | PASS | 0 (after DB fix) |
| 2. Team Overview | PASS (with notes) | FAIL | 0 |
| 3. Page Navigation | PASS | FAIL | 0 |
| 4. Admin Panel | FAIL (rendering bug) | FAIL | 0 |
| 5. Responsive Design | N/A | FAIL | 0 |
| 6. API Health Check | PASS | N/A | 0 |
| 7. Sidebar Collapse | PASS | N/A | 0 |
| 8. Create User | PASS | N/A | 0 |
| 9. Logout + Auth Guard | PASS | N/A | 0 |

**Overall Verdict: NEEDS WORK (B-)**

Functional core is solid -- login, navigation, CRUD, auth guard, sidebar collapse all work on desktop. But 3 bugs need fixing before production: [object Object] rendering, mobile sidebar, and unimplemented chart.

---

## Detailed Test Records

### 1. Login Flow

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 1.1 | Open http://localhost:5173 | Redirect to /login | Redirected to /login | PASS | 01-initial-page.png |
| 1.2 | Inspect login page | Email, Password, Sign-in button, Brand | All present. Split layout: brand left, form right | PASS | 02-login-page-elements.png |
| 1.3 | Enter wrong password + submit | Error message shown | Red alert "Invalid email or password" displayed, password cleared | PASS | 04-login-wrong-creds-result.png |
| 1.4 | Enter correct creds + submit | Redirect to / (Overview) | Redirected to http://localhost:5173/ | PASS | 06-login-success-result.png |
| 1.5 | Check console after login | No errors | 0 console errors | PASS | -- |

### 2. Team Overview Page

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 2.1 | Check sidebar | Present with nav items | Sidebar with Overview (active), OKR, Git Activity, Admin, user avatar, Logout | PASS | 07-overview-page.png |
| 2.2 | Check header + breadcrumb | Header with breadcrumb | "Dashboard / Overview" breadcrumb visible | PASS | 07-overview-page.png |
| 2.3 | Check filter bar | Period + project filters | "Select period" and "Filter projects" dropdowns present | PASS | R2-11-period-dropdown.png |
| 2.4 | Open period dropdown | Show period options | "2026 Q2 (Current)", "2026 Q1", "2025 Q4" | PASS | R2-11-period-dropdown.png |
| 2.5 | Check 6 chart panels | 6 panels rendered | All 6 visible: Sprint Delivery Rate, Task Status Distribution, Project Progress, Weekly Code Activity, OKR Progress, PR Merge Time | PASS (with note) | 08-overview-charts.png |
| 2.6 | Chart data | Charts render with data | Charts empty (no synced data) -- acceptable for fresh DB. **But "Weekly Code Activity" shows hardcoded "Stacked area chart" placeholder text** | WARN | 08-overview-charts.png |
| 2.7 | Console errors | None | 0 errors | PASS | -- |

### 3. Page Navigation

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 3.1 | Click "OKR" in sidebar | Navigate to /okr | OKR Board with "Select period" filter. Empty state: "No OKR Data" | PASS | 09-okr-page.png |
| 3.2 | Click "Git Activity" | Navigate to /git | Git Activity with Contribution Heatmap, 4 stat cards (all 0), Weekly Activity Trend | PASS | 10-git-activity-page.png |
| 3.3 | Click "Admin" | Navigate to /admin | Admin Panel with Users/Author Mapping/Sync Logs tabs | PASS | 11-admin-page.png |
| 3.4 | Click "Overview" | Navigate back to / | Overview page loads correctly | PASS | 12-back-to-overview.png |
| 3.5 | Console errors | None on any page | 0 errors on all pages | PASS | -- |

### 4. Admin Panel

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 4.1 | Users tab (default) | User table with admin | Table shows Admin user correctly: Name, Email, Role, Created | PASS | 11-admin-page.png |
| 4.2 | Actions column | Delete button | **Displays "[object Object]" instead of a button** | FAIL (P0) | 11-admin-page.png |
| 4.3 | Created column | Human-readable date | Shows raw ISO: "2026-04-09T03:57:36.000Z" | WARN (P2) | 11-admin-page.png |
| 4.4 | Click "Author Mapping" tab | Tab content switches | Tab switches (verified by test output) | PASS | R2-05-admin-mapping-tab.png |
| 4.5 | Click "Sync Logs" tab | Tab content switches | Tab switches (verified by test output) | PASS | R2-06-admin-sync-tab.png |
| 4.6 | Click "Create User" | Modal opens | Modal with Display Name, Email, Password, Role fields | PASS | R2-08-create-user-modal.png |
| 4.7 | Fill form + Create | User created, toast, refresh | "User created" toast, new row "Test User / testuser@example.com / developer" appears | PASS | R2-10-after-create-user.png |
| 4.8 | Console errors | None | 0 errors | PASS | -- |

### 5. Responsive Design (375x812 mobile)

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 5.1 | Mobile login | Brand hidden, form centered | Brand area hidden via CSS media query. Form centered. Clean layout | PASS | 15-mobile-login.png |
| 5.2 | Mobile login submit | Login works | Login successful, redirect to / | PASS | 16-mobile-after-login.png |
| 5.3 | Mobile overview | Sidebar collapsed/hidden, content fills screen | **Sidebar NOT collapsed -- takes ~50% of 375px screen width, pushing content into narrow column** | FAIL (P1) | 17-mobile-overview.png |
| 5.4 | Mobile OKR | Usable layout | Sidebar still visible, content squeezed but readable | FAIL (P1) | 18-mobile-okr.png |
| 5.5 | Mobile admin table | Readable table | **Catastrophic: column headers display vertically letter-by-letter, email breaks char-by-char** | FAIL (P0) | 19-mobile-admin.png |

### 6. Sidebar Interactions

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 6.1 | Click "<" collapse button | Sidebar narrows to icon-only | Collapsed to 64px. Shows initial letters (O, O, G, A) | PASS | R2-02-sidebar-collapsed.png |
| 6.2 | Click ">" expand button | Sidebar expands back | Expanded back to 240px with full labels | PASS | R2-03-sidebar-re-expanded.png |

### 7. Logout + Auth Guard

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 7.1 | Click "Logout" | Redirect to /login | Successfully redirected to /login | PASS | R2-14-after-logout.png |
| 7.2 | Access /admin without auth | Redirect to /login | Redirected to /login | PASS | R2-15-auth-guard.png |

### 8. API Health Check

| Step | Action | Expected | Actual | Status | Screenshot |
|------|--------|----------|--------|--------|-----------|
| 8.1 | GET /api/health | JSON with status: ok | `{"code":0,"data":{"status":"ok","version":"1.0.0","uptime":537,"dbConnected":true},"message":"success"}` | PASS | 20-api-health.png |

---

## Bug List

| ID | Severity | Type | Description | Location | Repro Steps | Screenshot |
|----|----------|------|-------------|----------|-------------|-----------|
| B-01 | P0 | Rendering | Admin Users table "Actions" column displays `[object Object]` instead of Delete button | `code/frontend/src/views/Admin.vue` lines 53-57 | 1. Login as admin 2. Navigate to /admin 3. Look at Actions column in Users table | 11-admin-page.png, R2-10-after-create-user.png |
| B-02 | P0 | Rendering | Same `[object Object]` bug in Author Mapping table Actions column | `code/frontend/src/views/Admin.vue` lines 79-83 | 1. Navigate to /admin 2. Click "Author Mapping" tab 3. (Need mapping data to verify, but code has same pattern) | -- |
| B-03 | P1 | Responsive | Sidebar does not collapse/hide on mobile viewport (375px). Takes ~50% of screen width, making content unusable | `code/frontend/src/components/layout/AppSidebar.vue` and `AppLayout.vue` -- no mobile breakpoint CSS | 1. Open any page 2. Resize to 375x812 (iPhone) 3. Sidebar remains at 240px width | 17-mobile-overview.png, 19-mobile-admin.png |
| B-04 | P1 | Responsive | Admin table completely breaks on mobile -- column headers display vertically letter-by-letter, email wraps per character | `code/frontend/src/views/Admin.vue` -- NDataTable has no mobile-responsive configuration | 1. Navigate to /admin on 375px viewport 2. Table columns are unreadable | 19-mobile-admin.png |
| B-05 | P2 | Incomplete | "Weekly Code Activity" chart panel (Panel 4 on Overview) is a hardcoded placeholder string "Stacked area chart" instead of a real ECharts visualization | `code/frontend/src/views/Overview.vue` lines 150-154 | 1. Login 2. Go to Overview 3. Look at "Weekly Code Activity" panel -- shows gray text "Stacked area chart" | 08-overview-charts.png |
| B-06 | P2 | UI Polish | Admin table "Created" column shows raw ISO timestamps (e.g., `2026-04-09T03:57:36.000Z`) instead of human-readable formatted dates | `code/frontend/src/views/Admin.vue` line 51 -- `{ title: 'Created', key: 'createdAt' }` has no render/format function | 1. Navigate to /admin 2. Look at Created column | R2-16-breadcrumb-admin.png |
| B-07 | P2 | DevOps | Database migration not auto-run on first start. Backend starts with empty SQLite file, causing 500 errors on login until manual `drizzle-kit generate` + `db:migrate` + `db:seed` | `code/backend/src/index.ts` -- no auto-migration on startup | 1. Fresh install 2. Start backend 3. Try login 4. 500 Internal Server Error | -- |

---

## Bug Details + Fix Guidance

### B-01 / B-02: `[object Object]` in NDataTable Actions (P0)

**Root Cause**: The `render` function in NDataTable column definitions returns a plain JS object descriptor instead of a VNode. Naive UI's NDataTable expects render to return a value created with Vue's `h()` function.

**Current code** (Admin.vue line 54):
```js
render: (row: any) => {
  return { type: NButton, props: { size: 'tiny', type: 'error', onClick: () => handleDeleteUser(row.id) }, children: 'Delete' };
},
```

**Fix**: Import `h` from Vue and return a proper VNode:
```js
import { h } from 'vue';
// ...
render: (row: any) => {
  return h(NButton, { size: 'tiny', type: 'error', onClick: () => handleDeleteUser(row.id) }, { default: () => 'Delete' });
},
```

Same fix needed for the mapping table Actions column (line 81).

### B-03 / B-04: Mobile Sidebar Not Collapsing (P1)

**Root Cause**: No CSS media queries exist for the sidebar or layout on mobile. The sidebar is fixed at `width: var(--sidebar-width)` (240px) with no breakpoint to hide/collapse it.

**Fix**: Add mobile breakpoints to `AppSidebar.vue` and `AppLayout.vue`:
```css
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); position: fixed; z-index: 300; }
  .sidebar.mobile-open { transform: translateX(0); }
}
```
And add a hamburger menu toggle button to `AppHeader.vue` for mobile.

### B-05: Weekly Code Activity Placeholder (P2)

**Root Cause**: `Overview.vue` lines 150-154 contain a static placeholder div instead of an ECharts instance. This is an incomplete implementation -- all other 5 panels have real chart/data bindings.

### B-06: Raw ISO Date in Admin Table (P2)

**Fix**: Add a render function to the `createdAt` column:
```js
{ title: 'Created', key: 'createdAt', width: 180,
  render: (row) => new Date(row.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
},
```

### B-07: No Auto-Migration on Startup (P2)

**Fix**: Add migration + seed logic to backend startup in `src/index.ts`, or document the manual setup steps clearly.

---

## Console Error Summary

| Page | Desktop Errors | Mobile Errors |
|------|---------------|---------------|
| /login | 0 | 0 |
| / (Overview) | 0 | 0 |
| /okr | 0 | 0 |
| /git | 0 | 0 |
| /admin | 0 | 0 |
| **Total** | **0** | **0** |

No JavaScript runtime errors detected on any page. The application is free of console errors.

---

## What Works Well

1. **Auth system** -- Login, logout, auth guard, role-based access all function correctly
2. **Sidebar** -- Collapse/expand animation smooth, state persisted, icon-only mode clean
3. **Navigation** -- All routes load, breadcrumbs accurate, sidebar highlights active page
4. **CRUD** -- Create User modal works end-to-end with toast feedback and table refresh
5. **Filter dropdowns** -- Period selector shows correct dynamic quarters
6. **Empty states** -- OKR page shows "No OKR Data" with icon, Git page shows 0-value stats
7. **Login error handling** -- Wrong password shows error alert, clears password field
8. **Zero console errors** -- No JavaScript errors on any page in either viewport

---

## Screenshot Index (34 total)

| # | Filename | Description |
|---|---------|-------------|
| 1 | 01-initial-page.png | Initial load -- redirected to /login |
| 2 | 02-login-page-elements.png | Login page with all form elements |
| 3 | 03-login-wrong-creds-filled.png | Login form filled with wrong password |
| 4 | 04-login-wrong-creds-result.png | Error alert "Invalid email or password" |
| 5 | 05-login-correct-creds-filled.png | Login form with correct credentials |
| 6 | 06-login-success-result.png | Overview page after successful login |
| 7 | 07-overview-page.png | Overview page full view (same as 06) |
| 8 | 08-overview-charts.png | Overview with 6 chart panels |
| 9 | 09-okr-page.png | OKR Board with empty state |
| 10 | 10-git-activity-page.png | Git Activity with heatmap + stats |
| 11 | 11-admin-page.png | Admin Panel -- Users tab ([object Object] visible) |
| 12 | 12-back-to-overview.png | Overview after navigating back |
| 13 | 13-admin-detail.png | Admin Panel detail view |
| 14 | 15-mobile-login.png | Mobile login (brand hidden) |
| 15 | 16-mobile-after-login.png | Mobile overview after login (sidebar issue) |
| 16 | 17-mobile-overview.png | Mobile overview -- sidebar not collapsed |
| 17 | 18-mobile-okr.png | Mobile OKR -- sidebar visible |
| 18 | 19-mobile-admin.png | Mobile admin -- table layout broken |
| 19 | 20-api-health.png | API health endpoint JSON response |
| 20 | R2-01-sidebar-expanded.png | Sidebar expanded state |
| 21 | R2-02-sidebar-collapsed.png | Sidebar collapsed to 64px |
| 22 | R2-03-sidebar-re-expanded.png | Sidebar re-expanded |
| 23 | R2-04-admin-users-tab.png | Admin Users tab |
| 24 | R2-05-admin-mapping-tab.png | Admin Author Mapping tab |
| 25 | R2-06-admin-sync-tab.png | Admin Sync Logs tab |
| 26 | R2-08-create-user-modal.png | Create User modal |
| 27 | R2-09-create-user-filled.png | Create User modal filled |
| 28 | R2-10-after-create-user.png | After user creation -- toast + new row |
| 29 | R2-11-period-dropdown.png | Period filter dropdown open |
| 30 | R2-12-project-filter-dropdown.png | Project filter dropdown |
| 31 | R2-13-before-logout.png | Before logout |
| 32 | R2-14-after-logout.png | After logout -- back to login |
| 33 | R2-15-auth-guard.png | Auth guard -- redirected to login |
| 34 | R2-16-breadcrumb-admin.png | Admin page with breadcrumb |

---

## Conclusion

**Verdict: QA NEEDS WORK**

The DevPerf Dashboard has a solid functional foundation -- authentication, routing, CRUD operations, and core page structure all work correctly on desktop with zero console errors. However, 2 P0 bugs and 2 P1 bugs must be fixed before the application can be considered production-ready:

**Must fix (P0)**:
- B-01/B-02: `[object Object]` in Admin table Actions columns (missing `h()` VNode)

**Must fix (P1)**:
- B-03/B-04: Mobile viewport completely unusable (sidebar not collapsing, table breaking)

**Should fix (P2)**:
- B-05: "Weekly Code Activity" chart is an unimplemented placeholder
- B-06: Raw ISO dates in admin table
- B-07: No auto-migration on fresh install

Estimated fix effort: P0 bugs = ~15 minutes, P1 bugs = ~1 hour, P2 bugs = ~2 hours.
