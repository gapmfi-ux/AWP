/**
 * payroll.js - Complete updated payroll client logic
 *
 * - No automatic loading of payroll preview on module init.
 * - Period input defaults to current month.
 * - "Process Payroll" builds a preview (active employees only).
 * - "Run Payroll" saves current preview (or computes then saves).
 * - Button visibility toggles: [Process + Run] when no saved run, [Print + Delete] when a saved run exists.
 * - Uses API.* methods (api-payroll.js) to communicate with server-side AppsScript.
 */

let currentPayrollData = [];
let currentPeriod = '';
let currentRunId = null; // populated when a saved run is loaded

/* ===========================
   Initialization
   =========================== */

function initPayroll() {
  currentPayrollData = [];
  currentPeriod = '';
  currentRunId = null;

  const periodInput = document.getElementById('payPeriodSelect');
  if (periodInput) {
    periodInput.value = getCurrentMonthValue(); // default to current month
  }

  // Initially assume no saved run until we check
  toggleActionButtons(false);

  // Check for existing run for default period (do not auto-generate preview)
  const defaultPeriod = document.getElementById('payPeriodSelect')?.value;
  if (defaultPeriod) {
    checkPayrollExistsAndToggle(defaultPeriod);
  }
}

/* ===========================
   Helpers
   =========================== */

