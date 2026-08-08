if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-investment.js');
}

// INVESTMENT API 
API.generateInvestmentCode = async function(investmentType, options = {}) {
  return this.request('generateInvestmentCode', { investmentType }, options);
};

API.addNewInvestment = async function(formData, options = {}) {
  return this.request('addNewInvestment', formData, options);
};

API.getInvestmentsByDateRange = async function(fromDate, toDate, options = {}) {
  return this.request('getInvestmentsByDateRange', { fromDate, toDate }, options);
};

API.getMaturedInvestments = async function(toDate, options = {}) {
  return this.request('getMaturedInvestments', { toDate }, options);
};

API.getUniqueInvestmentTypes = async function(options = {}) {
  return this.request('getUniqueInvestmentTypes', {}, options);
};

API.getUniqueBanks = async function(options = {}) {
  return this.request('getUniqueBanks', {}, options);
};

API.getAllInvestments = async function(options = {}) {
  return this.request('getAllInvestments', {}, options);
};

API.getInvestmentByCode = async function(investmentCode, options = {}) {
  return this.request('getInvestmentByCode', { investmentCode }, options);
};

API.updateInvestmentRedeemDate = async function(investmentCode, redeemDate, options = {}) {
  return this.request('updateInvestmentRedeemDate', { investmentCode, redeemDate }, options);
};
