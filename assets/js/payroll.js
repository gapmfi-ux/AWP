/* Payroll client logic - Server-backed (no localStorage) */

// Store allowance types (kept local for the dropdown)
let allowanceTypes = ['Housing', 'Transport', 'Meal', 'Medical', 'Risk Allowance', 'Other'];

function initPayroll() {
  renderPayrollTable([]); // placeholder while loading
  const pp = document.getElementById('payPeriod');
  if (pp && !pp.value) {
    const d = new Date();
    pp.value = d.toISOString().slice(0, 7);
  }
  loadPayrollRows();
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAddPayModal();
    }
  });
}

// map server record (sheet columns) to client-friendly object
function mapServerRecordToClient(rec) {
  if (!rec) return null;
  // Server returns object keyed by header names, e.g. 'Staff Number', 'Full Name', 'Allowances (JSON)', etc.
  const staff = rec['Staff Number'] || rec['Staff'] || rec['STAFF_NUMBER'] || '';
  const name = rec['Full Name'] || rec['FullName'] || rec['FULL_NAME'] || '';
  const designation = rec['Designation'] || rec['DESIGNATION'] || '';
  const basicSalary = parseFloat(rec['Basic Salary'] || rec['BASIC_SALARY'] || 0) || 0;
  let allowances = [];
  const allowRaw = rec['Allowances (JSON)'] || rec['Allowances'] || rec['ALLOWANCES'] || rec['Allowances (JSON)'];
  try {
    if (allowRaw) allowances = (typeof allowRaw === 'string') ? JSON.parse(allowRaw) : allowRaw;
  } catch (e) {
    allowances = [];
  }
  return {
    staff: String(staff).trim(),
    name: String(name).trim(),
    designation: String(designation).trim(),
    basicSalary: basicSalary,
    allowances: allowances,
    totalAllowances: parseFloat(rec['Total Allowances']) || parseFloat(rec['TOTAL_ALLOWANCES']) || 0,
    grossSalary: parseFloat(rec['Gross Salary']) || parseFloat(rec['GROSS_SALARY']) || 0,
    employeePension: parseFloat(rec['Employee Pension']) || 0,
    employeePf: parseFloat(rec['Employee Pf']) || parseFloat(rec['EMPLOYEE_PF']) || 0,
    pf10Amount: parseFloat(rec['Pf 10% Amount']) || 0,
    taxRelief: parseFloat(rec['Tax Relief'] || 0) || 0,
    taxableIncome: parseFloat(rec['Taxable Income']) || 0,
    paye: parseFloat(rec['PAYE']) || 0,
    totalDeduction: parseFloat(rec['Total Deduction']) || 0,
    netPay: parseFloat(rec['Net Pay']) || 0,
    employerPension: parseFloat(rec['Employer Pension']) || parseFloat(rec['Employer 13% Amount']) || 0,
    employerPf: parseFloat(rec['Employer Pf']) || parseFloat(rec['Employer Pf Amount']) || 0,
    loanMonthly: parseFloat(rec['Monthly Loan'] || rec['Monthly Loan'] || 0) || 0,
    loanFrom: rec['Loan From'] || '',
    loanTo: rec['Loan To'] || '',
    period: rec['Pay Period'] || rec['PAY_PERIOD'] || ''
  };
}

