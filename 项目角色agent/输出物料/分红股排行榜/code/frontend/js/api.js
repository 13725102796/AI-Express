/**
 * API client for Stock Dividend Ranking backend.
 */
const API = {
  baseURL: '',

  /**
   * Fetch ranking data for a specific tab.
   * @param {string} tabType - 'comprehensive', 'stable', or 'highest'
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Items per page
   * @param {string} search - Optional search term
   * @returns {Promise<Object>} Ranking response
   */
  async fetchRanking(tabType, page = 1, pageSize = 50, search = '') {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (search && search.trim()) {
      params.set('search', search.trim());
    }
    const res = await fetch(`${this.baseURL}/api/ranking/${tabType}?${params}`);
    if (!res.ok) throw new Error(`Ranking API error: ${res.status}`);
    return res.json();
  },

  /**
   * Fetch stock detail with dividend history.
   * @param {string} code - 6-digit stock code
   * @returns {Promise<Object>} Stock detail
   */
  async fetchStockDetail(code) {
    const res = await fetch(`${this.baseURL}/api/stock/${code}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Stock API error: ${res.status}`);
    return res.json();
  },

  /**
   * Trigger data update.
   * @returns {Promise<Object>} Update result
   */
  async triggerUpdate() {
    const res = await fetch(`${this.baseURL}/api/update`, { method: 'POST' });
    if (res.status === 429) {
      const data = await res.json();
      throw new Error(data.detail || 'Update cooldown active');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Update failed');
    }
    return res.json();
  },

  /**
   * Fetch overall statistics.
   * @returns {Promise<Object>} Stats data
   */
  async fetchStats() {
    const res = await fetch(`${this.baseURL}/api/stats`);
    if (!res.ok) throw new Error(`Stats API error: ${res.status}`);
    return res.json();
  },

  /**
   * Fetch recent stock price history.
   * @param {string} code - 6-digit stock code
   * @param {number} months - Number of months (default 6)
   * @returns {Promise<Object>} Price data with dates and close prices
   */
  async fetchStockPrice(code, months = 6) {
    const res = await fetch(`${this.baseURL}/api/stock/${code}/price?months=${months}`);
    if (!res.ok) throw new Error(`Price API error: ${res.status}`);
    return res.json();
  }
};
