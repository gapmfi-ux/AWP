/**
 * API - Payroll, Allowance & Employee wrapper (updated style)
 * Mirrors pattern used in api-inventory.js: attach methods directly to global API instance.
 *
 * Depends on api-core.js (window.API) being loaded first.
 */

if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-payroll.js');
}

/* ------------------------
   PAYROLL - Runs & Reports
   ------------------------ */

API.processPayrollRun = async function(period, options = {}) {
  this.log('processPayrollRun', period);
  return this.request('processPayrollRun', { period }, options);
};

API.getPayrollRunsByPeriod = async function(period, options = {}) {
  this.log('getPayrollRunsByPeriod', period);
  return this.request('getPayrollRunsByPeriod', { period }, options);
};

API.getPayrollRunsByStaff = async function(staffNumber, options = {}) {
  this.log('getPayrollRunsByStaff', staffNumber);
  return this.request('getPayrollRunsByStaff', { staffNumber }, options);
};

API.getPayrollRunsByRunId = async function(runId, options = {}) {
  this.log('getPayrollRunsByRunId', runId);
  return this.request('getPayrollRunsByRunId', { runId }, options);
};

API.getPayrollRunSummary = async function(period, options = {}) {
  this.log('getPayrollRunSummary', period);
  return this.request('getPayrollRunSummary', { period }, options);
};

API.getAllPayPeriods = async function(options = {}) {
  this.log('getAllPayPeriods');
  return this.request('getAllPayPeriods', {}, options);
};

API.deletePayrollRun = async function(runId, options = {}) {
  this.log('deletePayrollRun', runId);
  return this.request('deletePayrollRun', { runId }, options);
};

/**
 * savePayrollRun(payrollData, options)
 * - Inserts or updates a single payroll row on the server.
 * - payrollData should be a plain object with the keys used by the server savePayrollRun function
 *   (staffNumber, fullName, designation, payPeriod, basicSalary, allowances (array), totalAllowances, grossSalary, etc.)
 */
API.savePayrollRun = async function(payrollData = {}, options = {}) {
  this.log('savePayrollRun', payrollData && payrollData.staffNumber, payrollData && payrollData.payPeriod);
  return this.request('savePayrollRun', payrollData, options);
};

/**
 * updatePayrollRecord(staffNumber, period, updateData, options)
 * - updateData: object containing server column keys to update (e.g., { 'Net Pay': 1234 } or server-friendly keys)
 */
API.updatePayrollRecord = async function(staffNumber, period, updateData = {}, options = {}) {
  this.log('updatePayrollRecord', staffNumber, period, updateData);
  // Some server flows expect formData as JSON when using POST — but JSONP handler accepts object directly.
  const payload = Object.assign({}, updateData, { staffNumber, period });
  return this.request('updatePayrollRecord', payload, options);
};

API.getTaxRates = async function(options = {}) {
  this.log('getTaxRates');
  return this.request('getTaxRates', {}, options);
};

API.initializePayrollSheets = async function(options = {}) {
  this.log('initializePayrollSheets');
  return this.request('initializePayrollSheets', {}, options);
};

/* ------------------------
   ALLOWANCES
   ------------------------ */

/**
 * getAllowancesByStaff(staffNumber, options)
 * - options may include fromDate, toDate
 */
API.getAllowancesByStaff = async function(staffNumber, options = {}) {
  this.log('getAllowancesByStaff', staffNumber, options);
  return this.request('getAllowancesByStaff', { staffNumber, options }, options);
};

API.getAllAllowanceTypes = async function(options = {}) {
  this.log('getAllAllowanceTypes');
  return this.request('getAllAllowanceTypes', {}, options);
};

/**
 * saveAllowance(staffNumber, allowanceType, allowanceAmount, effectiveDate, options)
 * - options may include overwriteIfExists boolean
 */
API.saveAllowance = async function(staffNumber, allowanceType, allowanceAmount = 0, effectiveDate = null, options = {}) {
  this.log('saveAllowance', staffNumber, allowanceType, allowanceAmount, effectiveDate, options);
  const payload = { staffNumber, allowanceType, allowanceAmount, effectiveDate, options };
  return this.request('saveAllowance', payload, options);
};

/**
 * deleteAllowance(staffNumber, allowanceType, effectiveDate = null, options)
 * - effectiveDate optional: if provided deletes specific dated allowance, else deletes all rows matching staff+type
 */
API.deleteAllowance = async function(staffNumber, allowanceType, effectiveDate = null, options = {}) {
  this.log('deleteAllowance', staffNumber, allowanceType, effectiveDate);
  return this.request('deleteAllowance', { staffNumber, allowanceType, effectiveDate }, options);
};

API.updateAllowance = async function(staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate, options = {}) {
  this.log('updateAllowance', staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate);
  const payload = { staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate, options };
  return this.request('updateAllowance', payload, options);
};

API.initializeAllowanceSheet = async function(options = {}) {
  this.log('initializeAllowanceSheet');
  return this.request('initializeAllowanceSheet', {}, options);
};

/* ------------------------
   EMPLOYEES
   ------------------------ */

API.getEmployees = async function(options = {}) {
  this.log('getEmployees');
  return this.request('getEmployees', {}, options);
};

API.getEmployeeByStaffNumber = async function(staffNumber, options = {}) {
  this.log('getEmployeeByStaffNumber', staffNumber);
  return this.request('getEmployeeByStaffNumber', { staffNumber }, options);
};

/**
 * addEmployee(employeeData, options)
 * - employeeData: object { staff, name, department, designation, email, ssnit, ghanaCard, basicSalary, ... }
 */
API.addEmployee = async function(employeeData = {}, options = {}) {
  this.log('addEmployee', employeeData && employeeData.staff);
  // Server POST variant used formData string; JSONP handler accepts object directly so pass object.
  return this.request('addEmployee', employeeData, options);
};

API.updateEmployee = async function(employeeData = {}, options = {}) {
  this.log('updateEmployee', employeeData && employeeData.staff);
  return this.request('updateEmployee', employeeData, options);
};

API.deleteEmployee = async function(staffNumber, options = {}) {
  this.log('deleteEmployee', staffNumber);
  return this.request('deleteEmployee', { staffNumber }, options);
};

API.initializeEmployeeSheet = async function(options = {}) {
  this.log('initializeEmployeeSheet');
  return this.request('initializeEmployeeSheet', {}, options);
};

/* ------------------------
   Back-compat / aliases
   ------------------------ */

// Provide a couple of aliases used by older modules if needed
API.savePayroll = API.savePayrollRun;
API.fetchPayrollByPeriod = API.getPayrollRunsByPeriod;
API.fetchPayrollByStaff = API.getPayrollRunsByStaff;
