class ApiService {
  constructor() {
    // UPDATE THIS with your Google Apps Script Web App URL
    this.BASE_URL = 'https://script.google.com/macros/s/AKfycbyh-69v4qQbQYFJp6ZeHmnr_vOLuzBgRYjf0F2YeWa0W3k2RC_OMeCnT9V-Wq6Yu5G3/exec';
    this.cache = new Map();
    this.debug = true; // Set to false in production
  }

  log(...args) {
    if (this.debug) {
      console.log('[API]', ...args);
    }
  }

  error(...args) {
    console.error('[API]', ...args);
  }

  // Generic request method (JSONP)
  async request(action, data = {}, options = {}) {
    const showLoading = options.showLoading !== false;
    
    return new Promise((resolve, reject) => {
      try {
        // Generate a unique callback name
        const callbackName = 'api_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Build the URL with parameters
        const url = new URL(this.BASE_URL);
        url.searchParams.append('action', action);
        url.searchParams.append('data', JSON.stringify(data));
        url.searchParams.append('callback', callbackName);
        
        const fullUrl = url.toString();
        this.log(`Requesting: ${action}`, data);
        this.log(`URL: ${fullUrl.substring(0, 300)}...`);
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          if (window[callbackName]) {
            delete window[callbackName];
            this.error(`Request timeout for ${action}`);
            reject(new Error('Request timeout after 30 seconds'));
          }
        }, 30000);
        
        // Create the callback function
        window[callbackName] = (response) => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          
          this.log(`Response for ${action}:`, response);
          
          if (response && response.success !== false) {
            const cacheKey = `${action}_${JSON.stringify(data)}`;
            this.cache.set(cacheKey, response);
            resolve(response);
          } else {
            reject(new Error((response && response.error) || 'API request failed'));
          }
        };
        
        // Create and add the script tag
        const script = document.createElement('script');
        script.src = fullUrl;
        script.onerror = () => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
          this.error(`Script error for ${action}`);
          reject(new Error('Network error - failed to connect to server'));
        };
        
