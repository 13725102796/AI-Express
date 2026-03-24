/**
 * Detail page (P02) logic - Stock detail with dividend history.
 */
(function() {
  'use strict';

  // DOM elements
  const contentArea = document.getElementById('contentArea');
  const skeletonArea = document.getElementById('skeletonArea');
  const notFoundArea = document.getElementById('notFoundArea');

  const breadcrumbName = document.getElementById('breadcrumbName');
  const stockCode = document.getElementById('stockCode');
  const stockName = document.getElementById('stockName');
  const stockIndustry = document.getElementById('stockIndustry');
  const scoreValue = document.getElementById('scoreValue');
  const scoreBar = document.getElementById('scoreBar');
  const scoreRank = document.getElementById('scoreRank');
  const metricYears = document.getElementById('metricYears');
  const metricYield = document.getElementById('metricYield');
  const metricAvgYield = document.getElementById('metricAvgYield');
  const metricTotal = document.getElementById('metricTotal');
  const historyBody = document.getElementById('historyBody');
  const chartContainer = document.getElementById('chartContainer');
  const stockHero = document.getElementById('stockHero');

  function init() {
    // Get stock code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code || code.length !== 6) {
      showNotFound();
      return;
    }

    loadStockDetail(code);
  }

  async function loadStockDetail(code) {
    showSkeleton();

    try {
      const stock = await API.fetchStockDetail(code);

      if (!stock) {
        showNotFound();
        return;
      }

      renderStock(stock);
      showContent();
    } catch (err) {
      console.error('Failed to load stock detail:', err);
      showNotFound();
    }
  }

  function renderStock(stock) {
    // Page title
    document.title = stock.name + ' - 分红股排行榜';

    // Breadcrumb
    if (breadcrumbName) breadcrumbName.textContent = stock.name;

    // Basic info
    if (stockCode) stockCode.textContent = stock.code;
    if (stockName) stockName.textContent = stock.name;
    if (stockIndustry) stockIndustry.textContent = stock.industry || '--';

    // Score
    if (scoreValue) scoreValue.textContent = stock.score.toFixed(1);
    if (scoreBar) scoreBar.style.width = stock.score + '%';
    if (scoreRank) scoreRank.textContent = '综合排名第 ' + stock.comprehensive_rank + ' 名';

    // Metrics
    if (metricYears) metricYears.textContent = stock.consecutive_years + ' 年';
    if (metricYield) metricYield.textContent = stock.dividend_yield.toFixed(2) + '%';
    if (metricAvgYield) metricAvgYield.textContent = stock.avg_yield_3y.toFixed(2) + '%';
    if (metricTotal) metricTotal.textContent = stock.total_dividend.toFixed(2);

    // History table
    renderHistory(stock.history);

    // Dividend bar chart
    renderChart(stock.history);

    // Price trend chart (async, loads after page renders)
    loadPriceChart(stock.code).catch(err => console.error('Price chart error:', err));
  }

  function renderHistory(history) {
    if (!historyBody || !history) return;

    historyBody.innerHTML = history.map(row => `
      <tr>
        <td>${row.year}</td>
        <td>${row.plan || '--'}</td>
        <td class="text-right">${row.dps.toFixed(2)}</td>
        <td class="text-right">${row.dividend_yield.toFixed(2)}</td>
        <td>${row.ex_date || '--'}</td>
        <td class="text-right">${row.total_amount ? row.total_amount.toFixed(2) : '--'}</td>
      </tr>
    `).join('');
  }

  function renderChart(history) {
    if (!chartContainer || !history || history.length === 0) return;

    const maxDps = Math.max(...history.map(h => h.dps));
    if (maxDps === 0) return;

    chartContainer.innerHTML = history.map(row => {
      const pct = Math.round((row.dps / maxDps) * 100);
      return `
        <div class="chart-bar-row">
          <span class="chart-year">${row.year}</span>
          <div class="chart-bar-bg">
            <div class="chart-bar-fill" style="width:${pct}%">
              ${pct > 20 ? `<span class="chart-bar-value">${row.dps.toFixed(2)}</span>` : ''}
            </div>
          </div>
          <span class="chart-amount">${row.dps.toFixed(2)}元</span>
        </div>
      `;
    }).join('');

    // Animate bars
    setTimeout(() => {
      chartContainer.querySelectorAll('.chart-bar-fill').forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        requestAnimationFrame(() => { bar.style.width = width; });
      });
    }, 100);
  }

  // ===== PRICE CHART =====

  async function loadPriceChart(code) {
    const container = document.getElementById('priceChartSection');
    if (!container) return;

    container.innerHTML = `
      <h3 class="section-title"><span class="section-bar"></span> 近期股价走势</h3>
      <div class="price-chart-toolbar">
        <button class="period-btn active" data-months="3">3个月</button>
        <button class="period-btn" data-months="6">6个月</button>
        <button class="period-btn" data-months="12">1年</button>
      </div>
      <div id="priceChartLoading" style="text-align:center;padding:40px;color:#999;">加载股价数据中...</div>
      <canvas id="priceCanvas" width="800" height="300" style="display:none;width:100%;"></canvas>
      <div id="priceChartInfo" class="price-chart-info" style="display:none;"></div>
    `;

    // Period switch buttons
    container.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fetchAndDrawPrice(code, parseInt(btn.dataset.months));
      });
    });

    fetchAndDrawPrice(code, 3);
  }

  async function fetchAndDrawPrice(code, months) {
    const loading = document.getElementById('priceChartLoading');
    const canvas = document.getElementById('priceCanvas');
    const info = document.getElementById('priceChartInfo');
    if (!canvas) return;

    if (loading) loading.style.display = 'block';
    canvas.style.display = 'none';
    if (info) info.style.display = 'none';

    try {
      const data = await API.fetchStockPrice(code, months);
      if (!data.prices || data.prices.length === 0) {
        if (loading) loading.textContent = '暂无股价数据';
        return;
      }

      if (loading) loading.style.display = 'none';
      canvas.style.display = 'block';
      if (info) info.style.display = 'flex';

      drawPriceChart(canvas, data.prices, info);
    } catch (err) {
      if (loading) loading.textContent = '股价数据加载失败';
      console.error('Price fetch error:', err);
    }
  }

  function drawPriceChart(canvas, prices, infoEl) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    canvas.style.height = '300px';
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = 300;
    const pad = { top: 20, right: 60, bottom: 40, left: 10 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const closes = prices.map(p => p.close);
    const minP = Math.min(...closes) * 0.995;
    const maxP = Math.max(...closes) * 1.005;
    const range = maxP - minP || 1;

    const latest = closes[closes.length - 1];
    const first = closes[0];
    const isUp = latest >= first;
    const lineColor = isUp ? '#E74C3C' : '#27AE60';
    const fillColor = isUp ? 'rgba(231,76,60,0.08)' : 'rgba(39,174,96,0.08)';

    ctx.clearRect(0, 0, W, H);

    // Grid lines and price labels
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#999';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      const val = maxP - (range / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), W - 5, y + 4);
    }

    // Date labels on x-axis
    ctx.textAlign = 'center';
    ctx.fillStyle = '#999';
    const labelCount = Math.min(6, prices.length);
    const step = Math.floor(prices.length / labelCount);
    for (let i = 0; i < prices.length; i += step) {
      const x = pad.left + (i / (prices.length - 1)) * chartW;
      const date = prices[i].date.slice(5); // MM-DD
      ctx.fillText(date, x, H - 10);
    }

    // Price line + fill
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = pad.left + (i / (prices.length - 1)) * chartW;
      const y = pad.top + ((maxP - p.close) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill area
    const lastX = pad.left + chartW;
    const baseY = pad.top + chartH;
    ctx.lineTo(lastX, baseY);
    ctx.lineTo(pad.left, baseY);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Info summary
    if (infoEl) {
      const change = latest - first;
      const changePct = ((change / first) * 100).toFixed(2);
      const high = Math.max(...closes).toFixed(2);
      const low = Math.min(...closes).toFixed(2);
      const color = change >= 0 ? '#E74C3C' : '#27AE60';
      const sign = change >= 0 ? '+' : '';

      infoEl.innerHTML = `
        <span>最新: <strong style="color:${color}">${latest.toFixed(2)}</strong></span>
        <span>涨跌: <strong style="color:${color}">${sign}${change.toFixed(2)} (${sign}${changePct}%)</strong></span>
        <span>最高: <strong>${high}</strong></span>
        <span>最低: <strong>${low}</strong></span>
      `;
    }
  }

  // ===== VISIBILITY =====

  function showSkeleton() {
    if (contentArea) contentArea.style.display = 'none';
    if (notFoundArea) notFoundArea.style.display = 'none';
    if (skeletonArea) skeletonArea.style.display = 'block';
  }

  function showContent() {
    if (skeletonArea) skeletonArea.style.display = 'none';
    if (notFoundArea) notFoundArea.style.display = 'none';
    if (contentArea) contentArea.style.display = 'block';

    // Animate hero in
    if (stockHero) {
      setTimeout(() => stockHero.classList.add('loaded'), 50);
    }
  }

  function showNotFound() {
    if (skeletonArea) skeletonArea.style.display = 'none';
    if (contentArea) contentArea.style.display = 'none';
    if (notFoundArea) notFoundArea.style.display = 'block';
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
