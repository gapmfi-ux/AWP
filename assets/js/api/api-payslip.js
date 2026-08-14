/**
 * API - Payslip Module (Fixed)
 */

if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-payslip.js');
}

// =============================================================
// PAYSLIP API FUNCTIONS
// =============================================================

/**
 * Send a payslip to a single employee
 */
API.sendPayslip = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  return this.request('sendPayslip', { 
    staffNumber: staffNumber, 
    period: period 
  }, options);
};

/**
 * Send payslips to all employees for a period
 */
API.sendAllPayslips = async function(period, options = {}) {
  if (!period) {
    throw new Error('Period is required');
  }
  return this.request('sendAllPayslips', { period: period }, options);
};

/**
 * Get payslip data for a single employee
 */
API.getPayslipData = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  return this.request('getPayslipData', { 
    staffNumber: staffNumber, 
    period: period 
  }, options);
};

/**
 * Generate payslip HTML
 */
API.generatePayslipHTML = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  return this.request('generatePayslipHTML', { 
    staffNumber: staffNumber, 
    period: period 
  }, options);
};

/**
 * Generate payslip PDF
 */
API.generatePayslipPDF = async function(params, options = {}) {
  var { staffNumber, period, htmlContent } = params || {};
  return this.request('generatePayslipPDF', {
    staffNumber: staffNumber,
    period: period,
    htmlContent: htmlContent
  }, options);
};

/**
 * Send payslip with PDF attachment
 */
API.sendPayslipWithAttachment = async function(params, options = {}) {
  var { staffNumber, period, subject, narration, pdfBase64, pdfName } = params || {};
  
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }

  return this.request('sendPayslipWithAttachment', {
    staffNumber: staffNumber,
    period: period,
    subject: subject,
    narration: narration,
    pdfBase64: pdfBase64,
    pdfName: pdfName
  }, options);
};

/**
 * Format currency helper
 */
API.formatCurrency = function(amount) {
  var num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
