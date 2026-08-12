/**
 * Payroll Module - Client Side Logic (updated)
 * - Adds "Process Payroll" (load active employees preview) before Run Payroll
 * - Defaults month to current month but DOES NOT auto-load table
 * - If a saved payroll run exists for the selected month: show Print & Delete only
 * - If no saved payroll run: show Process & Run buttons
 * - Run Payroll saves payroll rows and summary (server-side)
 * - Process Payroll only loads active employees payroll details into table (preview)
 */

let currentPayrollData = [];
let currentPeriod = '';
let currentRunId = null;

/* ============== Initialization ============== */

function initPayroll() {
  currentPayrollData = [];
  currentRunId = null;

  // Set pay period to current month by default (YYYY-MM) but do not auto load
  const periodInput = document.getElementById('payPeriodSelect');
  if (periodInput) {
    periodInput.value = formatMonthForInput(new Date());
  }

  // Rebuild the payroll-controls toolbar so we have stable element IDs
  buildPayrollToolbar();

  // Check if there's a saved run for the default period and update UI accordingly
  const period = periodInput ? periodInput.value : '';
  if (period) {
    checkForSavedRun(period);
  } else {
    setButtonsState({ saved: false });
    renderPayrollTable([], false);
  }
}

/* ============== Build toolbar dynamically (ensures IDs exist) ============== */

function buildPayrollToolbar() {
  const controls = document.querySelector('.payroll-controls');
  if (!controls) return;

  controls.innerHTML = `
    <button class="btn-secondary" id="btnProcessPayroll" title="Load active employees payroll preview">
      <i class="fas fa-download"></i> Process Payroll
    </button>
    <button class="btn-primary" id="btnRunPayroll" title="Save payroll run">
      <i class="fas fa-play"></i> Run Payroll
    </button>
    <button class="btn-outline" id="btnPrintPayroll" style="display:none;">
      <i class="fas fa-print"></i> Print
    </button>
    <button class="btn-danger" id="btnDeletePayroll" style="display:none;">
      <i class="fas fa-times"></i>
    </button>
    <label for="payPeriodSelect" style="font-size:12px; font-weight:500; color:#4a5568; margin-left:8px;">Period:</label>
  `;

  // attach event listeners
  const processBtn = document.getElementById('btnProcessPayroll');
  const runBtn = document.getElementById('btnRunPayroll');
  const printBtn = document.getElementById('btnPrintPayroll');
  const deleteBtn = document.getElementById('btnDeletePayroll');
  const periodInput = document.getElementById('payPeriodSelect');

  if (processBtn) processBtn.addEventListener('click', () => onProcessPayrollClick());
  if (runBtn) runBtn.addEventListener('click', () => onRunPayrollClick());
  if (printBtn) printBtn.addEventListener('click', () => printPayroll());
  if (deleteBtn) deleteBtn.addEventListener('click', () => onDeletePayrollClick());
  if (periodInput) periodInput.addEventListener('change', () => onPeriodChange());
}

/* ============== Button state management ==============
   options: { saved: boolean, runId: string|null } */

