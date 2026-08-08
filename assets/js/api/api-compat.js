if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-compat.js');
}

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
    'getNextInventoryCode': () => API.getNextInventoryCode(data.mainCode),
    'getInventoryCategories': () => API.getInventoryCategories(),
    'addNewInventory': () => API.addNewInventory(data),
    'getPurchaseReportData': () => API.getPurchaseReportData(data.fromDate, data.toDate),
    'getUsageReportData': () => API.getUsageReportData(data.fromDate, data.toDate),
    'getInventoryListData': () => API.getInventoryListData(data.asOfDate),
    'recordInventoryUsage': () => API.recordInventoryUsage(data),
    'removeInventory': () => API.removeInventory(data.inventoryCode),
    'generateAssetCode': () => API.generateAssetCode(data.assetType),
    'addNewAsset': () => API.addNewAsset(data),
    'getDetailedRegister': () => API.getDetailedRegister(),
    'updateAssetStatus': () => API.updateAssetStatus(data.assetName, data.newStatus),
    'updateAllAccumulatedDepreciation': () => API.updateAllAccumulatedDepreciation(data.asOfDate),
    'getFixedAssetsSummaryReport': () => API.getFixedAssetsSummaryReport(data.toDate),
    'generateInvestmentCode': () => API.generateInvestmentCode(data.investmentType),
    'addNewInvestment': () => API.addNewInvestment(data),
    'getInvestmentsByDateRange': () => API.getInvestmentsByDateRange(data.fromDate, data.toDate),
    'getMaturedInvestments': () => API.getMaturedInvestments(data.toDate),
    'getUniqueInvestmentTypes': () => API.getUniqueInvestmentTypes(),
    'getUniqueBanks': () => API.getUniqueBanks(),
    'getAllInvestments': () => API.getAllInvestments(),
    'generateSubscriptionCategoryCode': () => API.generateSubscriptionCategoryCode(),
    'getSubscriptionCategories': () => API.getSubscriptionCategories(),
    'getNextSubscriptionCode': () => API.getNextSubscriptionCode(data.categoryCode),
    'addSubscription': () => API.addSubscription(data),
    'getAllSubscriptions': () => API.getAllSubscriptions(),
    'updateSubscription': () => API.updateSubscription(data),
    'deleteSubscription': () => API.deleteSubscription(data.subscriptionCode),
    'getSubscriptionsByDateRange': () => API.getSubscriptionsByDateRange(data.fromDate, data.toDate),
    'getExpiredSubscriptions': () => API.getExpiredSubscriptions(data.asOfDate),
    'renewSubscription': () => API.renewSubscription(data.subscriptionCode, data.newExpiryDate, data.newAnnualCost),
    'loadLiquidityData': () => API.loadLiquidityData(data.weekEnding),
    'test': () => API.request('test', {})
  };
  
  const apiCall = actionMap[action];
  if (apiCall) {
    return apiCall();
  }
  
  throw new Error(`Unknown action: ${action}`);
};
