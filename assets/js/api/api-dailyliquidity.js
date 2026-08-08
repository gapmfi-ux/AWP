if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-dailyliquidity.js');
}

// DAILY LIQUIDITY API
API.uploadExcelToTrialBalance = async function(data, options = {}) {
  this.log('uploadExcelToTrialBalance called with:', data);
  return this.request('uploadExcelToTrialBalance', data, options);
};

API.importLiquidityFromTrialBalance = async function(weekEnding, options = {}) {
  this.log('importLiquidityFromTrialBalance called for week ending:', weekEnding);
  return this.request('importLiquidityFromTrialBalance', { weekEnding }, options);
};

API.saveLiquidityData = async function(data, options = {}) {
  this.log('saveLiquidityData called with:', data);
  return this.request('saveLiquidityData', data, options);
};

API.loadLiquidityData = async function(weekEnding, options = {}) {
  this.log('loadLiquidityData called for week ending:', weekEnding);
  return this.request('loadLiquidityData', { weekEnding }, options);
};

API.getAvailableWeekEndings = async function(options = {}) {
  this.log('getAvailableWeekEndings called');
  return this.request('getAvailableWeekEndings', {}, options);
};

API.deleteLiquidityData = async function(weekEnding, options = {}) {
  this.log('deleteLiquidityData called for week ending:', weekEnding);
  return this.request('deleteLiquidityData', { weekEnding }, options);
};
