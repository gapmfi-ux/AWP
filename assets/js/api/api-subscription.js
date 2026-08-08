if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-subscription.js');
}

// SUBSCRIPTION API
API.getSubscriptionCategories = async function(options = {}) {
  this.log('Getting subscription categories');
  return this.request('getSubscriptionCategories', {}, options);
};

API.generateSubscriptionCategoryCode = async function(options = {}) {
  this.log('Generating subscription category code');
  return this.request('generateSubscriptionCategoryCode', {}, options);
};

API.getNextSubscriptionCode = async function(categoryCode, options = {}) {
  this.log('Getting next subscription code for:', categoryCode);
  return this.request('getNextSubscriptionCode', { categoryCode }, options);
};

API.addSubscription = async function(formData, options = {}) {
  this.log('Adding subscription:', formData);
  return this.request('addSubscription', formData, options);
};

API.getAllSubscriptions = async function(options = {}) {
  this.log('Getting all subscriptions');
  return this.request('getAllSubscriptions', {}, options);
};

API.updateSubscription = async function(formData, options = {}) {
  this.log('Updating subscription:', formData);
  return this.request('updateSubscription', formData, options);
};

API.deleteSubscription = async function(subscriptionCode, options = {}) {
  this.log('Deleting subscription:', subscriptionCode);
  return this.request('deleteSubscription', { subscriptionCode }, options);
};

API.getSubscriptionsByDateRange = async function(fromDate, toDate, options = {}) {
  this.log('Getting subscriptions by date range:', fromDate, toDate);
  return this.request('getSubscriptionsByDateRange', { fromDate, toDate }, options);
};

API.getExpiredSubscriptions = async function(asOfDate, options = {}) {
  this.log('Getting expired subscriptions as of:', asOfDate);
  return this.request('getExpiredSubscriptions', { asOfDate }, options);
};

API.renewSubscription = async function(subscriptionCode, newExpiryDate, newAnnualCost, options = {}) {
  this.log('Renewing subscription:', subscriptionCode, newExpiryDate, newAnnualCost);
  return this.request('renewSubscription', { 
    subscriptionCode, 
    newExpiryDate, 
    newAnnualCost 
  }, options);
};
