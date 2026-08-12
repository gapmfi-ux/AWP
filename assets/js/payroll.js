/**
 * payroll.js - Updated UI flow (month modal)
 *
 * - No persistent month selector in header.
 * - Process opens a month modal; selecting a month runs preview for active employees.
 * - View opens same modal; selecting a month attempts to load saved payroll for that month.
 * - Header shows selected period automatically after selection.
 * - Run Payroll saves the current preview (unchanged semantics).
 */

let currentPayrollData = [];
let currentPeriod = '';        // 'YYYY-MM'
let currentRunId = null;       // populated if a saved run is loaded
let monthModalMode = null;     // 'process' or 'view'

/* ===========================
   Initialization
   =========================== */

function initPayroll() {
  currentPayrollData = [];
  currentPeriod = '';
  currentRunId = null;
  monthModalMode = null;

  // Set heading period text
  updateHeaderPeriodLabel();

  // Default buttons: show Process/Run (no saved run)
  toggleActionButtons(false);

  // Pre-fill modal input with current month for convenience
  const input = document.getElementById('monthModalInput');
  if (input) input.value = getCurrentMonthValue();
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

function formatDisplayMonth(yyyymm) {
  if (!yyyymm) return '(No period selected)';
  try {
    const parts = yyyymm.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  } catch (e) {
    return yyyymm;
  }
}

function updateHeaderPeriodLabel() {
  const el = document.getElementById('payrollPeriodLabel');
  if (!el) return;
  if (currentPeriod) {
    el.textContent = formatDisplayMonth(currentPeriod);
  } else {
    el.textContent = '(No period selected)';
  }
}

/* Toggle action buttons:
   When saved run exists for the selected period, show Print/Delete.
   Otherwise show Process/Run.
   Pass showProcessRun = true to show Process+Run, false to show Print+Delete.
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
   Month Modal (used by both Process and View)
   =========================== */

function showMonthModal(mode) {
  // mode: 'process' or 'view'
  monthModalMode = mode === 'view' ? 'view' : 'process';
  const modal = document.getElementById('monthModal');
  const title = document.getElementById('monthModalTitle');
  const input = document.getElementById('monthModalInput');

  if (!modal || !input || !title) return;

  if (!input.value) input.value = getCurrentMonthValue();
  title.innerHTML = (monthModalMode === 'view' ? '<i class="fas fa-eye"></i> Select Month to View' : '<i class="fas fa-cogs"></i> Select Month to Process');
  modal.style.display = 'flex';
  modal.classList.add('show');
  setTimeout(() => input.focus(), 80);
}

function closeMonthModal() {
  const modal = document.getElementById('monthModal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.classList.remove('show');
  monthModalMode = null;
}

async function onMonthModalOk() {
  const input = document.getElementById('monthModalInput');
  if (!input) return;
  const selected = input.value;
  if (!selected || !/^\d{4}-\d{2}$/.test(selected)) {
    showToast('Please choose a valid month', 'warning');
    return;
  }
  // set currentPeriod and update header
  currentPeriod = selected;
  updateHeaderPeriodLabel();
  closeMonthModal();

  if (monthModalMode === 'view') {
    // Load saved run for this period (if exists)
    await checkPayrollExistsAndToggle(currentPeriod);
  } else {
    // Process payroll preview for this period (active employees)
    await processPayrollPreviewForPeriod(currentPeriod);
  }
}

/* ===========================
   Check saved run & toggle buttons
   =========================== */

async function checkPayrollExistsAndToggle(period) {
  try {
    showLoadingModal && showLoadingModal('Checking saved payroll...');
    const records = await API.getPayrollRunsByPeriod(period).catch(() => []);
    if (records && Array.isArray(records) && records.length > 0) {
      currentPayrollData = records;
      currentRunId = records[0]['Run ID'] || records[0].runId || null;
      renderPayrollTable(records, false);
      toggleActionButtons(false); // show Print/Delete
      showToast(`Loaded saved payroll for ${formatDisplayMonth(period)}`, 'info');
    } else {
      currentPayrollData = [];
      currentRunId = null;
      renderPayrollTable([], true);
      toggleActionButtons(true); // show Process + Run
      showToast(`No saved payroll found for ${formatDisplayMonth(period)}. Use Process to generate preview.`, 'info');
    }
  } catch (err) {
    console.error('checkPayrollExistsAndToggle error', err);
    showToast('Failed to load saved payroll', 'error');
    toggleActionButtons(true);
  } finally {
    hideLoadingModal && hideLoadingModal();
  }
}

/* ===========================
   Process Payroll Preview (for chosen period)
   =========================== */

async function processPayrollPreviewForPeriod(period) {
  if (!period) {
    showToast('No period selected', 'warning');
    return;
  }

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
    currentRunId = null;
    renderPayrollTable(payrollData, true);
    toggleActionButtons(true); // show Process + Run
    showToast(`Payroll preview generated for ${formatDisplayMonth(period)}`, 'success');
  } catch (err) {
    console.error('processPayrollPreviewForPeriod error', err);
    showToast('Failed to generate payroll preview', 'error');
  } finally {
    hideLoadingModal && hideLoadingModal();
  }
}

/* ===========================
   Save / Run Payroll (unchanged semantics)
   =========================== */

async function processPayroll() {
  if (!currentPeriod) {
    showToast('No period selected — click Process to choose a month', 'warning');
    return;
  }

  if (!currentPayrollData || currentPayrollData.length === 0) {
    showToast('No preview available — generating preview now', 'info');
    await processPayrollPreviewForPeriod(currentPeriod);
    if (!currentPayrollData || currentPayrollData.length === 0) {
      showToast('No payroll records to save', 'warning');
      return;
    }
  }

  showConfirmModal(
    'Confirm Payroll Processing',
    `Save payroll for <strong>${formatDisplayMonth(currentPeriod)}</strong>?`,
    async function onConfirm() {
      try {
        showLoadingModal && showLoadingModal('Saving payroll...');
        let savedCount = 0;
        for (const record of currentPayrollData) {
          const payrollData = {
            staffNumber: record['Staff Number'] || record.staffNumber || '',
            fullName: record['Full Name'] || record.fullName || '',
            designation: record['Designation'] || record.designation || '',
            payPeriod: currentPeriod,
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
          }
        }

        if (savedCount > 0) {
          showToast(`Payroll saved for ${formatDisplayMonth(currentPeriod)} (${savedCount} records)`, 'success');
          await checkPayrollExistsAndToggle(currentPeriod);
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
    function onCancel(){
      closeConfirmModal();
    }
  );
}

/* ===========================
   Delete Payroll Period
   =========================== */

async function deletePayrollPeriod() {
  if (!currentPeriod) {
    showToast('No period selected', 'warning');
    return;
  }

  showConfirmModal(
    'Confirm Delete',
    `Delete all payroll records for <strong>${formatDisplayMonth(currentPeriod)}</strong>? This cannot be undone.`,
    async function onConfirm() {
      try {
        showLoadingModal && showLoadingModal('Deleting payroll records...');
        const records = await API.getPayrollRunsByPeriod(currentPeriod);
        if (!records || records.length === 0) {
          showToast('No records found for this period', 'info');
          closeConfirmModal();
          return;
        }

        const runId = records[0]['Run ID'] || records[0].runId;
        if (runId) {
          const response = await API.deletePayrollRun(runId);
          if (response && response.success) {
            showToast(`Deleted payroll records for ${formatDisplayMonth(currentPeriod)}`, 'success');
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
    function onCancel(){
      closeConfirmModal();
    }
  );
}

/* ===========================
   Render table + helpers
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
          <span class="sub-text">${isPreview ? 'Click Process Payroll to generate preview' : 'Select View and choose a month'}</span>
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
   Compute helpers (client-side mirror)
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
   Confirm modal (local)
   =========================== */

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

    const close = () => { modal.classList.remove('show'); };
    modal.querySelector('#confirmOkBtn').addEventListener('click', function(){ close(); if (typeof modal._onConfirm === 'function') modal._onConfirm(); });
    modal.querySelector('#confirmCancelBtn').addEventListener('click', function(){ close(); if (typeof modal._onCancel === 'function') modal._onCancel(); });
    modal.querySelector('#confirmModalClose').addEventListener('click', function(){ close(); if (typeof modal._onCancel === 'function') modal._onCancel(); });
    modal.addEventListener('click', function(e){ if (e.target === modal) { close(); if (typeof modal._onCancel === 'function') modal._onCancel(); }});
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
   Utilities: toast, format
   =========================== */

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

/* ===========================
   Exports used by main app
   =========================== */

window.initPayroll = initPayroll;
window.processPayrollPreview = processPayrollPreviewForPeriod; // retained name for compatibility (accepts period argument)
window.processPayroll = processPayroll;
window.deletePayrollPeriod = deletePayrollPeriod;
window.printPayroll = function(){ window.print(); };
window.renderPayrollTable = renderPayrollTable;
