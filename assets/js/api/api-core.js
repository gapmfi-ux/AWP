/**
 * API Core Service
 * Handles all API requests to the Google Apps Script backend
 */

class ApiService {
  constructor() {
    // UPDATE THIS with your Google Apps Script Web App URL
    this.BASE_URL = 'https://script.google.com/macros/s/AKfycbyh-69v4qQbQYFJp6ZeHmnr_vOLuzBgRYjf0F2YeWa0W3k2RC_OMeCnT9V-Wq6Yu5G3/exec';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.pendingRequests = new Map(); // Deduplicate concurrent requests
    this.debug = true; // Set to true for debugging
    this.requestTimeout = 60000; // 60 seconds timeout for PDF generation
  }

  log(...args) {
    if (this.debug) {
      console.log('[API]', ...args);
    }
  }

  error(...args) {
    console.error('[API]', ...args);
  }

  /**
   * Generic request method with caching and deduplication
   */
  async request(action, data = {}, options = {}) {
    const cacheKey = `${action}_${JSON.stringify(data)}`;
    const useCache = options.useCache !== false;
    
    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.log(`Cache hit for ${action}`);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(cacheKey)) {
      this.log(`Deduplicating request for ${action}`);
      return this.pendingRequests.get(cacheKey);
    }

    // Create the request promise
    const requestPromise = new Promise((resolve, reject) => {
      // Store references to avoid closure issues
      const _action = action;
      const _data = data;
      const _cacheKey = cacheKey;
      const _self = this;
      
      try {
        // Generate a unique callback name
        const callbackName = 'api_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Build URL with parameters
        const url = new URL(this.BASE_URL);
        url.searchParams.append('action', _action);
        url.searchParams.append('data', JSON.stringify(_data));
        url.searchParams.append('callback', callbackName);
        
        const fullUrl = url.toString();
        _self.log(`Requesting: ${_action}`, _data);
        
        // Set timeout (use longer timeout for PDF generation)
        const timeoutDuration = _action === 'generatePayslipPDF' ? 90000 : 30000;
        const timeoutId = setTimeout(() => {
          if (window[callbackName]) {
            delete window[callbackName];
            _self.error(`Request timeout for ${_action} (${timeoutDuration}ms)`);
            reject(new Error(`Request timeout after ${timeoutDuration/1000} seconds`));
          }
        }, timeoutDuration);
        
        // Create the callback function with better error handling
        window[callbackName] = function(response) {
          clearTimeout(timeoutId);
          delete window[callbackName];
          
          if (script && script.parentNode) {
            try { script.parentNode.removeChild(script); } catch(e) {}
          }
          
          _self.log(`Response for ${_action}:`, response);
          
          // Check if response is a string (might be HTML error page)
          if (typeof response === 'string') {
            _self.error(`Response is string, not JSON: ${response.substring(0, 200)}`);
            reject(new Error('Server returned HTML instead of JSON'));
            return;
          }
          
          // Check for success
          if (response && response.success !== false) {
            _self.cache.set(_cacheKey, {
              data: response,
              timestamp: Date.now()
            });
            resolve(response);
          } else {
            var errorMsg = (response && response.error) || 'API request failed';
            _self.error(`Request failed: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        };
        
        // Create and add the script tag
        const script = document.createElement('script');
        script.src = fullUrl;
        script.onerror = function() {
          clearTimeout(timeoutId);
          delete window[callbackName];
          if (script.parentNode) {
            try { script.parentNode.removeChild(script); } catch(e) {}
          }
          _self.error(`Script error for ${_action}`);
          reject(new Error(`Script error - server may be down or returned invalid response`));
        };
        
        // Add to head
        document.head.appendChild(script);
        _self.log(`Script tag added for ${_action}`);
        
      } catch (error) {
        _self.error(`Request error for ${_action}:`, error);
        reject(error);
      }
    });

    // Store the pending request
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Batch load multiple requests
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

  /**
   * Clear cache for specific action or all
   */
  clearCache(action = null) {
    if (action) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(action)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      this.log(`Cleared cache for action: ${action}`);
    } else {
      this.cache.clear();
      this.log('Cleared all cache');
    }
  }

  /**
   * Test connection to server
   */
  async testConnection(options = {}) {
    try {
      const response = await this.request('test', {}, options);
      return {
        connected: response && response.success !== false,
        message: response && response.success !== false ? 'Connected to server' : 'Connection failed'
      };
    } catch (error) {
      return {
        connected: false,
        message: 'Connection failed: ' + error.message
      };
    }
  }

  /**
   * Debug method to check employee email
   */
  async debugEmployeeEmail(staffNumber, options = {}) {
    if (!staffNumber) {
      throw new Error('Staff number is required');
    }
    return this.request('debugEmployeeEmail', { staffNumber: staffNumber }, options);
  }
}

// Create global API instance
window.API = new ApiService();

// Log that API is ready
console.log('[API] API Service initialized with debug mode:', window.API.debug);