        document.head.appendChild(script);
        this.log(`Script tag added for ${action}`);
        
      } catch (error) {
        this.error(`Request error for ${action}:`, error);
        reject(error);
      }
    });
  }

  // ============================================
  // USER API
  // ============================================
  
  async getUserInfo(options = {}) {
    return this.request('getUserInfo', {}, options);
  }

  // ============================================
  // PAYMENT VOUCHER API
  // ============================================
  
  async processForm(formData, options = {}) {
    this.log('processForm called with:', formData);
    return this.request('processForm', { formData: JSON.stringify(formData) }, options);
  }
  
  async getNextPVNumber(voucherType, options = {}) {
    return this.request('getNextPVNumber', { voucherType }, options);
  }
  
  async getPVNumbersByType(options = {}) {
    return this.request('getPVNumbersByType', {}, options);
  }
  
  async getVoucherByNumber(pvNumber, voucherType, options = {}) {
    return this.request('getVoucherByNumber', { pvNumber, voucherType }, options);
  }
  
  async updateVoucher(formData, options = {}) {
    return this.request('updateVoucher', { formData: JSON.stringify(formData) }, options);
  }

  // ============================================
  // INVENTORY API
  // ============================================
  
  async generateInventoryCategoryCode(options = {}) {
    return this.request('generateInventoryCategoryCode', {}, options);
  }
  
  async getInventoryCategories(options = {}) {
    return this.request('getInventoryCategories', {}, options);
  }
  
  async addNewInventory(formData, options = {}) {
    return this.request('addNewInventory', { formData: JSON.stringify(formData) }, options);
  }
  
  async getPurchaseReportData(fromDate, toDate, options = {}) {
    return this.request('getPurchaseReportData', { fromDate, toDate }, options);
  }
  
  async getUsageReportData(fromDate, toDate, options = {}) {
    return this.request('getUsageReportData', { fromDate, toDate }, options);
  }
  
  async getInventoryListData(options = {}) {
    return this.request('getInventoryListData', {}, options);
  }
  
  async recordInventoryUsage(formData, options = {}) {
    return this.request('recordInventoryUsage', { formData: JSON.stringify(formData) }, options);
  }
  
  async removeInventory(inventoryCode, options = {}) {
    return this.request('removeInventory', { inventoryCode }, options);
  }

  // ============================================
  // FIXED ASSETS API
  // ============================================
  
  async generateAssetCode(assetType, options = {}) {
    return this.request('generateAssetCode', { assetType }, options);
  }
  
  async addNewAsset(formData, options = {}) {
    return this.request('addNewAsset', { formData: JSON.stringify(formData) }, options);
  }
  
  async getDetailedRegister(options = {}) {
    return this.request('getDetailedRegister', {}, options);
  }
  
  async updateAssetStatus(assetName, newStatus, options = {}) {
    return this.request('updateAssetStatus', { assetName, newStatus }, options);
  }

  // ============================================
  // INVESTMENT API
  // ============================================
  
  async generateInvestmentCode(investmentType, options = {}) {
    return this.request('generateInvestmentCode', { investmentType }, options);
  }
  
  async addNewInvestment(formData, options = {}) {
    return this.request('addNewInvestment', { formData: JSON.stringify(formData) }, options);
  }
  
  async getInvestmentsByDateRange(fromDate, toDate, options = {}) {
    return this.request('getInvestmentsByDateRange', { fromDate, toDate }, options);
  }
  
  async getMaturedInvestments(toDate, options = {}) {
    return this.request('getMaturedInvestments', { toDate }, options);
  }
  
  // ============================================
  // TEST CONNECTION
  // ============================================
  
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
  
  clearCache(action = null) {
    if (action) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(action)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

// Create global API instance
window.API = new ApiService();

// For backward compatibility with modules still using callGAS
window.callGAS = async function(action, data = {}) {
  console.warn('callGAS is deprecated. Use API.[method] instead.');
  
  const actionMap = {
    'getUserInfo': () => API.getUserInfo(),
    'processForm': () => API.processForm(data),
    'getNextPVNumber': () => API.getNextPVNumber(data.voucherType),
    'getPVNumbersByType': () => API.getPVNumbersByType(),
    'getVoucherByNumber': () => API.getVoucherByNumber(data.pvNumber, data.voucherType),
    'updateVoucher': () => API.updateVoucher(data),
    'generateInventoryCategoryCode': () => API.generateInventoryCategoryCode(),
    'getInventoryCategories': () => API.getInventoryCategories(),
    'addNewInventory': () => API.addNewInventory(data),
    'getPurchaseReportData': () => API.getPurchaseReportData(data.fromDate, data.toDate),
    'getUsageReportData': () => API.getUsageReportData(data.fromDate, data.toDate),
    'getInventoryListData': () => API.getInventoryListData(),
    'recordInventoryUsage': () => API.recordInventoryUsage(data),
    'removeInventory': () => API.removeInventory(data.inventoryCode),
    'generateAssetCode': () => API.generateAssetCode(data.assetType),
    'addNewAsset': () => API.addNewAsset(data),
    'getDetailedRegister': () => API.getDetailedRegister(),
    'updateAssetStatus': () => API.updateAssetStatus(data.assetName, data.newStatus),
    'generateInvestmentCode': () => API.generateInvestmentCode(data.investmentType),
    'addNewInvestment': () => API.addNewInvestment(data),
    'getInvestmentsByDateRange': () => API.getInvestmentsByDateRange(data.fromDate, data.toDate),
    'getMaturedInvestments': () => API.getMaturedInvestments(data.toDate)
  };
  
  const apiCall = actionMap[action];
  if (apiCall) {
    return apiCall();
  }
  
  throw new Error(`Unknown action: ${action}`);
};