async function loadPayrollRows() {
  // The payroll table is now populated from the Employees sheet (so it shows the latest snapshot)
  try {
    showLoadingModal('Loading payroll from employees...');
    // Get employees from server (they include payroll snapshot columns)
    const resp = await API.getEmployees({ useCache: false });
    const serverRecords = resp || [];
    const serverArray = Array.isArray(serverRecords) ? serverRecords : (serverRecords.records || []);
    // Map server employee rows to payroll table rows
    const clientRows = serverArray.map(rec => {
      return {
        staff: rec['Staff Number'] || rec.staff || '',
        name: rec['Full Name'] || rec.name || '',
        designation: rec['Designation'] || '',
        basicSalary: parseFloat(rec['Basic Salary'] || 0) || 0,
        totalAllowances: parseFloat(rec['Total Allowances'] || 0) || 0,
        grossSalary: parseFloat(rec['Gross Salary'] || 0) || 0,
        employeePension: parseFloat(rec['Employee Pension'] || 0) || 0,
        employeePf: parseFloat(rec['Employee PF Amount'] || rec['Employee Pf'] || 0) || 0,
        taxRelief: parseFloat(rec['Tax Relief'] || 0) || 0,
        taxableIncome: parseFloat(rec['Taxable Income'] || 0) || 0,
        paye: parseFloat(rec['PAYE'] || 0) || 0,
        totalDeduction: parseFloat(rec['Total Deduction'] || 0) || 0,
        netPay: parseFloat(rec['Net Pay'] || 0) || 0,
        employerPension: parseFloat(rec['Employer 13% Amount'] || rec['Employer Pension'] || 0) || 0,
        employerPf: parseFloat(rec['Employer Pf Amount'] || rec['Employer Pf'] || 0) || 0,
        loanMonthly: parseFloat(rec['Monthly Loan'] || 0) || 0,
        loanFrom: rec['Loan From'] || '',
        loanTo: rec['Loan To'] || ''
      };
    });
    renderPayrollTable(clientRows);
  } catch (err) {
    console.error('Error loading payroll rows', err);
    showToast('Failed to load payroll rows', 'error');
    renderPayrollTable([]);
  } finally {
    hideLoadingModal();
  }
}

function renderPayrollTable(rows) {
  const data = rows || [];
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="16" class="payroll-table-empty">
          <i class="fas fa-receipt"></i>
          <p>No payroll records found</p>
          <span class="sub-text">Click "Add Employee Pay" to get started</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((r, index) => `
    <tr data-staff="${escapeHtml(r.staff)}" data-index="${index}">
      <td class="col-staff">${escapeHtml(r.staff)}</td>
      <td class="col-name">${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.designation || '-')}</td>
      <td class="col-number">${formatMoney(r.basicSalary)}</td>
      <td class="col-number">${formatMoney(r.totalAllowances || 0)}</td>
      <td class="col-number">${formatMoney(r.grossSalary)}</td>
      <td class="col-number">${formatMoney(r.employeePension)}</td>
      <td class="col-number">${formatMoney(r.employeePf)}</td>
      <td class="col-number">${formatMoney(r.taxRelief || 0)}</td>
      <td class="col-number">${formatMoney(r.taxableIncome)}</td>
      <td class="col-number ${r.paye > 0 ? 'negative' : ''}">${formatMoney(r.paye)}</td>
      <td class="col-number negative">${formatMoney(r.totalDeduction)}</td>
      <td class="col-number positive">${formatMoney(r.netPay)}</td>
      <td class="col-number">${formatMoney(r.employerPension)}</td>
      <td class="col-number">${formatMoney(r.employerPf)}</td>
      <td class="col-number">${formatMoney(r.loanMonthly)}</td>
    </tr>
  `).join('');

  document.querySelectorAll('#payrollTableBody tr[data-staff]').forEach(tr => {
    tr.addEventListener('click', function(e) {
      const staff = this.getAttribute('data-staff');
      if (staff) showPayslipFor(staff);
    });

    const hint = document.createElement('span');
    hint.className = 'click-hint';
    hint.textContent = '↗';
    const firstTd = tr.querySelector('td:first-child');
    if (firstTd) firstTd.appendChild(hint);
  });
}

async function editPayrollRecord(staff) {
  // For editing a payroll snapshot, open the employee modal so it stores the payroll snapshot on the employees sheet.
  if (!staff) return;
  try {
    showLoadingModal('Loading payroll record...');
    // Use employee edit route
    const resp = await API.getEmployeeByStaffNumber(staff);
    const rec = resp || {};
    const client = {
      staff: rec['Staff Number'] || rec.staff || staff,
      name: rec['Full Name'] || rec.name || '',
      department: rec['Department'] || '',
      designation: rec['Designation'] || '',
      email: rec['Email'] || '',
      ssnit: rec['SSNIT'] || '',
      ghanaCard: rec['Ghana Card'] || '',
      basicSalary: parseFloat(rec['Basic Salary'] || 0) || 0,
      employeePFrate: parseFloat(rec['Employee PF Rate (%)'] || 0) || 0,
      employerPFrate: parseFloat(rec['Employer PF Rate (%)'] || 0) || 0,
      taxRelief: parseFloat(rec['Tax Relief'] || 0) || 0,
      monthlyLoan: parseFloat(rec['Monthly Loan'] || 0) || 0,
      loanFrom: rec['Loan From'] || '',
      loanTo: rec['Loan To'] || '',
      status: rec['Status'] || 'Active'
    };
    // open employee modal with data
    if (typeof showAddEmployeeModal === 'function') {
      showAddEmployeeModal(client);
    } else {
      showToast('Employee editor not available', 'warning');
    }
  } catch (err) {
    console.error('Error fetching payroll record', err);
    showToast('Failed to load record', 'error');
  } finally {
    hideLoadingModal();
  }
}

