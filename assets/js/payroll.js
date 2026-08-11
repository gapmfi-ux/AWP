/**
 * Payroll Module - Client Side Logic (updated)
 * - New "Process Payroll" (preview) behaviour
 * - Default month is current month (no auto preview)
 * - Button visibility toggles based on saved run existence
 */

let currentPayrollData = [];
let currentPeriod = '';
let currentRunId = null; // when loaded from saved run

/* ============== Initialization ============== */

function initPayroll() {
  currentPayrollData = [];
  currentPeriod = '';
  currentRunId = null;

  const periodInput = document.getElementById('payPeriodSelect');
  if (periodInput) {
    periodInput.value = getCurrentMonthValue(); // default to current month
  }

  // Setup initial button state (no auto-loading)
  toggleActionButtons(false);
  // Check if there's an existing run for the default month and update UI (but do not auto load preview)
  const defaultPeriod = document.getElementById('payPeriodSelect')?.value;
  if (defaultPeriod) {
    checkPayrollExistsAndToggle(defaultPeriod);
  }
}

/* ============== Helpers ============== */

function getCurrentMonthValue() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}`;
}

function onPeriodChange() {
  const period = document.getElementById('payPeriodSelect')?.value;
  currentPeriod = period || '';
  // Check whether a saved run exists for this period and toggle buttons accordingly
  if (currentPeriod) {
    checkPayrollExistsAndToggle(currentPeriod);
  } else {
    toggleActionButtons(false);
    currentPayrollData = [];
    currentRunId = null;
    renderPayrollTable([]);
  }
}

/* Toggle action buttons:
   showProcessRun = true => show Process + Run buttons
   showProcessRun = false => show Print + Delete (means saved run exists)
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

/* ============== Check whether a payroll run exists for a period ============== */

async function checkPayrollExistsAndToggle(period) {
  try {
    showLoadingModal('Checking payroll run...');
    const records = await API.getPayrollRunsByPeriod(period);
    if (records && Array.isArray(records) && records.length > 0) {
      // There is a saved run for this period
      currentPayrollData = records;
      // Link to runId (take first row's Run ID)
      const runId = records[0]['Run ID'] || records[0].runId || null;
      currentRunId = runId;
      renderPayrollTable(records, false);
      toggleActionButtons(false); // show print + delete
      showToast(`Loaded saved payroll for ${period}`, 'info');
    } else {
      // No saved run
      currentPayrollData = [];
      currentRunId = null;
      renderPayrollTable([], true);
      toggleActionButtons(true); // show process + run
    }
  } catch (err) {
    console.error('Error checking payroll run', err);
    showToast('Failed to check payroll run', 'error');
    toggleActionButtons(true);
  } finally {
    hideLoadingModal();
  }
}

/* ============== Process Payroll (Preview) - load active employees into table ============== */

async function processPayrollPreview() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('Select a pay period first', 'warning');
    return;
  }
  currentPeriod = period;
  try {
    showLoadingModal('Processing payroll preview...');
    // Get employees from server
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
      // Only include active employees (status column usually 'Active')
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
    currentRunId = null; // preview not saved yet
    renderPayrollTable(payrollData, true);
    // After preview, keep Process + Run visible and Print/Delete hidden
    toggleActionButtons(true);
    showToast('Payroll preview ready. Click Run Payroll to save.', 'success');
  } catch (error) {
    console.error('Error processing payroll preview:', error);
    showToast('Failed to process payroll preview', 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Run Payroll (save) ============== */

async function processPayroll() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('Please select a pay period first', 'warning');
    return;
  }

  // Ensure we have payroll data: if currentPayrollData empty, compute on-the-fly and save
  if (!currentPayrollData || currentPayrollData.length === 0) {
    // No preview present — compute and then save
    showToast('No preview found — computing payroll then saving...', 'info');
    await processPayrollPreview();
    // If still empty after preview, abort
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
        showLoadingModal('Saving payroll...');
        let savedCount = 0;
        // Each record should be saved via API.savePayrollRun
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
            // capture runId returned on first save
            if (!currentRunId && response.runId) currentRunId = response.runId;
          } else {
            console.warn('Failed saving payroll record for', payrollData.staffNumber, response);
          }
        }

        if (savedCount > 0) {
          showToast(`Payroll saved for ${period} (${savedCount} records)`, 'success');
          // After saving, switch UI to show Print/Delete
          toggleActionButtons(false);
          // reload saved run rows (ensures we show what actually exists on sheet)
          await checkPayrollExistsAndToggle(period);
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
    function onCancel() {
      closeConfirmModal();
    }
  );
}

/* ============== Delete Payroll Period (unchanged except UI sync) ============== */

async function deletePayrollPeriod() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('No period selected', 'warning');
    return;
  }

  showConfirmModal(
    'Confirm Delete',
    `Are you sure you want to delete all payroll records for <strong>${period}</strong>?<br><br>This action cannot be undone.`,
    async function onConfirm() {
      try {
        showLoadingModal('Deleting payroll records...');
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
            // switch UI back to process/run
            toggleActionButtons(true);
            renderPayrollTable([], true);
          } else {
            showToast(response?.error || 'Failed to delete payroll', 'error');
          }
        } else {
          showToast('Could not find Run ID for this period', 'error');
        }
      } catch (error) {
        console.error('Error deleting payroll:', error);
        showToast('Failed to delete payroll: ' + (error.message || error), 'error');
      } finally {
        hideLoadingModal();
        closeConfirmModal();
      }
    },
    function onCancel() {
      closeConfirmModal();
    }
  );
}

/* ============== Render Payroll Table ============== */

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

/* ============== Print & util helpers ============== */

function printPayroll() {
  window.print();
}

function roundToTwo(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

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

/* Exported functions */
window.initPayroll = initPayroll;
window.processPayrollPreview = processPayrollPreview;
window.processPayroll = processPayroll;
window.loadPayrollPeriod = onPeriodChange;
window.deletePayrollPeriod = deletePayrollPeriod;
window.printPayroll = printPayroll;
