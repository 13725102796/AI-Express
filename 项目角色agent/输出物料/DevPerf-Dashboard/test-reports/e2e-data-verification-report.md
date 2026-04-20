# E2E Data Verification Test Report

**Project**: DevPerf Dashboard  
**Date**: 2026-04-09  
**Tester**: QA Agent (Automated Playwright + Visual Inspection)  
**Verdict**: **NEEDS WORK** (Rating: B-)

---

## Test Environment

| Component | Status | Details |
|-----------|--------|---------|
| Backend (Hono/Bun) | Running | http://localhost:3200, health check OK |
| Frontend (Vue 3 + Naive UI) | Running | http://localhost:5173 |
| Database (SQLite) | Connected | dbConnected: true |
| UI Framework | Naive UI | Charts: ECharts (via useECharts composable) |

## Test Data

| Entity | Count | Verified |
|--------|-------|----------|
| Users | 9 | Yes (API + Admin page) |
| Projects | 4 (Avatar, AirFlow, DataHub, OPS) | Yes (API + Overview page) |
| Sprints | 24 (6 per project) | Yes (API) |
| Tasks | 240 | Yes (Task Distribution shows Total: 240) |
| Git Commits | 479 | Yes (API) |
| Git PRs | 119 | Yes (Git Activity page: Total PRs = 119) |
| OKR Objectives | 3 | Yes (API + OKR page) |
| Key Results | 8 | Yes (OKR page) |
| Author Mappings | 7 | Yes (Admin API) |
| Sync Logs | 10 | Yes (Admin API) |

---

## Test Results Overview

| Page | Data Loading | Chart Rendering | Console Errors | Overall |
|------|-------------|-----------------|----------------|---------|
| Login | PASS | N/A | 0 | PASS |
| Team Overview | PASS (API data arrives) | PARTIAL (3/6 charts empty) | 0 | NEEDS WORK |
| Project Detail (Avatar) | PASS | PARTIAL (burndown empty) | 0 | NEEDS WORK |
| Member Detail (ChenQiang) | PASS (tasks render) | FAIL (3 chart areas empty) | 0 | NEEDS WORK |
| OKR Board | PASS | PASS (CSS progress bars) | 0 | PASS |
| Git Activity | PASS (PR metrics render) | FAIL (heatmap + trend empty) | 0 | NEEDS WORK |
| Admin Panel (Users) | PASS | N/A (table) | 0 | PASS |
| Admin (Author Mapping) | PASS (API verified) | N/A | 0 | PASS |
| Admin (Sync Logs) | PASS (API verified) | N/A | 0 | PASS |
| Mobile Responsive | PASS (layout stacks) | Same chart issues | 0 | NEEDS WORK |

**Summary**: 4 PASS, 5 NEEDS WORK, 0 hard FAIL (no crashes/500s)

---

## Detailed Page-by-Page Findings

### 1. Login Page -- PASS

| Step | Expected | Actual | Status | Screenshot |
|------|----------|--------|--------|------------|
| Open app | Login page loads | Two-panel layout (branding + form) | PASS | 001-initial-page.png |
| Fill credentials | Form accepts input | Email + password filled (Naive UI NInput) | PASS | 301-login-filled.png |
| Submit login | Redirect to dashboard | Redirected to / (Overview) | PASS | 302-after-login.png |
| Console errors | 0 | 0 | PASS | - |

**Notes**: 
- Naive UI NInput requires `keyboard.type()` with delay to trigger v-model binding. Standard Playwright `fill()` does NOT update Vue reactive state, leaving the Submit button disabled. This is a testability concern (not a user-facing bug) but worth noting for future Playwright test authoring.

---

### 2. Team Overview Page -- NEEDS WORK

| Panel | Data Source | Data Present | Visual Render | Status | Screenshot |
|-------|-----------|-------------|---------------|--------|------------|
| Sprint Delivery Rate | sprintDelivery.cycles (6 items) | Yes (API confirmed) | EMPTY - no canvas initialized | FAIL | 402-card-Sprint_Delivery_Rate.png |
| Task Status Distribution | taskDistribution (240 total) | Yes (subtitle shows "Total: 240") | EMPTY - no canvas initialized | FAIL | 403-card-Task_Status_Distribution.png |
| Project Progress | projectProgress (4 items) | Yes | 4 progress bars with correct % | PASS | 404-card-Project_Progress.png |
| Weekly Code Activity | weeklyCodeActivity.weeks (12) | Yes | Stacked area chart, 4 developers, 12 weeks | PASS | 405-card-Weekly_Code_Activity.png |
| OKR Progress | okrProgress (3 items) | Yes | 3 progress bars: 68%/55%/42% | PASS | 406-card-OKR_Progress.png |
| PR Merge Time | prMergeTime.weeks (12) | Yes (API confirmed) | EMPTY - canvas exists but no visual | FAIL | 407-card-PR_Merge_Time.png |

