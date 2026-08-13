/**
 * API - Payslip Module
 * Follows same pattern as api-payroll.js
 */

if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-payslip.js');
}

// =============================================================
// PAYSLIP API FUNCTIONS
// =============================================================

/**
 * Send a payslip to a single employee
 * @param {string} staffNumber - Employee staff number
 * @param {string} period - Pay period (YYYY-MM)
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.sendPayslip = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  return this.request('sendPayslip', { staffNumber, period }, options);
};

/**
 * Send payslips to all employees for a period
 * @param {string} period - Pay period (YYYY-MM)
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.sendAllPayslips = async function(period, options = {}) {
  if (!period) {
    throw new Error('Period is required');
  }
  return this.request('sendAllPayslips', { period }, options);
};

/**
 * Get payslip data for a single employee
 * @param {string} staffNumber - Employee staff number
 * @param {string} period - Pay period (YYYY-MM)
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.getPayslipData = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  return this.request('getPayslipData', { staffNumber, period }, options);
};

/**
 * Generate payslip HTML for a single employee
 * @param {string} staffNumber - Employee staff number
 * @param {string} period - Pay period (YYYY-MM)
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.generatePayslipHTML = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  return this.request('generatePayslipHTML', { staffNumber, period }, options);
};

// =============================================================
// HELPER FUNCTIONS
// =============================================================

/**
 * Format currency for display
 * @param {number|string} amount
 * @returns {string}
 */
API.formatCurrency = function(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
