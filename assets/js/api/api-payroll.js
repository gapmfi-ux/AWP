/**
 * API - Payroll, Allowance & Employee wrapper
 * Requires api-core.js loaded first (window.API)
 */

if (!window.API || typeof window.API.request !== 'function') {
  throw new Error('API core (api-core.js) must be loaded before api-payroll.js');
}

(function(ns) {

  // PAYROLL
  ns.processPayrollRun = async function(period, options = {}) {
    return ns.request('processPayrollRun', { period }, options);
  };

  ns.getPayrollRunsByPeriod = async function(period, options = {}) {
    return ns.request('getPayrollRunsByPeriod', { period }, options);
  };

  ns.getPayrollRunsByStaff = async function(staffNumber, options = {}) {
    return ns.request('getPayrollRunsByStaff', { staffNumber }, options);
  };

  ns.getPayrollRunsByRunId = async function(runId, options = {}) {
    return ns.request('getPayrollRunsByRunId', { runId }, options);
  };

  ns.getPayrollRunSummary = async function(period, options = {}) {
    return ns.request('getPayrollRunSummary', { period }, options);
  };

  ns.getAllPayPeriods = async function(options = {}) {
    return ns.request('getAllPayPeriods', {}, options);
  };

  ns.deletePayrollRun = async function(runId, options = {}) {
    return ns.request('deletePayrollRun', { runId }, options);
  };

  // Save single payroll row (insert or update)
  ns.savePayrollRun = async function(payrollData = {}, options = {}) {
    // payrollData should match the server-side expected keys:
    // runId, staffNumber, fullName, designation, payPeriod, basicSalary,
    // allowances (array), totalAllowances, grossSalary, employeePension, employeePf,
    // pf10Amount, taxRelief, taxableIncome, paye, totalDeduction, netPay,
    // employerPension, employerPf, loanMonthly, loanFrom, loanTo
    return ns.request('savePayrollRun', payrollData, options);
  };

  ns.updatePayrollRecord = async function(staffNumber, period, updateData = {}, options = {}) {
    const payload = Object.assign({}, updateData, { staffNumber, period });
    return ns.request('updatePayrollRecord', payload, options);
  };

  ns.getTaxRates = async function(options = {}) {
    return ns.request('getTaxRates', {}, options);
  };

  ns.initializePayrollSheets = async function(options = {}) {
    return ns.request('initializePayrollSheets', {}, options);
  };

  // ALLOWANCES
  ns.getAllowancesByStaff = async function(staffNumber, options = {}) {
    return ns.request('getAllowancesByStaff', { staffNumber, options }, options);
  };

  ns.getAllAllowanceTypes = async function(options = {}) {
    return ns.request('getAllAllowanceTypes', {}, options);
  };

  ns.saveAllowance = async function(staffNumber, allowanceType, allowanceAmount, effectiveDate, options = {}) {
    const payload = { staffNumber, allowanceType, allowanceAmount, effectiveDate, options };
    return ns.request('saveAllowance', payload, options);
  };

  ns.deleteAllowance = async function(staffNumber, allowanceType, effectiveDate = null, options = {}) {
    return ns.request('deleteAllowance', { staffNumber, allowanceType, effectiveDate }, options);
  };

  ns.updateAllowance = async function(staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate, options = {}) {
    const payload = { staffNumber, oldAllowanceType, newAllowanceType, newAllowanceAmount, newEffectiveDate, options };
    return ns.request('updateAllowance', payload, options);
  };

  ns.initializeAllowanceSheet = async function(options = {}) {
    return ns.request('initializeAllowanceSheet', {}, options);
  };

  // EMPLOYEES
  ns.getEmployees = async function(options = {}) {
    return ns.request('getEmployees', {}, options);
  };

  ns.getEmployeeByStaffNumber = async function(staffNumber, options = {}) {
    return ns.request('getEmployeeByStaffNumber', { staffNumber }, options);
  };

  ns.addEmployee = async function(employeeData = {}, options = {}) {
    return ns.request('addEmployee', { formData: JSON.stringify(employeeData) }, options);
  };

  ns.updateEmployee = async function(employeeData = {}, options = {}) {
    return ns.request('updateEmployee', { formData: JSON.stringify(employeeData) }, options);
  };

  ns.deleteEmployee = async function(staffNumber, options = {}) {
    return ns.request('deleteEmployee', { staffNumber }, options);
  };

  ns.initializeEmployeeSheet = async function(options = {}) {
    return ns.request('initializeEmployeeSheet', {}, options);
  };

})(window.API);
