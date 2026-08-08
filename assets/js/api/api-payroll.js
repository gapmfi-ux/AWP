/**
 * API - Payroll, Allowance & Employee wrapper
 * Requires api-core.js loaded first (window.API)
 *
 * Place this file at assets/js/api/api-payroll.js and load it after api-core.js in index.html.
 */

if (!window.API || typeof window.API.request !== 'function') {
  throw new Error('API core (api-core.js) must be loaded before api-payroll.js');
}

// PAYROLL endpoints
API.processPayrollRun = async function(period, options = {}) {
  return this.request('processPayrollRun', { period }, options);
};

API.getPayrollRunsByPeriod = async function(period, options = {}) {
  return this.request('getPayrollRunsByPeriod', { period }, options);
};

API.getPayrollRunsByStaff = async function(staffNumber, options = {}) {
  return this.request('getPayrollRunsByStaff', { staffNumber }, options);
};

API.getPayrollRunsByRunId = async function(runId, options = {}) {
  return this.request('getPayrollRunsByRunId', { runId }, options);
};

API.getPayrollRunSummary = async function(period, options = {}) {
  return this.request('getPayrollRunSummary', { period }, options);
};

API.getAllPayPeriods = async function(options = {}) {
  return this.request('getAllPayPeriods', {}, options);
};

API.deletePayrollRun = async function(runId, options = {}) {
  return this.request('deletePayrollRun', { runId }, options);
};

API.savePayrollRun = async function(payrollData = {}, options = {}) {
  // server expects formData (for consistency with other endpoints) OR direct payload
  // We'll send as formData JSON string (server handles savePayrollRun from formData in doPost).
  return this.request('savePayrollRun', { formData: JSON.stringify(payrollData) }, options);
};

API.updatePayrollRecord = async function(staffNumber, period, updateData = {}, options = {}) {
  return this.request('updatePayrollRecord', { staffNumber, period, formData: JSON.stringify(updateData) }, options);
};

API.getTaxRates = async function(options = {}) {
  return this.request('getTaxRates', {}, options);
};

API.initializePayrollSheets = async function(options = {}) {
  return this.request('initializePayrollSheets', {}, options);
};

// ALLOWANCES endpoints
API.getAllowancesByStaff = async function(staffNumber, options = {}) {
  return this.request('getAllowancesByStaff', { staffNumber }, options);
};

API.getAllAllowanceTypes = async function(options = {}) {
  return this.request('getAllAllowanceTypes', {}, options);
};

API.saveAllowance = async function(staffNumber, allowanceType, allowanceAmount, effectiveDate, options = {}) {
  const payload = { staffNumber, allowanceType, allowanceAmount, effectiveDate };
  return this.request('saveAllowance', payload, options);
};

API.deleteAllowance = async function(staffNumber, allowanceType, effectiveDate = null, options = {}) {
  return this.request('deleteAllowance', { staffNumber, allowanceType, effectiveDate }, options);
};

API.updateAllowance = async function(staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate, options = {}) {
  const payload = { staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate };
  return this.request('updateAllowance', payload, options);
};

API.initializeAllowanceSheet = async function(options = {}) {
  return this.request('initializeAllowanceSheet', {}, options);
};

// EMPLOYEE endpoints
API.getEmployees = async function(options = {}) {
  return this.request('getEmployees', {}, options);
};

API.getEmployeeByStaffNumber = async function(staffNumber, options = {}) {
  return this.request('getEmployeeByStaffNumber', { staffNumber }, options);
};

API.addEmployee = async function(employeeData = {}, options = {}) {
  return this.request('addEmployee', { formData: JSON.stringify(employeeData) }, options);
};

API.updateEmployee = async function(employeeData = {}, options = {}) {
  return this.request('updateEmployee', { formData: JSON.stringify(employeeData) }, options);
};

API.deleteEmployee = async function(staffNumber, options = {}) {
  return this.request('deleteEmployee', { staffNumber }, options);
};

API.initializeEmployeeSheet = async function(options = {}) {
  return this.request('initializeEmployeeSheet', {}, options);
};
