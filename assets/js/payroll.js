/**
 * Payroll Module - Client Side Logic
 * Handles payroll processing, loading, and display
 */

let currentPayrollData = [];
let currentPeriod = '';

/* ============== Initialization ============== */

function initPayroll() {
  // Set default period to current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  currentPeriod = `${year}-${month}`;
  
  const periodInput = document.getElementById('payPeriodSelect');
  if (periodInput) {
    periodInput.value = currentPeriod;
  }
  
  loadPayrollPeriod();
}

/* ============== Load Payroll Period ============== */

async function loadPayrollPeriod() {
  const periodInput = document.getElementById('payPeriodSelect');
  if (!periodInput) return;
  
  const period = periodInput.value;
  if (!period) {
    showToast('Please select a pay period', 'warning');
    return;
  }
  
  currentPeriod = period;
  
  try {
    showLoadingModal('Loading payroll data...');
    const response = await API.getPayrollRunsByPeriod(period);
    
    if (response && Array.isArray(response) && response.length > 0) {
      currentPayrollData = response;
      renderPayrollTable(response);
      showToast(`Loaded payroll for ${period}`, 'success');
    } else {
      // No data found - show empty state
      currentPayrollData = [];
      renderPayrollTable([]);
      showToast(`No payroll found for ${period}`, 'info');
    }
  } catch (error) {
    console.error('Error loading payroll:', error);
    showToast('Failed to load payroll data', 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Process / Run Payroll ============== */

async function processPayroll() {
  const periodInput = document.getElementById('payPeriodSelect');
  if (!periodInput) return;
  
  const period = periodInput.value;
  if (!period) {
    showToast('Please select a pay period', 'warning');
    return;
  }
  
  // Confirm before processing
  if (!confirm(`Are you sure you want to process payroll for ${period}? This will calculate payroll for all employees.`)) {
    return;
  }
  
  try {
    showLoadingModal('Processing payroll...');
    const response = await API.processPayrollRun(period);
    
    if (response && response.success) {
      showToast(`Payroll processed successfully for ${period}`, 'success');
      // Reload the data
      await loadPayrollPeriod();
    } else {
      const errorMsg = response?.error || 'Failed to process payroll';
      showToast(errorMsg, 'error');
    }
  } catch (error) {
    console.error('Error processing payroll:', error);
    showToast('Failed to process payroll: ' + error.message, 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Delete Payroll Period ============== */

async function deletePayrollPeriod() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('No period selected', 'warning');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete all payroll records for ${period}? This action cannot be undone.`)) {
    return;
  }
  
  try {
    showLoadingModal('Deleting payroll records...');
    
    // Get all records for this period
    const records = await API.getPayrollRunsByPeriod(period);
    if (!records || records.length === 0) {
      showToast('No records found for this period', 'info');
      return;
    }
    
    // Get the run ID from the first record
    const runId = records[0]['Run ID'] || records[0].runId;
    if (runId) {
      const response = await API.deletePayrollRun(runId);
      if (response && response.success) {
        showToast(`Deleted payroll records for ${period}`, 'success');
        currentPayrollData = [];
        renderPayrollTable([]);
      } else {
        showToast(response?.error || 'Failed to delete payroll', 'error');
      }
    } else {
      showToast('Could not find Run ID for this period', 'error');
    }
  } catch (error) {
    console.error('Error deleting payroll:', error);
    showToast('Failed to delete payroll: ' + error.message, 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Render Payroll Table ============== */

function renderPayrollTable(data) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;
  
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="16" class="payroll-table-empty">
          <i class="fas fa-money-check-alt"></i>
          <p>No payroll data</p>
          <span class="sub-text">Run payroll to generate data for this period</span>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = data.map((record, index) => {
    // Extract values from record
    const staffNumber = record['Staff Number'] || record.staffNumber || '';
    const fullName = record['Full Name'] || record.fullName || '';
    const designation = record['Designation'] || record.designation || '';
    const basicSalary = parseFloat(record['Basic Salary'] || record.basicSalary || 0) || 0;
    const totalAllowances = parseFloat(record['Total Allowances'] || record.totalAllowances || 0) || 0;
    const grossSalary = parseFloat(record['Gross Salary'] || record.grossSalary || 0) || 0;
    const employeePension = parseFloat(record['Employee Pension'] || record.employeePension || 0) || 0;
    const employeePf = parseFloat(record['Employee Pf'] || record.employeePf || 0) || 0;
    const pf10Amount = parseFloat(record['Pf 10% Amount'] || record.pf10Amount || 0) || 0;
    const taxRelief = parseFloat(record['Tax Relief'] || record.taxRelief || 0) || 0;
    const taxableIncome = parseFloat(record['Taxable Income'] || record.taxableIncome || 0) || 0;
    const paye = parseFloat(record['PAYE'] || record.paye || 0) || 0;
    const totalDeduction = parseFloat(record['Total Deduction'] || record.totalDeduction || 0) || 0;
    const netPay = parseFloat(record['Net Pay'] || record.netPay || 0) || 0;
    const employerPension = parseFloat(record['Employer Pension'] || record.employerPension || 0) || 0;
    const employerPf = parseFloat(record['Employer Pf'] || record.employerPf || 0) || 0;
    const loanMonthly = parseFloat(record['Monthly Loan'] || record.loanMonthly || 0) || 0;
    
    // Get allowances JSON for display
    let allowancesDisplay = '';
    try {
      const allowancesRaw = record['Allowances'] || record.allowances || '[]';
      const allowances = typeof allowancesRaw === 'string' ? JSON.parse(allowancesRaw) : allowancesRaw;
      if (Array.isArray(allowances) && allowances.length > 0) {
        allowancesDisplay = allowances.map(a => `${a.type}: ${formatMoney(a.amount)}`).join(', ');
      }
    } catch (e) {
      allowancesDisplay = '';
    }
    
    return `
      <tr>
        <td class="col-staff">${escapeHtml(staffNumber)}</td>
        <td class="col-name">${escapeHtml(fullName)}</td>
        <td>${escapeHtml(designation)}</td>
        <td class="col-number">${formatMoney(basicSalary)}</td>
        <td class="col-number" title="${escapeHtml(allowancesDisplay)}">${formatMoney(totalAllowances)}</td>
        <td class="col-number positive">${formatMoney(grossSalary)}</td>
        <td class="col-number">${formatMoney(employeePension)}</td>
        <td class="col-number">${formatMoney(pf10Amount)}</td>
        <td class="col-number">${formatMoney(taxRelief)}</td>
        <td class="col-number">${formatMoney(taxableIncome)}</td>
        <td class="col-number negative">${formatMoney(paye)}</td>
        <td class="col-number negative">${formatMoney(totalDeduction)}</td>
        <td class="col-number positive">${formatMoney(netPay)}</td>
        <td class="col-number">${formatMoney(employerPension)}</td>
        <td class="col-number">${formatMoney(employerPf)}</td>
        <td class="col-number">${formatMoney(loanMonthly)}</td>
      </tr>
    `;
  }).join('');
}

/* ============== Print Function (placeholder) ============== */

function printPayroll() {
  showToast('Print functionality coming soon', 'info');
}

/* ============== Utility Functions ============== */

function formatMoney(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.00';
  return n.toFixed(2);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  }[s]));
}

/* ============== Show Toast (if not already defined) ============== */

function showToast(message, type = 'info') {
  const toast = document.getElementById('global-toast');
  if (!toast) {
    console.log(`[${type}] ${message}`);
    return;
  }
  
  toast.textContent = message;
  toast.className = type;
  toast.style.display = 'block';
  
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/* ============== Exports ============== */

window.initPayroll = initPayroll;
window.processPayroll = processPayroll;
window.loadPayrollPeriod = loadPayrollPeriod;
window.deletePayrollPeriod = deletePayrollPeriod;
window.printPayroll = printPayroll;
window.renderPayrollTable = renderPayrollTable;
