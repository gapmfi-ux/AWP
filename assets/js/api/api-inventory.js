if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-inventory.js');
}

// INVENTORY API
API.generateInventoryCategoryCode = async function(options = {}) {
  return this.request('generateInventoryCategoryCode', {}, options);
};

API.getNextInventoryCode = async function(mainCode, options = {}) {
  this.log('getNextInventoryCode called for:', mainCode);
  return this.request('getNextInventoryCode', { mainCode }, options);
};

API.getInventoryCategories = async function(options = {}) {
  return this.request('getInventoryCategories', {}, options);
};

API.addNewInventory = async function(formData, options = {}) {
  return this.request('addNewInventory', formData, options);
};

API.getPurchaseReportData = async function(fromDate, toDate, options = {}) {
  return this.request('getPurchaseReportData', { fromDate, toDate }, options);
};

API.getUsageReportData = async function(fromDate, toDate, options = {}) {
  return this.request('getUsageReportData', { fromDate, toDate }, options);
};

API.getInventoryListData = async function(asOfDate = '', options = {}) {
  return this.request('getInventoryListData', { asOfDate }, options);
};

API.recordInventoryUsage = async function(formData, options = {}) {
  return this.request('recordInventoryUsage', formData, options);
};

API.removeInventory = async function(inventoryCode, options = {}) {
  return this.request('removeInventory', { inventoryCode }, options);
};
