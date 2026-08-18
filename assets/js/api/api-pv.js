
if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-pv.js');
}

// PAYMENT VOUCHER API
API.processForm = async function(formData, options = {}) {
  this.log('processForm called with:', formData);
  return this.request('processForm', formData, options);
};

API.getNextPVNumber = async function(voucherType, options = {}) {
  this.log('getNextPVNumber called with voucherType:', voucherType);
  
  try {
    const response = await this.request('getNextPVNumber', { voucherType }, options);
    
    // Handle various response formats
    if (typeof response === 'string') {
      // If it's a raw string (like "PVNO.FT97318"), return it directly
      return response;
    }
    
    // If it's an object with result or pvNumber field
    if (response && typeof response === 'object') {
      if (response.result) {
        return response.result;
      }
      if (response.pvNumber) {
        return response.pvNumber;
      }
    }
    
    // If none of the above, return the response as-is (might be an object with success)
    return response;
    
  } catch (error) {
    this.error('Failed to get next PV number:', error);
    // Return a fallback PV number
    const prefixes = {
      'Payment Voucher': 'PVNO.FT',
      'Cash Payment Voucher': 'PVNO.CH',
      'Cheque Payment Voucher': 'PVNO.CQ',
      'Direct Credit Payment Voucher': 'PVNO.DC',
      'Staff Medical Payment Voucher': 'PVNO.SM'
    };
    const prefix = prefixes[voucherType] || 'PVNO';
    const timestamp = Date.now().toString().slice(-5);
    const fallback = prefix + timestamp.padStart(5, '0');
    console.warn('Using fallback PV number:', fallback);
    return fallback;
  }
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