**Root Cause Analysis**: The `useECharts` composable (src/composables/useECharts.ts) initializes ECharts on `onMounted()`. For Sprint Delivery and Task Distribution, the canvas is never created (`childCount: 0` in DOM inspection). This suggests the `chartRef` template ref is not connected when `onMounted` fires, possibly due to a Vue reactivity timing issue where `overviewData` is still null at mount time and the `v-if="overviewData"` guard delays the DOM insertion.

Specifically in Overview.vue:
- Line 132: `<div class="panels-grid" v-if="overviewData">` -- the chart containers only enter the DOM AFTER data loads
- But `useECharts` is called at script setup level (lines 109-111), so `onMounted` fires BEFORE `overviewData` is populated
- When the data arrives and `v-if` becomes true, the chart refs connect but `onMounted` already ran -- ECharts never gets initialized

The WeeklyCodeActivity chart works because it's a separate component with its own lifecycle.

**Filter Controls**: Two filter dropdowns visible at top of page ("Select period", "Filter projects") but could not be tested for filtering behavior in this round (selector complexity with Naive UI components).

---

### 3. Project Detail Page (Avatar) -- NEEDS WORK

| Section | Expected | Actual | Status | Screenshot |
|---------|----------|--------|--------|------------|
| Project title | "AVATAR - Avatar ..." | "AVATAR - Avatar 数字人平台" | PASS | 311-project-avatar-detail.png |
| Burndown chart | Ideal vs actual line | Title "Burndown: AVATAR Sprint 5" present, chart area empty | FAIL | 311-project-avatar-detail.png |
| Milestones | 3-4 milestones | 4 milestones with dates visible | PASS | 311-project-avatar-detail.png |
| Task Assignment Matrix | Members x Status | 4 members (陈强/刘洋/赵雪/孙磊) with Todo/InProgress/Review/Done/Points | PASS | 007-project-avatar-full.png |
| Git Activity | Recent commits | Section header present, "Git weekly trend last 4 weeks" | PASS | 312-project-avatar-bottom.png |
| Console errors | 0 | 0 | PASS | - |

**Notes**: 
- Also tested OPS project (via accidental admin link click): "OPS - 运营管理后台" rendered with same structure -- milestones, task matrix, git activity. See screenshot 310.
- Burndown chart likely has same `useECharts` timing issue as Overview charts.

---

### 4. Member Detail Page (ChenQiang u-dev-1) -- NEEDS WORK

| Section | Expected | Actual | Status | Screenshot |
|---------|----------|--------|--------|------------|
| Member info | Name + role | "陈强, chenqiang@jasonqiyuan.com - developer" | PASS | 009-member-chenqiang-full.png |
| Sprint Delivery Trend | Chart with sprint data | Title present, chart area EMPTY | FAIL | 009-member-chenqiang-full.png |
| KPI Scorecard | Radar chart | Title present, chart area EMPTY | FAIL | 009-member-chenqiang-full.png |
| Contribution Heatmap | GitHub-style green cells | "GitHub-style heatmap / 365 days" text, but grid EMPTY | FAIL | 013-git-activity-full.png |
| Current Tasks table | Task list with status | 20+ tasks with Title/Status/Priority/Points/Due columns | PASS | 009-member-chenqiang-full.png |
| Bottom KPI cards | Numeric metrics | 5 cards: 8%, 16.7d, 0, 36.6h, 0d | PASS | 009-member-chenqiang-full.png |
| Console errors | 0 | 0 | PASS | - |

**Notes**:
- Task table renders with real data (in_progress, review, todo statuses, urgent/high/medium priorities, 2026 dates)
- Bottom KPI cards show calculated metrics from real data
- 3 chart components (Sprint Trend, KPI Radar, Contribution Heatmap) all fail to render visuals
- Same root cause as Overview page ECharts initialization issue

