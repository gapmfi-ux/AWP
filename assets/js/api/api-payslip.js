

if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-payslip.js');
}

console.log('[API-Payslip] Initializing payslip API...');

// =============================================================
// PAYSLIP API FUNCTIONS
// =============================================================


API.sendPayslip = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  
  console.log('[API-Payslip] sendPayslip called:', { staffNumber, period });
  
  return this.request('sendPayslip', { 
    staffNumber: String(staffNumber), 
    period: String(period) 
  }, options);
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
  
  console.log('[API-Payslip] sendAllPayslips called:', { period });
  
  return this.request('sendAllPayslips', { period: String(period) }, options);
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
  
  console.log('[API-Payslip] getPayslipData called:', { staffNumber, period });
  
  return this.request('getPayslipData', { 
    staffNumber: String(staffNumber), 
    period: String(period) 
  }, options);
};

/**
 * Generate payslip HTML
 * @param {string} staffNumber - Employee staff number
 * @param {string} period - Pay period (YYYY-MM)
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.generatePayslipHTML = async function(staffNumber, period, options = {}) {
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  
  console.log('[API-Payslip] generatePayslipHTML called:', { staffNumber, period });
  
  return this.request('generatePayslipHTML', { 
    staffNumber: String(staffNumber), 
    period: String(period) 
  }, options);
};

/**
 * Generate payslip PDF from HTML content
 * @param {Object} params - Parameters
 * @param {string} params.staffNumber - Employee staff number
 * @param {string} params.period - Pay period (YYYY-MM)
 * @param {string} params.htmlContent - HTML content of the payslip
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.generatePayslipPDF = async function(params, options = {}) {
  console.log('[API-Payslip] generatePayslipPDF called with:', params);
  
  var { staffNumber, period, htmlContent } = params || {};
  
  if (!htmlContent) {
    throw new Error('htmlContent is required for PDF generation');
  }
  
  // Ensure all values are strings
  return this.request('generatePayslipPDF', {
    staffNumber: String(staffNumber || ''),
    period: String(period || ''),
    htmlContent: String(htmlContent)
  }, options);
};

/**
 * Send payslip with PDF attachment
 * @param {Object} params - Parameters
 * @param {string} params.staffNumber - Employee staff number
 * @param {string} params.period - Pay period (YYYY-MM)
 * @param {string} params.subject - Email subject
 * @param {string} params.narration - Email body/narration
 * @param {string} params.pdfBase64 - PDF file as base64 string
 * @param {string} params.pdfName - PDF file name
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.sendPayslipWithAttachment = async function(params, options = {}) {
  console.log('[API-Payslip] sendPayslipWithAttachment called with:', params);
  
  var { staffNumber, period, subject, narration, pdfBase64, pdfName } = params || {};
  
  if (!staffNumber || !period) {
    throw new Error('Staff number and period are required');
  }
  
  if (!pdfBase64) {
    throw new Error('PDF base64 data is required');
  }

  // Ensure all values are strings
  return this.request('sendPayslipWithAttachment', {
    staffNumber: String(staffNumber),
    period: String(period),
    subject: String(subject || 'Payslip - ' + period + ' - ' + staffNumber),
    narration: String(narration || ''),
    pdfBase64: String(pdfBase64),
    pdfName: String(pdfName || 'Payslip_' + staffNumber + '_' + period + '.pdf')
  }, options);
};

/**
 * Get employee email for debugging
 * @param {string} staffNumber - Employee staff number
 * @param {Object} options - Optional parameters
 * @returns {Promise}
 */
API.debugEmployeeEmail = async function(staffNumber, options = {}) {
  if (!staffNumber) {
    throw new Error('Staff number is required');
  }
  
  console.log('[API-Payslip] debugEmployeeEmail called:', { staffNumber });
  
  return this.request('debugEmployeeEmail', { staffNumber: String(staffNumber) }, options);
};

/**
 * Format currency helper
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted currency string
 */
API.formatCurrency = function(amount) {
  var num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Log that API-Payslip is ready
console.log('[API-Payslip] Payslip API initialized successfully');