function showAddPayModal(editData) {
  // Prefer to show employee modal for payroll edits
  if (editData && editData.staff) {
    if (typeof showAddEmployeeModal === 'function') {
      showAddEmployeeModal(editData);
    }
    return;
  }
  const modal = document.getElementById('addPayModal');
  if (!modal) return;
  modal.classList.add('show');
  // The main employee-add handles the inputs now
}

function closeAddPayModal() {
  const modal = document.getElementById('addPayModal');
  if (modal) modal.classList.remove('show');
}

async function runPayrollHandler() {
  const period = document.getElementById('payPeriod')?.value || null;
  if (!period) {
    showToast('Select a pay period first', 'warning');
    return;
  }
  if (!confirm(`Run payroll for period ${period}? This will compute payroll for all employees and save to Payroll Runs sheet.`)) return;
  try {
    showLoadingModal('Running payroll...');
    const resp = await API.processPayrollRun(period);
    if (resp && resp.success) {
      showToast(`Payroll run completed: ${resp.processedCount} employees`, 'success');
      // reload payroll rows (the payroll runs are saved; we keep payroll table showing employees sheet snapshot)
      await loadPayrollRows();
    } else {
      showToast((resp && resp.error) ? resp.error : 'Payroll run failed', 'error');
    }
  } catch (err) {
    console.error('Error running payroll', err);
    showToast('Failed to run payroll', 'error');
  } finally {
    hideLoadingModal();
  }
}

async function saveEmployeePay() {
  // Deprecated: payroll edits should be done via the employee modal
  showToast('Please use the Employee editor to save payroll snapshot', 'info');
}

async function deletePayrollRecord(staff) {
  if (!staff) return;
  if (!confirm(`Delete payroll record for "${staff}"?`)) return;
  // Deletes require a runId; not supported directly here
  showToast('Use Payroll Runs admin to delete runs by Run ID', 'warning');
}

function showPayslipFor(staff) {
  // keep behavior: navigate to payslip module and set selected staff in localStorage
  localStorage.setItem('awp_selected_payslip_staff', staff);
  if (typeof loadModule === 'function') {
    loadModule('payslip');
  }
}

/* The rest of utility functions (roundToTwo, formatMoney, escapeHtml, showToast, etc.) are unchanged and expected to remain in this file or globally. */

function roundToTwo(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatMoney(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.00';
  return n.toFixed(2);
}

function escapeHtml(s) {
  if (!s) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };
  return String(s).replace(/[&<>"'`]/g, c => map[c] || c);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('global-toast');
  if (!toast) {
    const newToast = document.createElement('div');
    newToast.id = 'global-toast';
    newToast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 380px;
      display: none;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(newToast);
    showToast(message, type);
    return;
  }

  const colors = {
    success: '#38a169',
    error: '#e53e3e',
    warning: '#d69e2e',
    info: '#4361ee'
  };

  toast.style.background = colors[type] || colors.info;
  toast.style.color = '#fff';
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(10px)';

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
  }, 3000);
}

// ---- Exports ----
window.initPayroll = initPayroll;
window.showAddPayModal = showAddPayModal;
window.closeAddPayModal = closeAddPayModal;
window.saveEmployeePay = saveEmployeePay;
window.autoFillEmployeeDetails = function() {}; // Not used in new flow
window.toggleAllowanceFields = function() {};
window.togglePFFields = function() {};
window.toggleTaxReliefField = function() {};
window.toggleLoanFields = function() {};
window.addAllowanceRow = function() {};
window.recalcPayrollPreview = function() {};
window.showPayslipFor = showPayslipFor;
window.deletePayrollRecord = deletePayrollRecord;
window.loadPayrollRows = loadPayrollRows;
window.editPayrollRecord = editPayrollRecord;
window.runPayrollHandler = runPayrollHandler;