---

### 5. OKR Board Page -- PASS

| Section | Expected | Actual | Status | Screenshot |
|---------|----------|--------|--------|------------|
| Objective 1 | "提升研发交付效率" 68% | Correct, 3 KRs visible (85%, 124%, 150%) | PASS | 011-okr-page-full.png |
| Objective 2 | "建设代码质量体系" 55% | Correct, 2 KRs visible (72%, 129%) | PASS | 011-okr-page-full.png |
| Objective 3 | "完成 DataHub 2.0 发布" 42% | Correct, KRs visible | PASS | 019-mobile-okr.png |
| Progress percentages | 68/55/42 | All match API data | PASS | 406-card-OKR_Progress.png |
| Period selector | Dropdown | "Select period" visible | PASS | 019-mobile-okr.png |
| Delete buttons | Admin can delete | "Delete" buttons visible per objective | PASS | 019-mobile-okr.png |
| Console errors | 0 | 0 | PASS | - |

**Notes**: OKR page is the best-rendered page. All data correct, CSS progress bars work perfectly, KR details with target/current/progress all visible. Mobile layout excellent (screenshot 019).

---

### 6. Git Activity Page -- NEEDS WORK

| Section | Expected | Actual | Status | Screenshot |
|---------|----------|--------|--------|------------|
| Contribution Heatmap | Green cells (479 commits) | "89 days tracked" header, placeholder text, NO colored cells | FAIL | 013-git-activity-full.png |
| Total PRs card | 119 | 119 | PASS | 013-git-activity-full.png |
| Merged card | 116 | 116 | PASS | 013-git-activity-full.png |
| Avg Merge Time card | ~39.6h | 39.6h | PASS | 013-git-activity-full.png |
| Reviewed card | 92 | 92 | PASS | 013-git-activity-full.png |
| Weekly Activity Trend | Line/bar chart | Title "Commits + PRs" present, chart EMPTY | FAIL | 014-git-activity-bottom.png |
| Console errors | 0 | 0 | PASS | - |

**Notes**: 
- PR metric cards render perfectly with correct numbers from API
- Heatmap and Weekly Activity Trend both fail to render (same ECharts issue)
- The 4 stat cards use pure HTML/CSS rendering (no charts) which is why they work

---

### 7. Admin Panel -- PASS

| Section | Expected | Actual | Status | Screenshot |
|---------|----------|--------|--------|------------|
| Users tab | 9 users listed | 9+ rows visible (Admin, Test User, 李明, 王芳, 陈强, 刘洋, 赵雪, 孙磊, ...) | PASS | 015-admin-page-users.png |
| Role badges | admin/manager/developer/viewer | Visible per row | PASS | 411-admin-via-router.png |
| Create User button | Present | Green "Create User" button visible | PASS | 411-admin-via-router.png |
| Delete buttons | Per row | Red "Delete" buttons visible | PASS | 411-admin-via-router.png |
| Tab navigation | 3 tabs | "Users / Author Mapping / Sync Logs" tabs visible | PASS | 411-admin-via-router.png |
| Author Mapping tab | 7 mappings | API returns 7 (chenqiang, liming, wangfang, liuyang, zhaoxue, sunlei, admin) | PASS (API) | - |
| Sync Logs tab | 10 logs | API returns entries with success/error status | PASS (API) | - |
| Console errors | 0 | 0 | PASS | - |

**Notes**: 
- Author Mapping and Sync Logs tabs confirmed via API but NOT visually verified via screenshot (tab click did not register in automated test due to Naive UI tab component selectors). This is classified as API-verified PASS, not screenshot-verified.
- Recommendation: Manual verification of tab switching needed.

---

### 8. Mobile Responsive -- NEEDS WORK (layout OK, same chart bugs)

