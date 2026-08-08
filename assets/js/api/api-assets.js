if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-assets.js');
}

// FIXED ASSETS API
API.generateAssetCode = async function(assetType, options = {}) {
  return this.request('generateAssetCode', { assetType }, options);
};

API.addNewAsset = async function(formData, options = {}) {
  return this.request('addNewAsset', formData, options);
};

API.getDetailedRegister = async function(options = {}) {
  return this.request('getDetailedRegister', {}, options);
};

API.updateAssetStatus = async function(assetName, newStatus, options = {}) {
  return this.request('updateAssetStatus', { assetName, newStatus }, options);
};

API.updateAllAccumulatedDepreciation = async function(asOfDate, options = {}) {
  this.log('updateAllAccumulatedDepreciation called for date:', asOfDate);
  return this.request('updateAllAccumulatedDepreciation', { asOfDate }, options);
};

API.getFixedAssetsSummaryReport = async function(toDate, options = {}) {
  this.log('getFixedAssetsSummaryReport called for date:', toDate);
  return this.request('getFixedAssetsSummaryReport', { toDate }, options);
};
