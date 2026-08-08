/**
 * API - Payroll, Allowance & Employee wrapper (direct attach style)
 * Follows same approach as api-inventory.js
 *
 * Place this file at assets/js/api/api-payroll.js and load it after api-core.js in index.html.
 */

if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-payroll.js');
}

// ---------- PAYROLL ----------
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
  return this.request('savePayrollRun', { formData: JSON.stringify(payrollData) }, options);
};

API.updatePayrollRecord = async function(staffNumber, period, updateData = {}, options = {}) {
  const payload = Object.assign({}, updateData, { staffNumber, period, formData: JSON.stringify(updateData) });
  return this.request('updatePayrollRecord', payload, options);
};

API.getTaxRates = async function(options = {}) {
  return this.request('getTaxRates', {}, options);
};

API.initializePayrollSheets = async function(options = {}) {
  return this.request('initializePayrollSheets', {}, options);
};

// ---------- ALLOWANCES ----------
API.getAllowancesByStaff = async function(staffNumber, options = {}) {
  return this.request('getAllowancesByStaff', { staffNumber }, options);
};

API.getAllAllowanceTypes = async function(options = {}) {
  return this.request('getAllAllowanceTypes', {}, options);
};

API.saveAllowance = async function(staffNumber, allowanceType, allowanceAmount, effectiveDate, options = {}) {
  const payload = { staffNumber, allowanceType, allowanceAmount, effectiveDate };
  if (options && options.overwriteIfExists) payload.options = { overwriteIfExists: true };
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

// ---------- EMPLOYEES ----------
API.getEmployees = async function(options = {}) {
  return this.request('getEmployees', {}, options);
};

API.getEmployeeByStaffNumber = async function(staffNumber, options = {}) {
  return this.request('getEmployeeByStaffNumber', { staffNumber }, options);
};

API.addEmployee = async function(employeeData = {}, options = {}) {
  // Send as direct params, not nested formData
  return this.request('addEmployee', employeeData, options);
};

API.updateEmployee = async function(employeeData = {}, options = {}) {
  // Send as direct params, not nested formData
  return this.request('updateEmployee', employeeData, options);
};

API.deleteEmployee = async function(staffNumber, options = {}) {
  return this.request('deleteEmployee', { staffNumber }, options);
};

API.initializeEmployeeSheet = async function(options = {}) {
  return this.request('initializeEmployeeSheet', {}, options);
};