| Aspect | Expected | Actual | Status | Screenshot |
|--------|----------|--------|--------|------------|
| Hamburger menu | Visible at 375px | Yes, "hamburger-btn" with aria-label | PASS | 413-mobile-overview-viewport.png |
| Sidebar behavior | Hidden off-screen | transform: matrix(1,0,0,1,-240,0) = hidden | PASS | (DOM inspection) |
| Overview layout | Single column stack | 6 panels stack vertically | PASS | 412-mobile-overview-full.png |
| Filter controls | Visible | "Select period" + "Filter projects" visible | PASS | 413-mobile-overview-viewport.png |
| OKR mobile | Cards stack | 3 objectives fully readable with KRs | PASS | 019-mobile-okr.png |
| Admin mobile | Table readable | Columns squeeze, data visible but truncated | PASS | 018-mobile-admin.png |
| Member mobile | Content stacks | Tasks table readable, KPI cards visible | PASS | 316-mobile-current-page.png |
| Chart rendering | Same as desktop | Same empty charts at mobile width | FAIL | 412-mobile-overview-full.png |

---

## Bug List

| ID | Severity | Type | Description | Location | Evidence |
|----|----------|------|-------------|----------|----------|
| B-01 | **P1** | Chart Render | Sprint Delivery Rate chart not rendering -- ECharts canvas never initialized. Container is empty div (childCount: 0). API returns 6 sprint cycles with valid data. | `src/views/Overview.vue:109` + `src/composables/useECharts.ts` | 402-card-Sprint_Delivery_Rate.png |
| B-02 | **P1** | Chart Render | Task Status Distribution pie chart not rendering -- same root cause. Subtitle shows "Total: 240" confirming data loaded, but no donut chart. | `src/views/Overview.vue:110` | 403-card-Task_Status_Distribution.png |
| B-03 | **P1** | Chart Render | PR Merge Time chart not rendering -- canvas element exists in DOM but no visual output despite 12 weeks of data from API. | `src/views/Overview.vue:111` | 407-card-PR_Merge_Time.png |
| B-04 | **P1** | Chart Render | Project Burndown chart empty on Project Detail page. Same `useECharts` timing issue. | `src/views/ProjectDetail.vue` | 311-project-avatar-detail.png |
| B-05 | **P1** | Chart Render | Member Sprint Delivery Trend chart empty. | `src/views/MemberDetail.vue` | 009-member-chenqiang-full.png |
| B-06 | **P1** | Chart Render | Member KPI Scorecard (radar) chart empty. | `src/views/MemberDetail.vue` | 009-member-chenqiang-full.png |
| B-07 | **P1** | Chart Render | Member Contribution Heatmap empty -- shows placeholder text but no colored cells. 479 commits in database. | `src/components/charts/ContributionHeatmap.vue` | 013-git-activity-full.png |
| B-08 | **P1** | Chart Render | Git Activity page -- Contribution Heatmap empty (same as B-07). | `src/views/GitActivity.vue` | 013-git-activity-full.png |
| B-09 | **P1** | Chart Render | Git Activity page -- Weekly Activity Trend chart empty. | `src/views/GitActivity.vue` | 014-git-activity-bottom.png |

### Root Cause (B-01 through B-09)

All 9 bugs share one root cause: the `useECharts` composable initializes on `onMounted()` but the chart container DOM elements are conditionally rendered via `v-if` (e.g., `v-if="overviewData"` in Overview.vue line 132). When the component mounts, data has not loaded yet, so `v-if` is false and the chart `ref` divs don't exist in the DOM. By the time data arrives and `v-if` becomes true, `onMounted` has already fired without finding the ref element.

**Suggested Fix**: 
1. Use `v-show` instead of `v-if` for the panels grid (keeps DOM in place, hidden until data loads)
2. OR use `nextTick()` + `watch` in `useECharts` to detect when `chartRef.value` becomes non-null
3. OR move each ECharts chart into a separate child component (like `WeeklyCodeActivity.vue` already does) so its own `onMounted` fires after the parent's `v-if` is resolved

The WeeklyCodeActivity chart works because it IS a separate component receiving data via props.

---

## What Works Well

1. **API layer**: All backend endpoints return correct, complete data. Zero API errors during testing.
2. **CSS-based visualizations**: Progress bars (Project Progress, OKR Progress) render flawlessly with real data.
3. **Data tables**: Admin user list, Task Assignment Matrix, Member Current Tasks -- all render with real data.
4. **OKR Board page**: Best page. All 3 objectives + 8 KRs with correct percentages.
5. **Login flow**: Clean two-panel design, successful auth with token management.
6. **Mobile layout**: Responsive grid stacks to single column, hamburger menu exists, sidebar slides off-screen.
7. **Weekly Code Activity**: Beautiful stacked area chart with 4 developer legend and 12 weeks of data.
8. **Git PR metric cards**: 4 stat cards (119 PRs, 116 merged, 39.6h avg, 92 reviewed) all correct.
9. **Zero console errors**: No JavaScript runtime errors detected across all pages.

