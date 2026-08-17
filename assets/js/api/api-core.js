/**
 * API Core Service
 * Handles all API requests to the Google Apps Script backend
 *
 * NOTE:
 * - request(action,data) uses JSONP (existing) and remains unchanged.
 * - Added post(action,data,options) to POST to the webapp for long-running ops.
 */

class ApiService {
  constructor() {
    // UPDATE THIS with your Google Apps Script Web App URL (deploy -> web app)
    this.BASE_URL = 'https://script.google.com/macros/s/AKfycbyh-69v4qQbQYFJp6ZeHmnr_vOLuzBgRYjf0F2YeWa0W3k2RC_OMeCnT9V-Wq6Yu5G3/exec';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.pendingRequests = new Map(); // dedupe
    this.debug = true;
    this.requestTimeout = 60000;
  }

  log(...args) { if (this.debug) console.log('[API]', ...args); }
  error(...args) { console.error('[API]', ...args); }

  /**
   * JSONP-style request (keeps original behavior)
   */
  async request(action, data = {}, options = {}) {
    const cacheKey = `${action}_${JSON.stringify(data)}`;
    const useCache = options.useCache !== false;

    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.log(`Cache hit for ${action}`);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    if (this.pendingRequests.has(cacheKey)) {
      this.log(`Deduplicating request for ${action}`);
      return this.pendingRequests.get(cacheKey);
    }

    const promise = new Promise((resolve, reject) => {
      try {
        const callbackName = 'api_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2,9);
        const url = new URL(this.BASE_URL);
        url.searchParams.append('action', action);
        url.searchParams.append('data', JSON.stringify(data));
        url.searchParams.append('callback', callbackName);

        const timeoutDuration = (options.timeout || (action === 'generatePayslipPDF' ? 90000 : 30000));
        const timeoutId = setTimeout(() => {
          if (window[callbackName]) {
            delete window[callbackName];
            this.error(`Request timeout for ${action}`);
            reject(new Error(`Request timeout after ${timeoutDuration/1000}s`));
          }
        }, timeoutDuration);

        window[callbackName] = (response) => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch(e) {}
          this.log(`Response for ${action}:`, response);
          if (typeof response === 'string') {
            this.error('Response is string, expected JSON');
            reject(new Error('Server returned HTML instead of JSON'));
            return;
          }
          if (response && response.success !== false) {
            this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
            resolve(response);
          } else {
            const err = (response && response.error) || 'API request failed';
            this.error(err);
            reject(new Error(err));
          }
        };

        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          if (script.parentNode) try { script.parentNode.removeChild(script); } catch(e) {}
          this.error(`Script error for ${action}`);
          reject(new Error('Script error - server may be down or returned invalid response'));
        };
        document.head.appendChild(script);
        this.log(`JSONP script added for ${action}`);
      } catch (err) {
        this.error('request error', err);
        reject(err);
      }
    });

    this.pendingRequests.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * POST to webapp endpoint (supports form-encoded body)
   * Sends: action + formData (stringified JSON) as application/x-www-form-urlencoded
   * Server doPost handles parameters and returns JSON with CORS headers.
   */
  async post(action, data = {}, options = {}) {
    const url = this.BASE_URL;
    const bodyParams = new URLSearchParams();
    bodyParams.append('action', action);
    // many server handlers expect formData JSON - use that for consistency
    bodyParams.append('formData', typeof data === 'string' ? data : JSON.stringify(data));

    const timeout = options.timeout || 120000; // default 2 minutes for heavy ops
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    this.log(`POST ${action}`, data);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: bodyParams.toString(),
        signal: controller.signal,
        credentials: 'same-origin' // include cookies if any
      });
      clearTimeout(id);
      if (!resp.ok) {
        const text = await resp.text().catch(()=>'<no body>');
        this.error(`POST ${action} HTTP ${resp.status}`, text);
        throw new Error(`HTTP ${resp.status} - ${text}`);
      }
      const json = await resp.json();
      if (json && json.success === false) {
        throw new Error(json.error || 'Server returned error');
      }
      // Optionally cache small results
      return json;
    } catch (err) {
      clearTimeout(id);
      this.error('POST error for', action, err);
      throw err;
    }
  }

  /**
   * Batch request helper (unchanged)
   */
  async batchRequest(requests) {
    const results = {};
    const promises = [];
    for (const [key, { action, data }] of Object.entries(requests)) {
      promises.push(
        this.request(action, data, { showLoading: false })
          .then(result => { results[key] = result; })
          .catch(err => { results[key] = { error: err.message }; })
      );
    }
    await Promise.all(promises);
    return results;
  }

  clearCache(action = null) {
    if (action) {
      const keys = [];
      for (const k of this.cache.keys()) if (k.startsWith(action)) keys.push(k);
      keys.forEach(k => this.cache.delete(k));
      this.log(`Cleared cache for ${action}`);
    } else {
      this.cache.clear();
      this.log('Cleared all cache');
    }
  }

  async testConnection(options={}) {
    try {
      const response = await this.request('test', {}, options);
      return { connected: response && response.success !== false, message: response && response.success !== false ? 'Connected' : 'Connection failed' };
    } catch (err) {
      return { connected: false, message: 'Connection failed: ' + err.message };
    }
  }
}

// singleton
window.API = new ApiService();
console.log('[API] initialized (debug=' + window.API.debug + ')');
