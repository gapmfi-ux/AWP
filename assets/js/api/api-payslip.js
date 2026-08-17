/**
 * api-payslip.js
 * Client wrappers for payslip-related server actions
 *
 * Uses:
 *  - API.post for long operations (generate/save/send)
 *  - API.request (JSONP) for small retrievals
 */

if (!window.API) throw new Error('API core must be loaded first');

API.generatePayslipsForPeriod = async function(period, options = {}) {
  if (!period) throw new Error('period required');
  // send as formData for the server doPost logic
  return await API.post('generatePayslipsForPeriod', { period: String(period) }, { timeout: options.timeout || 180000 });
};

API.getPayslipFileRecord = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) throw new Error('staffNumber and period required');
  return await API.request('getPayslipFileRecord', { staffNumber: String(staffNumber), period: String(period) }, options);
};

// Server-side send using saved Drive file
API.sendPayslipUsingFile = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) throw new Error('staffNumber and period required');
  return await API.post('sendPayslipUsingFile', { staffNumber: String(staffNumber), period: String(period), options: options || {} }, { timeout: options.timeout || 120000 });
};

// Reuse existing endpoints
API.getPayslipData = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) throw new Error('staffNumber and period required');
  return await API.request('getPayslipData', { staffNumber: String(staffNumber), period: String(period) }, options);
};

API.generatePayslipPDF = async function(params, options = {}) {
  // params: { staffNumber, period, htmlContent }
  // Use JSONP request for compatibility or post if it might be large
  // We'll use POST when htmlContent is present to avoid URL length issues
  if (params && params.htmlContent) {
    return await API.post('generatePayslipPDF', params, { timeout: options.timeout || 90000 });
  } else {
    return await API.request('generatePayslipPDF', params || {}, { timeout: options.timeout || 90000 });
  }
};

// Payroll runs helper (to load employee list)
API.getPayrollRunsByPeriod = async function(period, options = {}) {
  if (!period) throw new Error('period required');
  return await API.request('getPayrollRunsByPeriod', { period: String(period) }, options);
};

console.log('[API-Payslip] wrappers initialized');
