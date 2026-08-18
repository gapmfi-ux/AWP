if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-pv.js');
}

// PAYMENT VOUCHER API
API.processForm = async function(formData, options = {}) {
  this.log('processForm called with:', formData);
  return this.request('processForm', formData, options);
};

API.getNextPVNumber = async function(voucherType, options = {}) {
  return this.request('getNextPVNumber', { voucherType }, options);
};

API.getPVNumbersByType = async function(options = {}) {
  return this.request('getPVNumbersByType', {}, options);
};

API.getVoucherByNumber = async function(pvNumber, voucherType, options = {}) {
  return this.request('getVoucherByNumber', { pvNumber, voucherType }, options);
};

API.updateVoucher = async function(formData, options = {}) {
  this.log('updateVoucher called with:', formData);
  return this.request('updateVoucher', formData, options);
};