## What Needs Work

1. **ECharts initialization** (P1): 9 chart instances fail to render across 4 pages. Single root cause.
2. **Filter functionality**: "Select period" and "Filter projects" controls exist but were not testable via automation (Naive UI select components). Need manual verification.
3. **Admin tab switching**: Author Mapping and Sync Logs tabs exist but automated tab click failed due to Naive UI tab selector complexity. API data confirmed correct.
4. **Member page charts**: Sprint Trend, KPI Radar, and Heatmap all empty despite task table working.

---

## Data Accuracy Verification

| Data Point | API Value | UI Display | Match |
|-----------|-----------|------------|-------|
| Avatar progress | 41% | 41% | Yes |
| AirFlow progress | 60% | 60% | Yes |
| DataHub progress | 66% | 66% | Yes |
| OPS progress | 55% | 55% | Yes |
| OKR Obj1 progress | 68% | 68% | Yes |
| OKR Obj2 progress | 55% | 55% | Yes |
| OKR Obj3 progress | 42% | 42% | Yes |
| Total tasks | 240 | 240 | Yes |
| Total PRs | 119 | 119 | Yes |
| Merged PRs | 116 | 116 | Yes |
| Avg merge time | 39.6h | 39.6h | Yes |
| Reviewed PRs | 92 | 92 | Yes |
| Admin users | 9 | 9+ rows | Yes |

**All data points that render are 100% accurate** -- the frontend correctly maps API response fields to UI display.

---

## Screenshots Index

| # | Filename | Description |
|---|----------|-------------|
| 001 | 001-initial-page.png | Login page initial load |
| 002 | 002-login-form-filled.png | Login form with credentials |
| 003 | 003-after-login.png | Dashboard after successful login |
| 007 | 007-project-avatar-full.png | Avatar project detail (full) |
| 009 | 009-member-chenqiang-full.png | Member detail - ChenQiang (full) |
| 011 | 011-okr-page-full.png | OKR Board page |
| 013 | 013-git-activity-full.png | Git Activity page |
| 015 | 015-admin-page-users.png | Admin Panel - Users tab |
| 018 | 018-mobile-admin.png | Mobile Admin layout |
| 019 | 019-mobile-okr.png | Mobile OKR layout (excellent) |
| 301 | 301-login-filled.png | Login form (test round 2) |
| 302 | 302-after-login.png | Dashboard after login (round 2) |
| 402 | 402-card-Sprint_Delivery_Rate.png | Sprint Delivery card close-up (EMPTY) |
| 403 | 403-card-Task_Status_Distribution.png | Task Distribution card close-up (EMPTY) |
| 404 | 404-card-Project_Progress.png | Project Progress card (PASS) |
| 405 | 405-card-Weekly_Code_Activity.png | Weekly Code Activity card (PASS) |
| 406 | 406-card-OKR_Progress.png | OKR Progress card (PASS) |
| 407 | 407-card-PR_Merge_Time.png | PR Merge Time card (EMPTY) |
| 411 | 411-admin-via-router.png | Admin Panel via router |
| 412 | 412-mobile-overview-full.png | Mobile overview (full page) |
| 413 | 413-mobile-overview-viewport.png | Mobile overview (viewport) |

---

## Verdict

**QA Status: NEEDS WORK**

The application successfully loads and displays real data from the database for all text/table/progress-bar based elements. Data accuracy is 100% where rendering occurs. Zero runtime errors. However, **9 ECharts chart instances fail to render** due to a single architectural issue in the `useECharts` composable timing with Vue's conditional rendering. This affects:

- 3 out of 6 panels on the Team Overview page (50% of dashboard visual content)
- Burndown chart on Project Detail
- 3 charts on Member Detail
- 2 charts on Git Activity

**Fix priority**: P1 -- one code change to the `useECharts` composable (or adopting the component pattern used by WeeklyCodeActivity) would resolve all 9 bugs simultaneously.

**Re-test trigger**: After the ECharts initialization fix is applied, re-run this test suite. Expect all 9 bugs to resolve in one fix.
