/**
 * Home page (P01) logic - Ranking tables, tabs, search, pagination, update.
 */
(function() {
  'use strict';

  // State
  let currentTab = 'comprehensive';
  let currentPage = 1;
  let currentSearch = '';
  let totalItems = 0;
  let totalPages = 1;
  const PAGE_SIZE = 50;
  let tabSwitchLock = false;
  let searchTimer = null;

  // DOM elements
  const tabButtons = document.querySelectorAll('.tab-item');
  const tableBody = document.getElementById('tableBody');
  const tableHead = document.getElementById('tableHead');
  const tableWrapper = document.getElementById('tableWrapper');
  const emptyState = document.getElementById('emptyState');
  const skeletonArea = document.getElementById('skeletonArea');
  const paginationArea = document.getElementById('paginationArea');
  const resultCount = document.getElementById('resultCount');
  const searchInput = document.getElementById('searchInput');
  const updateBtn = document.getElementById('updateBtn');
  const updateBtnText = document.getElementById('updateBtnText');
  const updateTime = document.getElementById('updateTime');
  const errorToast = document.getElementById('errorToast');

  // Stat card elements
  const statTotalStocks = document.getElementById('statTotalStocks');
  const statAvgYield = document.getElementById('statAvgYield');
  const statMaxYears = document.getElementById('statMaxYears');
  const statMaxStock = document.getElementById('statMaxStock');

  // Table column configurations per tab
  const TAB_COLUMNS = {
    comprehensive: [
      { key: 'rank', label: '排名', align: 'center', width: '60px' },
      { key: 'code', label: '股票代码', align: 'left', width: '100px', mono: true },
      { key: 'name', label: '股票名称', align: 'left', width: '120px', link: true },
      { key: 'industry', label: '所属行业', align: 'left', width: '100px', badge: true },
      { key: 'score', label: '综合评分', align: 'left', width: '140px', scoreBar: true },
      { key: 'consecutive_years', label: '连续分红年数', align: 'right', width: '100px', suffix: '年' },
      { key: 'dividend_yield', label: '最近年度股息率', align: 'right', width: '120px', suffix: '%', decimal: 2 },
      { key: 'avg_yield_3y', label: '近3年平均股息率', align: 'right', width: '130px', suffix: '%', decimal: 2 },
    ],
    stable: [
      { key: 'rank', label: '排名', align: 'center', width: '60px' },
      { key: 'code', label: '股票代码', align: 'left', width: '100px', mono: true },
      { key: 'name', label: '股票名称', align: 'left', width: '120px', link: true },
      { key: 'industry', label: '所属行业', align: 'left', width: '100px', badge: true },
      { key: 'consecutive_years', label: '连续分红年数', align: 'right', width: '120px', suffix: '年' },
      { key: 'dividend_yield', label: '最近年度股息率', align: 'right', width: '120px', suffix: '%', decimal: 2 },
      { key: 'dps', label: '最近年度每股分红', align: 'right', width: '130px', suffix: '元', decimal: 2 },
    ],
    highest: [
      { key: 'rank', label: '排名', align: 'center', width: '60px' },
      { key: 'code', label: '股票代码', align: 'left', width: '100px', mono: true },
      { key: 'name', label: '股票名称', align: 'left', width: '120px', link: true },
      { key: 'industry', label: '所属行业', align: 'left', width: '100px', badge: true },
      { key: 'dividend_yield', label: '最近年度股息率', align: 'right', width: '120px', suffix: '%', decimal: 2 },
      { key: 'avg_yield_3y', label: '近3年平均股息率', align: 'right', width: '130px', suffix: '%', decimal: 2 },
      { key: 'dps', label: '最近年度每股分红', align: 'right', width: '130px', suffix: '元', decimal: 2 },
      { key: 'total_dividend', label: '累计分红总额(亿元)', align: 'right', width: '130px', decimal: 2 },
    ],
  };

  // Hash to tab mapping
  const HASH_TAB_MAP = {
    '#comprehensive': 'comprehensive',
    '#stable': 'stable',
    '#highest': 'highest',
  };

  // ===== INITIALIZATION =====

  function init() {
    // Determine initial tab from URL hash
    const hash = window.location.hash;
    if (HASH_TAB_MAP[hash]) {
      currentTab = HASH_TAB_MAP[hash];
    }

    bindEvents();
    loadStats();
    loadRanking();
    updateTabUI();
    restoreUpdateTime();
  }

  function bindEvents() {
    // Tab clicks
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Tab keyboard navigation
    const tabList = document.querySelector('[role="tablist"]');
    if (tabList) {
      tabList.addEventListener('keydown', handleTabKeyboard);
    }

    // Search
    if (searchInput) {
      searchInput.addEventListener('input', handleSearchInput);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          currentSearch = '';
          currentPage = 1;
          loadRanking();
        }
      });
    }

    // Update button
    if (updateBtn) {
      updateBtn.addEventListener('click', handleUpdate);
    }

    // Hash change
    window.addEventListener('hashchange', () => {
      const tab = HASH_TAB_MAP[window.location.hash];
      if (tab && tab !== currentTab) {
        switchTab(tab);
      }
    });
  }

  // ===== TAB SWITCHING =====

  function switchTab(tab) {
    if (tabSwitchLock || tab === currentTab) return;

    tabSwitchLock = true;
    setTimeout(() => { tabSwitchLock = false; }, 300);

    currentTab = tab;
    currentPage = 1;
    currentSearch = '';
    if (searchInput) searchInput.value = '';

    window.location.hash = tab;
    updateTabUI();
    loadRanking();
  }

  function updateTabUI() {
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === currentTab;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
  }

  function handleTabKeyboard(e) {
    const tabs = Array.from(tabButtons);
    const currentIdx = tabs.findIndex(t => t.dataset.tab === currentTab);
    let targetIdx = currentIdx;

    if (e.key === 'ArrowLeft') {
      targetIdx = currentIdx > 0 ? currentIdx - 1 : tabs.length - 1;
    } else if (e.key === 'ArrowRight') {
      targetIdx = currentIdx < tabs.length - 1 ? currentIdx + 1 : 0;
    } else if (e.key === 'Home') {
      targetIdx = 0;
    } else if (e.key === 'End') {
      targetIdx = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabs[targetIdx].focus();
    if (e.key === 'Enter' || e.key === ' ') {
      switchTab(tabs[targetIdx].dataset.tab);
    }
  }

  // ===== DATA LOADING =====

  async function loadStats() {
    try {
      const stats = await API.fetchStats();
      if (stats.total_stocks > 0) {
        renderStats(stats);
      } else {
        renderEmptyStats();
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
      renderEmptyStats();
    }
  }

  async function loadRanking() {
    showSkeleton();

    try {
      const data = await API.fetchRanking(currentTab, currentPage, PAGE_SIZE, currentSearch);
      totalItems = data.total;
      totalPages = data.total_pages;

      if (data.items.length === 0 && !currentSearch) {
        showEmpty();
      } else if (data.items.length === 0 && currentSearch) {
        showSearchEmpty();
      } else {
        renderTable(data.items);
        renderPagination();
        showTable();
      }

      if (resultCount) {
        resultCount.textContent = currentSearch
          ? `找到 ${totalItems} 条结果`
          : `共 ${totalItems} 条`;
      }
    } catch (err) {
      console.error('Failed to load ranking:', err);
      showEmpty();
    }
  }

  // ===== RENDERING =====

  function renderStats(stats) {
    const cards = document.querySelectorAll('.stat-card');

    if (statTotalStocks) statTotalStocks.textContent = stats.total_stocks.toLocaleString();
    if (statAvgYield) statAvgYield.textContent = stats.avg_dividend_yield.toFixed(2) + '%';
    if (statMaxYears) statMaxYears.textContent = stats.max_consecutive_years;
    if (statMaxStock) statMaxStock.textContent = stats.max_consecutive_stock;

    // Animate cards in
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('loaded'), i * 100);
    });
  }

  function renderEmptyStats() {
    if (statTotalStocks) statTotalStocks.textContent = '--';
    if (statAvgYield) statAvgYield.textContent = '--';
    if (statMaxYears) statMaxYears.textContent = '--';
    if (statMaxStock) statMaxStock.textContent = '';

    document.querySelectorAll('.stat-card').forEach(card => card.classList.add('loaded'));
  }

  function renderTable(items) {
    const columns = TAB_COLUMNS[currentTab];

    // Render table head
    if (tableHead) {
      tableHead.innerHTML = '<tr>' + columns.map(col => {
        const alignClass = col.align === 'right' ? ' class="text-right"' : col.align === 'center' ? ' class="text-center"' : '';
        return `<th scope="col"${alignClass} style="width:${col.width}">${col.label}</th>`;
      }).join('') + '</tr>';
    }

    // Render table body
    if (tableBody) {
      tableBody.innerHTML = items.map(item => {
        return '<tr>' + columns.map(col => renderCell(item, col)).join('') + '</tr>';
      }).join('');
    }
  }

  function renderCell(item, col) {
    const value = item[col.key];

    // Rank badge
    if (col.key === 'rank') {
      const rankClass = value <= 3 ? `rank-${value}` : 'rank-default';
      return `<td class="text-center"><span class="rank-badge ${rankClass}">${value}</span></td>`;
    }

    // Stock code (monospace)
    if (col.mono) {
      return `<td class="text-mono">${value || '--'}</td>`;
    }

    // Stock name (link to detail)
    if (col.link) {
      return `<td><a href="/detail.html?code=${item.code}" class="stock-link" target="_blank">${value || '--'}</a></td>`;
    }

    // Industry badge
    if (col.badge) {
      return value ? `<td><span class="industry-badge">${value}</span></td>` : '<td>--</td>';
    }

    // Score bar
    if (col.scoreBar) {
      const score = value || 0;
      const color = score >= 80 ? 'var(--color-accent)' : score >= 60 ? 'var(--color-primary)' : 'var(--color-secondary-light)';
      return `<td>
        <div class="score-bar">
          <span class="score-value">${score.toFixed(1)}</span>
          <div class="score-bar-bg"><div class="score-bar-fill" style="width:${score}%;background:${color}"></div></div>
        </div>
      </td>`;
    }

    // Numeric values
    if (col.align === 'right') {
      if (value === null || value === undefined) return '<td class="text-right">--</td>';
      const formatted = col.decimal !== undefined ? Number(value).toFixed(col.decimal) : value;
      const suffix = col.suffix || '';
      return `<td class="text-right">${formatted}${suffix}</td>`;
    }

    return `<td>${value !== null && value !== undefined ? value : '--'}</td>`;
  }

  function renderPagination() {
    if (!paginationArea) return;

    if (totalPages <= 1) {
      paginationArea.innerHTML = `<div class="pagination"><span class="pagination-info">共 ${totalItems} 条</span></div>`;
      return;
    }

    let html = '<div class="pagination">';
    html += `<span class="pagination-info">共 ${totalItems} 条</span>`;

    // Previous button
    html += `<button class="page-btn" onclick="homePage.goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>`;

    // Page numbers
    const pages = getPageNumbers(currentPage, totalPages, 5);
    pages.forEach(p => {
      if (p === '...') {
        html += '<span class="page-ellipsis">...</span>';
      } else {
        html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="homePage.goToPage(${p})">${p}</button>`;
      }
    });

    // Next button
    html += `<button class="page-btn" onclick="homePage.goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>`;
    html += '</div>';

    paginationArea.innerHTML = html;
  }

  function getPageNumbers(current, total, maxVisible) {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [];
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total) {
      if (end < total - 1) pages.push('...');
      pages.push(total);
    }

    return pages;
  }

  // ===== VISIBILITY HELPERS =====

  function showSkeleton() {
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (paginationArea) paginationArea.innerHTML = '';
    if (skeletonArea) skeletonArea.style.display = 'block';
  }

  function showTable() {
    if (skeletonArea) skeletonArea.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (tableWrapper) {
      tableWrapper.style.display = 'block';
      tableWrapper.style.opacity = '0';
      requestAnimationFrame(() => { tableWrapper.style.opacity = '1'; });
    }
  }

  function showEmpty() {
    if (skeletonArea) skeletonArea.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (paginationArea) paginationArea.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <svg viewBox="0 0 120 120" fill="none">
          <rect x="20" y="30" width="80" height="60" rx="4" stroke="currentColor" stroke-width="2"/>
          <line x1="20" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="2"/>
          <line x1="50" y1="50" x2="50" y2="90" stroke="currentColor" stroke-width="1" opacity="0.5"/>
        </svg>
        <h3>暂无数据</h3>
        <p>请点击"更新数据"获取最新排行</p>
      `;
    }
    // Pulse the update button
    if (updateBtn) updateBtn.classList.add('btn-pulse');
  }

  function showSearchEmpty() {
    if (skeletonArea) skeletonArea.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (paginationArea) paginationArea.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="50" cy="50" r="30" stroke="currentColor" stroke-width="2"/>
          <line x1="72" y1="72" x2="100" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <h3>未找到匹配的股票</h3>
        <p>请尝试其他关键词</p>
      `;
    }
  }

  // ===== SEARCH =====

  function handleSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      loadRanking();
    }, 300);
  }

  // ===== UPDATE =====

  async function handleUpdate() {
    // Check cooldown
    const lastUpdate = localStorage.getItem('lastUpdateTime');
    if (lastUpdate) {
      const elapsed = (Date.now() - parseInt(lastUpdate)) / 1000;
      if (elapsed < 300) {
        const remaining = Math.ceil(300 - elapsed);
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        showError(`${min}分${sec}秒后可更新`);
        return;
      }
    }

    // Set loading state
    updateBtn.disabled = true;
    updateBtn.classList.remove('btn-pulse');
    updateBtnText.textContent = '更新中...';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    updateBtn.insertBefore(spinner, updateBtnText);

    try {
      const result = await API.triggerUpdate();

      // Success
      localStorage.setItem('lastUpdateTime', String(Date.now()));
      if (updateTime) {
        updateTime.textContent = `更新于 ${result.updated_at}`;
      }

      // Reload data
      loadStats();
      loadRanking();
    } catch (err) {
      showError(err.message || '数据更新失败，请稍后重试');
    } finally {
      updateBtn.disabled = false;
      updateBtnText.textContent = '更新数据';
      const sp = updateBtn.querySelector('.spinner');
      if (sp) sp.remove();
    }
  }

  function restoreUpdateTime() {
    const lastUpdate = localStorage.getItem('lastUpdateTime');
    if (lastUpdate && updateTime) {
      const date = new Date(parseInt(lastUpdate));
      const formatted = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');
      updateTime.textContent = `更新于 ${formatted}`;
    }

    // Check cooldown for button state
    if (lastUpdate) {
      const elapsed = (Date.now() - parseInt(lastUpdate)) / 1000;
      if (elapsed < 300 && updateBtn) {
        startCooldownTimer(300 - elapsed);
      }
    }
  }

  function startCooldownTimer(remainingSeconds) {
    updateBtn.disabled = true;
    const interval = setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        clearInterval(interval);
        updateBtn.disabled = false;
        updateBtnText.textContent = '更新数据';
        return;
      }
      const min = Math.floor(remainingSeconds / 60);
      const sec = Math.floor(remainingSeconds % 60);
      updateBtnText.textContent = `${min}分${sec}秒后可更新`;
    }, 1000);
  }

  // ===== ERROR TOAST =====

  function showError(message) {
    if (!errorToast) return;
    errorToast.textContent = message;
    errorToast.classList.add('show');
    setTimeout(() => {
      errorToast.classList.remove('show');
    }, 5000);
  }

  // ===== PUBLIC API =====

  window.homePage = {
    goToPage(page) {
      if (page < 1 || page > totalPages || page === currentPage) return;
      currentPage = page;
      loadRanking();
      // Scroll table to top
      if (tableWrapper) tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