function getCurrentMonthValue() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}`;
}

function onPeriodChange() {
  const period = document.getElementById('payPeriodSelect')?.value;
  currentPeriod = period || '';
  if (currentPeriod) {
    checkPayrollExistsAndToggle(currentPeriod);
  } else {
    toggleActionButtons(false);
    currentPayrollData = [];
    currentRunId = null;
    renderPayrollTable([]);
  }
}

/**
 * Toggle which action buttons are visible:
 *  - showProcessRun true  => show [Process Payroll] + [Run Payroll]
 *  - showProcessRun false => show [Print] + [Delete]
 */
function toggleActionButtons(showProcessRun) {
  const pr = document.getElementById('actions-process-run');
  const pd = document.getElementById('actions-print-delete');
  if (showProcessRun) {
    if (pr) pr.style.display = 'flex';
    if (pd) pd.style.display = 'none';
  } else {
    if (pr) pr.style.display = 'none';
    if (pd) pd.style.display = 'flex';
  }
}

/* ===========================
   Check for existing saved run for a period
   =========================== */

async function checkPayrollExistsAndToggle(period) {
  try {
    showLoadingModal && showLoadingModal('Checking payroll run...');
    const records = await API.getPayrollRunsByPeriod(period).catch(() => []);
    if (records && Array.isArray(records) && records.length > 0) {
      // saved run exists
      currentPayrollData = records;
      currentRunId = records[0]['Run ID'] || records[0].runId || null;
      renderPayrollTable(records, false);
      toggleActionButtons(false); // show Print/Delete
      showToast(`Loaded saved payroll for ${period}`, 'info');
    } else {
      // no saved run
      currentPayrollData = [];
      currentRunId = null;
      renderPayrollTable([], true);
      toggleActionButtons(true); // show Process + Run
    }
  } catch (err) {
    console.error('checkPayrollExistsAndToggle error', err);
    showToast('Failed to check saved payroll', 'error');
    toggleActionButtons(true);
  } finally {
    hideLoadingModal && hideLoadingModal();
  }
}

/* ===========================
   Process Payroll (Preview) - active employees only
   =========================== */

async function processPayrollPreview() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('Please select a pay period (month) first', 'warning');
    return;
  }
  currentPeriod = period;

  try {
    showLoadingModal && showLoadingModal('Processing payroll preview...');
    const resp = await API.getEmployees().catch(() => []);
    const serverRecords = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp || []);

    if (!serverRecords || serverRecords.length === 0) {
      currentPayrollData = [];
      renderPayrollTable([]);
      showToast('No employees found', 'warning');
      return;
    }

    const payrollData = [];

    for (const emp of serverRecords) {
      // Only include active employees (if Status column exists)
      const status = (emp['Status'] || emp.status || '').toString().trim().toLowerCase();
      if (status && status !== 'active') continue;

      const staffNumber = emp['Staff Number'] || emp.staff || '';
      if (!staffNumber) continue;

      const fullName = emp['Full Name'] || emp.name || '';
      const designation = emp['Designation'] || emp.designation || '';
      const basicSalary = parseFloat(emp['Basic Salary'] || emp.basicSalary || 0) || 0;
      const employeePFrate = parseFloat(emp['Employee PF Rate (%)'] || emp.employeePFrate || 0) || 0;
      const employerPFrate = parseFloat(emp['Employer PF Rate (%)'] || emp.employerPfrate || emp.employerPFrate || 0) || 0;
      const taxRelief = parseFloat(emp['Tax Relief'] || emp.taxRelief || 0) || 0;
      const loanMonthly = parseFloat(emp['Monthly Loan'] || emp.loanMonthly || 0) || 0;

      // allowances from backend (may be []); normalize
      let allowances = [];
      try {
        allowances = await API.getAllowancesByStaff(staffNumber).catch(() => []);
        allowances = Array.isArray(allowances) ? allowances : (allowances && allowances.records) ? allowances.records : (allowances || []);
      } catch (e) {
        allowances = [];
      }

      const calc = computePayrollRow({
        basicSalary,
        allowances,
        employeePFpct: employeePFrate || 5.5,
        employerPFpct: employerPFrate || 5,
        reliefAmount: taxRelief,
        loanMonthly,
        pfChecked: employeePFrate > 0
      });

      payrollData.push({
        'Staff Number': staffNumber,
        'Full Name': fullName,
        'Designation': designation,
        'Basic Salary': basicSalary,
        'Total Allowances': calc.totalAllowances,
        'Gross Salary': calc.grossSalary,
        'Employee Pension (5.5%)': calc.employeePension,
        'Employee PF': calc.employeePf,
        'Tax Relief': taxRelief,
        'Taxable Income': calc.taxableAmount || calc.taxableIncome || 0,
        'PAYE': calc.paye,
        'Total Deduction': calc.totalDeductionsBeforeTax || calc.totalDeduction || 0,
        'Net Pay': calc.netPay,
        'Employer Pension (13%)': calc.employerPension,
        'Employer PF': calc.employerPf,
        'Monthly Loan': calc.loanMonthly || 0,
        'Allowances': allowances
      });
    }

    currentPayrollData = payrollData;
    currentRunId = null; // preview only
    renderPayrollTable(payrollData, true);
    toggleActionButtons(true); // show Process + Run
    showToast('Payroll preview ready. Click Run Payroll to save.', 'success');
  } catch (err) {
    console.error('processPayrollPreview error', err);
    showToast('Failed to build payroll preview', 'error');
  } finally {
    hideLoadingModal && hideLoadingModal();
  }
}

/* ===========================
   Run Payroll (save current preview)
   =========================== */

async function processPayroll() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('Please select a pay period (month) first', 'warning');
    return;
  }

  // If no preview exists, compute one first
  if (!currentPayrollData || currentPayrollData.length === 0) {
    showToast('No preview present — computing payroll then saving...', 'info');
    await processPayrollPreview();
    if (!currentPayrollData || currentPayrollData.length === 0) {
      showToast('No payroll records to save', 'warning');
      return;
    }
  }

  showConfirmModal(
    'Confirm Payroll Processing',
    `Are you sure you want to save payroll for <strong>${period}</strong>?<br><br>This will save the current payroll calculations to the sheet.`,
    async function onConfirm() {
      try {
        showLoadingModal && showLoadingModal('Saving payroll...');
        let savedCount = 0;

        for (const record of currentPayrollData) {
          const payrollData = {
            staffNumber: record['Staff Number'] || record.staffNumber || '',
            fullName: record['Full Name'] || record.fullName || '',
            designation: record['Designation'] || record.designation || '',
            payPeriod: period,
            basicSalary: parseFloat(record['Basic Salary'] || record.basicSalary || 0) || 0,
            allowances: record['Allowances'] || [],
            totalAllowances: parseFloat(record['Total Allowances'] || record.totalAllowances || 0) || 0,
            grossSalary: parseFloat(record['Gross Salary'] || record.grossSalary || 0) || 0,
            employeePension: parseFloat(record['Employee Pension (5.5%)'] || record.employeePension || 0) || 0,
            employeePf: parseFloat(record['Employee PF'] || record.employeePf || 0) || 0,
            taxRelief: parseFloat(record['Tax Relief'] || record.taxRelief || 0) || 0,
            taxableIncome: parseFloat(record['Taxable Income'] || record.taxableIncome || 0) || 0,
            paye: parseFloat(record['PAYE'] || record.paye || 0) || 0,
            totalDeduction: parseFloat(record['Total Deduction'] || record.totalDeduction || 0) || 0,
            netPay: parseFloat(record['Net Pay'] || record.netPay || 0) || 0,
            employerPension: parseFloat(record['Employer Pension (13%)'] || record.employerPension || 0) || 0,
            employerPf: parseFloat(record['Employer PF'] || record.employerPf || 0) || 0,
            loanMonthly: parseFloat(record['Monthly Loan'] || record.loanMonthly || 0) || 0
          };

          const response = await API.savePayrollRun(payrollData);
          if (response && response.success !== false) {
            savedCount++;
            if (!currentRunId && response.runId) currentRunId = response.runId;
          } else {
            console.warn('Failed saving payroll for', payrollData.staffNumber, response);
          }
        }

        if (savedCount > 0) {
          showToast(`Payroll saved for ${period} (${savedCount} records)`, 'success');
          // After saving, reload saved run rows to reflect stored data
          await checkPayrollExistsAndToggle(period);
          toggleActionButtons(false); // show Print/Delete
        } else {
          showToast('Failed to save payroll records', 'error');
        }
      } catch (err) {
        console.error('processPayroll save error', err);
        showToast('Failed to save payroll: ' + (err.message || err), 'error');
      } finally {
        hideLoadingModal && hideLoadingModal();
        closeConfirmModal();
      }
    },
    function onCancel() {
      closeConfirmModal();
    }
  );
}

/* ===========================
   Delete Payroll Period
   =========================== */

async function deletePayrollPeriod() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('No pay period selected', 'warning');
    return;
  }

  showConfirmModal(
    'Confirm Delete',
    `Are you sure you want to delete all payroll records for <strong>${period}</strong>?<br><br>This action cannot be undone.`,
    async function onConfirm() {
      try {
        showLoadingModal && showLoadingModal('Deleting payroll records...');
        const records = await API.getPayrollRunsByPeriod(period);
        if (!records || records.length === 0) {
          showToast('No records found for this period', 'info');
          closeConfirmModal();
          return;
        }

        const runId = records[0]['Run ID'] || records[0].runId;
        if (runId) {
          const response = await API.deletePayrollRun(runId);
          if (response && response.success) {
            showToast(`Deleted payroll records for ${period}`, 'success');
            currentPayrollData = [];
            currentRunId = null;
            toggleActionButtons(true);
            renderPayrollTable([], true);
          } else {
            showToast(response?.error || 'Failed to delete payroll', 'error');
          }
        } else {
          showToast('Could not find Run ID for this period', 'error');
        }
      } catch (err) {
        console.error('deletePayrollPeriod error', err);
        showToast('Failed to delete payroll: ' + (err.message || err), 'error');
      } finally {
        hideLoadingModal && hideLoadingModal();
        closeConfirmModal();
      }
    },
    function onCancel() {
      closeConfirmModal();
    }
  );
}

/* ===========================
   Render Payroll Table
   =========================== */

function renderPayrollTable(data, isPreview = false) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="16" class="payroll-table-empty">
          <i class="fas fa-money-check-alt"></i>
          <p>No payroll data</p>
          <span class="sub-text">${isPreview ? 'Click Process Payroll to generate preview' : 'Select a pay period or run payroll'}</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(record => {
    const staffNumber = record['Staff Number'] || record.staffNumber || '';
    const fullName = record['Full Name'] || record.fullName || '';
    const designation = record['Designation'] || record.designation || '';
    const basicSalary = parseFloat(record['Basic Salary'] || record.basicSalary || 0) || 0;
    const totalAllowances = parseFloat(record['Total Allowances'] || record.totalAllowances || 0) || 0;
    const grossSalary = parseFloat(record['Gross Salary'] || record.grossSalary || 0) || 0;
    const employeePension = parseFloat(record['Employee Pension(5.5%)'] || record['Employee Pension (5.5%)'] || record.employeePension || 0) || 0;
    const employeePf = parseFloat(record['Employee PF(10%)'] || record['Employee PF'] || record.employeePf || 0) || 0;
    const taxRelief = parseFloat(record['Tax Relief'] || record.taxRelief || 0) || 0;
    const taxableIncome = parseFloat(record['Taxable Income'] || record.taxableIncome || 0) || 0;
    const paye = parseFloat(record['PAYE'] || record.paye || 0) || 0;
    const totalDeduction = parseFloat(record['Total Deduction'] || record.totalDeduction || 0) || 0;
    const netPay = parseFloat(record['Net Pay'] || record.netPay || 0) || 0;
    const employerPension = parseFloat(record['Employer Pension(13%)'] || record['Employer Pension (13%)'] || record.employerPension || 0) || 0;
    const employerPf = parseFloat(record['Employer PF(5%)'] || record['Employer PF'] || record.employerPf || 0) || 0;
    const loanMonthly = parseFloat(record['Monthly Loan'] || record.loanMonthly || 0) || 0;

    const formatCell = (value) => {
      if (value === 0 || value === '0' || isNaN(value) || value === '') return '<span class="zero">—</span>';
      return formatMoney(value);
    };

    return `
      <tr>
        <td class="col-staff">${escapeHtml(staffNumber)}</td>
        <td class="col-name">${escapeHtml(fullName)}</td>
        <td>${escapeHtml(designation)}</td>
        <td class="col-number">${formatCell(basicSalary)}</td>
        <td class="col-number">${formatCell(totalAllowances)}</td>
        <td class="col-number positive">${formatCell(grossSalary)}</td>
        <td class="col-number">${formatCell(employeePension)}</td>
        <td class="col-number">${formatCell(employeePf)}</td>
        <td class="col-number">${formatCell(taxRelief)}</td>
        <td class="col-number">${formatCell(taxableIncome)}</td>
        <td class="col-number negative">${formatCell(paye)}</td>
        <td class="col-number negative">${formatCell(totalDeduction)}</td>
        <td class="col-number positive">${formatCell(netPay)}</td>
        <td class="col-number">${formatCell(employerPension)}</td>
        <td class="col-number">${formatCell(employerPf)}</td>
        <td class="col-number">${formatCell(loanMonthly)}</td>
      </tr>
    `;
  }).join('');
}

/* ===========================
   Print
   =========================== */

function printPayroll() {
  window.print();
}

/* ===========================
   Client payroll compute helpers
   (kept here so preview matches server compute)
   =========================== */

function roundToTwo(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getTaxBrackets() {
  return [
    { bracket: 'First', amount: 490, rate: 0 },
    { bracket: 'Next', amount: 110, rate: 0.05 },
    { bracket: 'Next', amount: 130, rate: 0.10 },
    { bracket: 'Next', amount: 3166.67, rate: 0.175 },
    { bracket: 'Next', amount: 16000, rate: 0.25 },
    { bracket: 'Next', amount: 30520, rate: 0.30 },
    { bracket: 'Exceeding', amount: 50000, rate: 0.35 }
  ];
}

function calculatePAYE(taxableIncome) {
  const brackets = getTaxBrackets();
  let remainingIncome = taxableIncome;
  let totalTax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    if (remainingIncome <= 0) break;
    if (i === brackets.length - 1) {
      totalTax += remainingIncome * bracket.rate;
      break;
    } else {
      const taxableInThisBracket = Math.min(remainingIncome, bracket.amount);
      totalTax += taxableInThisBracket * bracket.rate;
      remainingIncome -= taxableInThisBracket;
    }
  }

  return roundToTwo(totalTax);
}

/**
 * computePayrollRow - client-side mirror of server compute
 * opts: { basicSalary, allowances (array), employeePFpct, employerPFpct, reliefAmount, loanMonthly, pfChecked }
 */
function computePayrollRow(opts = {}) {
  const basicSalary = parseFloat(opts.basicSalary || 0) || 0;
  const allowances = Array.isArray(opts.allowances) ? opts.allowances : [];
  const employeePFpct = parseFloat(opts.employeePFpct || 5.5) || 0;
  const employerPFpct = parseFloat(opts.employerPFpct || 5) || 0;
  const reliefAmount = parseFloat(opts.reliefAmount || 0) || 0;
  const loanMonthly = parseFloat(opts.loanMonthly || 0) || 0;
  const pfChecked = !!opts.pfChecked;

  const totalAllowances = roundToTwo(allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0));
  const grossSalary = roundToTwo(basicSalary + totalAllowances);

  const employeePension = roundToTwo(grossSalary * 0.055);
  const employeePf = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
  const taxRelief = roundToTwo(reliefAmount || 0);
  const totalDeductionsBeforeTax = roundToTwo(employeePension + employeePf + taxRelief);
  const taxableAmount = Math.max(0, roundToTwo(grossSalary - totalDeductionsBeforeTax));
  const paye = calculatePAYE(taxableAmount);
  const netPay = roundToTwo(taxableAmount - paye);
  const loanMonthlyAmount = roundToTwo(loanMonthly || 0);
  const takeHomePay = roundToTwo(netPay - loanMonthlyAmount);
  const employerPension = roundToTwo(grossSalary * 0.13);
  const employerPf = pfChecked ? roundToTwo(basicSalary * (employerPFpct / 100)) : 0;

  return {
    totalAllowances,
    grossSalary,
    employeePension,
    employeePf,
    taxRelief,
    totalDeductionsBeforeTax,
    taxableAmount,
    paye,
    netPay,
    loanMonthly: loanMonthlyAmount,
    takeHomePay,
    employerPension,
    employerPf
  };
}

/* ===========================
   UI Helpers - Confirm modal (self-contained)
   =========================== */

/**
 * showConfirmModal(title, message, onConfirm, onCancel)
 * Creates a modal once and reuses it.
 */
function showConfirmModal(title, message, onConfirm, onCancel) {
  let modal = document.getElementById('confirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-modal-content">
        <div class="confirm-modal-header">
          <h3 id="confirmModalTitle">Confirm</h3>
          <button class="confirm-modal-close" id="confirmModalClose">&times;</button>
        </div>
        <div class="confirm-modal-body" id="confirmModalBody">Are you sure?</div>
        <div class="confirm-modal-footer">
          <button class="btn-secondary" id="confirmCancelBtn">Cancel</button>
          <button class="btn-primary" id="confirmOkBtn">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // styles (only once)
    if (!document.getElementById('confirmModalStyles')) {
      const styles = document.createElement('style');
      styles.id = 'confirmModalStyles';
      styles.textContent = `
        .confirm-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26,32,44,0.55);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 20px;
        }
        .confirm-modal.show { display: flex; }
        .confirm-modal-content { background:#fff; border-radius:12px; width:100%; max-width:480px; box-shadow:0 20px 60px rgba(0,0,0,0.15); overflow:hidden; display:flex; flex-direction:column; }
        .confirm-modal-header { padding:12px 16px; border-bottom:1px solid #edf2f7; display:flex; justify-content:space-between; align-items:center; background:#fafbfc; }
        .confirm-modal-header h3 { margin:0; font-size:16px; font-weight:600; color:#1a202c; }
        .confirm-modal-close { background:none; border:none; font-size:22px; color:#a0aec0; cursor:pointer; }
        .confirm-modal-body { padding:20px; font-size:14px; color:#2d3748; }
        .confirm-modal-footer { padding:12px 16px; border-top:1px solid #edf2f7; display:flex; justify-content:flex-end; gap:10px; background:#fafbfc; }
      `;
      document.head.appendChild(styles);
    }

    // event delegation
    modal.querySelector('#confirmOkBtn').addEventListener('click', function () {
      closeConfirmModal();
      if (typeof modal._onConfirm === 'function') modal._onConfirm();
    });
    modal.querySelector('#confirmCancelBtn').addEventListener('click', function () {
      closeConfirmModal();
      if (typeof modal._onCancel === 'function') modal._onCancel();
    });
    modal.querySelector('#confirmModalClose').addEventListener('click', function () {
      closeConfirmModal();
      if (typeof modal._onCancel === 'function') modal._onCancel();
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeConfirmModal();
        if (typeof modal._onCancel === 'function') modal._onCancel();
      }
    });
  }

  modal.querySelector('#confirmModalTitle').textContent = title || 'Confirm';
  modal.querySelector('#confirmModalBody').innerHTML = message || 'Are you sure?';
  modal._onConfirm = onConfirm || function(){};
  modal._onCancel = onCancel || function(){};
  modal.classList.add('show');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('show');
}

/* ===========================
   Small UI utilities
   =========================== */

function formatMoney(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.00';
  return n.toFixed(2);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`]/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
  }[s]));
}

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
  toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

/* ===========================
   Exports
   =========================== */

window.initPayroll = initPayroll;
window.processPayrollPreview = processPayrollPreview;
window.processPayroll = processPayroll;
window.loadPayrollPeriod = onPeriodChange;
window.deletePayrollPeriod = deletePayrollPeriod;
window.printPayroll = printPayroll;
window.renderPayrollTable = renderPayrollTable;