function setButtonsState(options) {
  const saved = !!options && !!options.saved;
  const runId = options && options.runId ? options.runId : null;
  currentRunId = runId;

  const processBtn = document.getElementById('btnProcessPayroll');
  const runBtn = document.getElementById('btnRunPayroll');
  const printBtn = document.getElementById('btnPrintPayroll');
  const deleteBtn = document.getElementById('btnDeletePayroll');

  if (saved) {
    // Show only Print + Delete
    if (processBtn) processBtn.style.display = 'none';
    if (runBtn) runBtn.style.display = 'none';
    if (printBtn) printBtn.style.display = 'inline-flex';
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  } else {
    // Show only Process + Run
    if (processBtn) processBtn.style.display = 'inline-flex';
    if (runBtn) runBtn.style.display = 'inline-flex';
    if (printBtn) printBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
}

/* ============== Event handlers ============== */

function onPeriodChange() {
  const period = document.getElementById('payPeriodSelect')?.value || '';
  currentPeriod = period;
  currentRunId = null;
  // Check if saved run exists for this period
  if (period) {
    checkForSavedRun(period);
  } else {
    setButtonsState({ saved: false });
    renderPayrollTable([], false);
  }
}

async function onProcessPayrollClick() {
  const period = document.getElementById('payPeriodSelect')?.value || '';
  if (!period) {
    showToast('Please select a pay period first', 'warning');
    return;
  }
  await processPayrollLoad(period);
}

async function onRunPayrollClick() {
  // Use existing processPayroll flow (confirmation + save)
  await processPayroll();
}

async function onDeletePayrollClick() {
  // Delete by currentRunId if present; else try to find runId from saved data
  let runId = currentRunId;
  if (!runId && currentPeriod) {
    const summ = await API.getPayrollRunSummary(currentPeriod).catch(()=>null);
    runId = summ && summ.runId ? summ.runId : null;
  }
  if (!runId) {
    showToast('No payroll run selected to delete', 'warning');
    return;
  }

  showConfirmModal(
    'Confirm Delete',
    `Are you sure you want to delete payroll run <strong>${runId}</strong> for period <strong>${currentPeriod}</strong>? This cannot be undone.`,
    async function() {
      try {
        showLoadingModal('Deleting payroll run...');
        const resp = await API.deletePayrollRun(runId);
        if (resp && resp.success) {
          showToast(`Deleted payroll run ${runId}`, 'success');
          currentPayrollData = [];
          currentRunId = null;
          setButtonsState({ saved: false });
          renderPayrollTable([], false);
        } else {
          showToast(resp && resp.error ? resp.error : 'Failed to delete payroll run', 'error');
        }
      } catch (err) {
        console.error('Delete run error', err);
        showToast('Failed to delete payroll run', 'error');
      } finally {
        hideLoadingModal();
        closeConfirmModal();
      }
    },
    function() {
      closeConfirmModal();
    }
  );
}

/* ============== Check for saved run and load if exists ============== */

async function checkForSavedRun(period) {
  try {
    showLoadingModal('Checking saved payroll run...');
    currentPeriod = period;
    const summary = await API.getPayrollRunSummary(period).catch(()=>null);
    if (summary && summary.runId) {
      // Load saved payroll for this period
      const runId = summary.runId;
      const records = await API.getPayrollRunsByRunId(runId).catch(()=>[]);
      if (Array.isArray(records) && records.length > 0) {
        currentPayrollData = records;
        currentRunId = runId;
        renderPayrollTable(records, true);
        setButtonsState({ saved: true, runId: runId });
        showToast(`Loaded saved payroll (${runId}) for ${period}`, 'success');
        return;
      }
    }

    // No saved run
    currentPayrollData = [];
    currentRunId = null;
    renderPayrollTable([], false);
    setButtonsState({ saved: false });
  } catch (err) {
    console.error('Error checking saved run', err);
    showToast('Error checking saved payroll run', 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Process Payroll (LOAD only, not save) ============== */

async function processPayrollLoad(period) {
  try {
    if (!period) {
      showToast('Please select a pay period first', 'warning');
      return;
    }
    showLoadingModal('Loading employees for payroll preview...');

    // fetch employees
    const resp = await API.getEmployees().catch(()=>[]);
    const serverRecords = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp || []);
    if (!serverRecords || serverRecords.length === 0) {
      currentPayrollData = [];
      renderPayrollTable([], false);
      showToast('No employees found', 'warning');
      return;
    }

    const payrollData = [];
    for (const emp of serverRecords) {
      const staffNumber = emp['Staff Number'] || emp.staff || '';
      if (!staffNumber) continue;

      const status = (emp['Status'] || emp.status || '').toString().trim().toLowerCase();
      if (status && status !== 'active') continue; // only active employees for preview

      const fullName = emp['Full Name'] || emp.name || '';
      const designation = emp['Designation'] || emp.designation || '';
      const basicSalary = parseFloat(emp['Basic Salary'] || emp.basicSalary || 0) || 0;
      const employeePFrate = parseFloat(emp['Employee PF Rate (%)'] || emp.employeePFrate || 0) || 0;
      const employerPFrate = parseFloat(emp['Employer PF Rate (%)'] || emp.employerPfrate || emp.employerPFrate || 0) || 0;
      const taxRelief = parseFloat(emp['Tax Relief'] || emp.taxRelief || 0) || 0;
      const loanMonthly = parseFloat(emp['Monthly Loan'] || emp.loanMonthly || 0) || 0;

      // load allowances for staff (latest <= period start)
      let allowances = [];
      try {
        const all = await API.getAllowancesByStaff(staffNumber).catch(()=>[]);
        allowances = Array.isArray(all) ? all : (all && all.records) ? all.records : [];
        // keep allowances with effectiveDate <= period start, choose latest per type
        const asOf = new Date(period + '-01');
        const chosen = {};
        for (let a of allowances) {
          const eff = a.effectiveDate ? new Date(a.effectiveDate) : null;
          if (!eff || eff <= asOf) {
            if (!chosen[a.type]) chosen[a.type] = a;
          }
        }
        allowances = Object.keys(chosen).map(t => chosen[t]);
      } catch (e) {
        allowances = [];
      }

      const calc = computePayrollRow({
        basicSalary: basicSalary,
        allowances: allowances,
        employeePFpct: employeePFrate || 5.5,
        employerPFpct: employerPFrate || 5,
        reliefAmount: taxRelief,
        loanMonthly: loanMonthly,
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
    currentPeriod = period;
    currentRunId = null;
    renderPayrollTable(payrollData, false);
    setButtonsState({ saved: false });
    showToast(`Loaded payroll preview for ${period} (${payrollData.length} employees)`, 'info');
  } catch (err) {
    console.error('Error loading payroll preview', err);
    showToast('Failed to load payroll preview', 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Process / Run Payroll (SAVE) ============== */

async function processPayroll() {
  const periodInput = document.getElementById('payPeriodSelect');
  if (!periodInput) return;

  const period = periodInput.value;
  if (!period) {
    showToast('Please select a pay period first', 'warning');
    periodInput.focus();
    return;
  }

  // If no preview loaded, run a preview load first
  if (!currentPayrollData || currentPayrollData.length === 0) {
    // load preview (active employees)
    await processPayrollLoad(period);
    if (!currentPayrollData || currentPayrollData.length === 0) {
      showToast('No payroll data to save', 'warning');
      return;
    }
  }

  showConfirmModal(
    'Confirm Payroll Processing',
    `Are you sure you want to save payroll for <strong>${period}</strong>?<br><br>This will save the current payroll calculations to the sheet.`,
    async function() {
      try {
        showLoadingModal('Saving payroll...');
        let savedCount = 0;
        let runId = null;

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
            if (!runId && response.runId) runId = response.runId;
          } else {
            console.warn('Failed to save payroll row', record, response);
          }
        }

        if (savedCount > 0) {
          showToast(`Payroll saved successfully for ${period} (${savedCount} records)`, 'success');
          // After saving, reload saved run to ensure we show Print/Delete
          await checkForSavedRun(period);
        } else {
          showToast('Failed to save payroll records', 'error');
        }
      } catch (error) {
        console.error('Error saving payroll:', error);
        showToast('Failed to save payroll: ' + (error.message || error), 'error');
      } finally {
        hideLoadingModal();
        closeConfirmModal();
      }
    },
    function() {
      closeConfirmModal();
    }
  );
}

/* ============== Delete Payroll Period (kept for direct action) ============== */

async function deletePayrollPeriod() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('No period selected', 'warning');
    return;
  }

  // find runId for this period
  const summary = await API.getPayrollRunSummary(period).catch(()=>null);
  const runId = summary && summary.runId ? summary.runId : null;
  if (!runId) {
    showToast('No saved run found for this period', 'info');
    return;
  }

  showConfirmModal(
    'Confirm Delete',
    `Are you sure you want to delete all payroll records for <strong>${period}</strong>?<br><br>This action cannot be undone.`,
    async function() {
      try {
        showLoadingModal('Deleting payroll records...');
        const response = await API.deletePayrollRun(runId);
        if (response && response.success) {
          showToast(`Deleted payroll records for ${period}`, 'success');
          currentPayrollData = [];
          currentRunId = null;
          setButtonsState({ saved: false });
          renderPayrollTable([], false);
        } else {
          showToast(response?.error || 'Failed to delete payroll', 'error');
        }
      } catch (error) {
        console.error('Error deleting payroll:', error);
        showToast('Failed to delete payroll: ' + error.message, 'error');
      } finally {
        hideLoadingModal();
        closeConfirmModal();
      }
    },
    function() {
      closeConfirmModal();
    }
  );
}

/* ============== Render Payroll Table - COMPACT WITH ORIGINAL NAMES ============== */

function renderPayrollTable(data, isSaved = false) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="16" class="payroll-table-empty">
          <i class="fas fa-money-check-alt"></i>
          <p>No payroll data</p>
          <span class="sub-text">${isSaved ? 'No saved records for this period' : 'Select a pay period and click "Process Payroll" to load employees'}</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((record) => {
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

    // Helper to format number with dash for zero
    const formatCell = (value) => {
      if (value === 0 || value === '0' || isNaN(value) || value === '') {
        return '<span class="zero">—</span>';
      }
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

/* ============== Print Function ============== */

function printPayroll() {
  // Use existing print function or printUtils if available
  window.print();
}

/* ============== Payroll Calculation Helpers ============== */
/* computePayrollRow, calculatePAYE, getTaxBrackets, roundToTwo remain unchanged and are used above.
   If these helper functions are already declared elsewhere in the app (they are in the previous file),
   the functions below won't overwrite them. If missing, the earlier versions should be present.
*/

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
    const bracketAmount = bracket.amount;
    const bracketRate = bracket.rate;

    if (remainingIncome <= 0) break;

    if (i === brackets.length - 1) {
      totalTax += remainingIncome * bracketRate;
      break;
    } else {
      const taxableInThisBracket = Math.min(remainingIncome, bracketAmount);
      totalTax += taxableInThisBracket * bracketRate;
      remainingIncome -= taxableInThisBracket;
    }
  }

  return roundToTwo(totalTax);
}

function computePayrollRow({ basicSalary = 0, allowances = [], employeePFpct = 5.5, employerPFpct = 5, reliefAmount = 0, loanMonthly = 0, pfChecked = true }) {
  const totalAllowances = roundToTwo(allowances.reduce((s,a) => s + (parseFloat(a.amount) || 0), 0));
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

function formatMonthForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
