/**
 * Payroll Module - Client Side Logic
 * Handles payroll processing, loading, and display
 */

let currentPayrollData = [];
let currentPeriod = '';
let currentPayrollSaved = false; // indicates whether the currently displayed payroll is a saved run

/* ============== Initialization ============== */

function initPayroll() {
  currentPeriod = '';
  currentPayrollSaved = false;
  const periodInput = document.getElementById('payPeriodSelect');
  if (periodInput) {
    periodInput.value = '';
  }

  // Hide delete button by default (it should only show for saved runs)
  const deleteBtn = document.getElementById('deletePayrollBtn');
  if (deleteBtn) deleteBtn.style.display = 'none';

  loadPayrollPreview();
}

/* ============== Helpers ============== */

function formatPeriodLabel(period) {
  // Accepts "YYYY-MM" and returns "MonthName YYYY", otherwise returns input
  if (!period) return '';
  const m = /^\d{4}-\d{2}$/.exec(period);
  if (m) {
    const [y, mo] = period.split('-').map(s => parseInt(s, 10));
    const d = new Date(y, mo - 1, 1);
    try {
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
      return `${mo}/${y}`;
    }
  }
  return period;
}

/* ============== Load Payroll Preview (calculated figures) ============== */

async function loadPayrollPreview() {
  try {
    showLoadingModal('Loading payroll preview...');

    // Normalize API.getEmployees response similar to employee-list getEmployeesFromServer
    const resp = await API.getEmployees().catch(() => []);
    const serverRecords = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp || []);

    if (!serverRecords || serverRecords.length === 0) {
      currentPayrollData = [];
      renderPayrollTable([]);
      showToast('No employees found. Add employees first.', 'warning');
      currentPayrollSaved = false;
      // Hide delete button when showing preview
      const deleteBtn = document.getElementById('deletePayrollBtn');
      if (deleteBtn) deleteBtn.style.display = 'none';
      hideLoadingModal();
      return;
    }

    const payrollData = [];

    for (const emp of serverRecords) {
      const staffNumber = emp['Staff Number'] || emp.staff || '';
      const fullName = emp['Full Name'] || emp.name || '';
      const designation = emp['Designation'] || emp.designation || '';
      const basicSalary = parseFloat(emp['Basic Salary'] || emp.basicSalary || 0) || 0;
      const employeePFrate = parseFloat(emp['Employee PF Rate (%)'] || emp.employeePFrate || 0) || 0;
      const employerPFrate = parseFloat(emp['Employer PF Rate (%)'] || emp.employerPFrate || 0) || 0;
      const taxRelief = parseFloat(emp['Tax Relief Amount'] || emp.taxRelief || 0) || 0;

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
        loanMonthly: 0,
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
        'Total Deduction': calc.totalDeduction || (calc.employeePension + calc.employeePf + calc.paye) || 0,
        'Net Pay': calc.netPay,
        'Employer Pension (13%)': calc.employerPension,
        'Employer PF': calc.employerPf,
        'Monthly Loan': 0,
        'Allowances': allowances
      });
    }

    currentPayrollData = payrollData;
    renderPayrollTable(payrollData, true);
    showToast('Showing calculated payroll preview', 'info');
    currentPayrollSaved = false;
    const deleteBtn = document.getElementById('deletePayrollBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';

  } catch (error) {
    console.error('Error loading payroll preview:', error);
    showToast('Failed to load payroll preview', 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Load Payroll Period (on period change) ============== */

async function loadPayrollPeriod() {
  const periodInput = document.getElementById('payPeriodSelect');
  if (!periodInput) return;

  const period = periodInput.value;

  if (!period) {
    currentPeriod = '';
    await loadPayrollPreview();
    return;
  }

  currentPeriod = period;

  try {
    showLoadingModal('Loading payroll data...');
    const response = await API.getPayrollRunsByPeriod(period);

    if (response && Array.isArray(response) && response.length > 0) {
      currentPayrollData = response;
      renderPayrollTable(response, false);
      const label = formatPeriodLabel(period);
      showToast(`Payroll for ${label} loaded`, 'success');

      currentPayrollSaved = true;
      const deleteBtn = document.getElementById('deletePayrollBtn');
      if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
      const label = formatPeriodLabel(period);
      showToast(`No saved payroll found for ${label}. Showing calculated preview.`, 'info');
      // fallback: display calculated payroll preview but keep period selected
      await loadPayrollPreview();
      currentPayrollSaved = false;
      const deleteBtn = document.getElementById('deletePayrollBtn');
      if (deleteBtn) deleteBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading payroll:', error);
    showToast('Failed to load payroll data', 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============================================
   CONFIRM MODAL
   ============================================ */

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
          <button class="confirm-modal-close" onclick="closeConfirmModal()">&times;</button>
        </div>
        <div class="confirm-modal-body" id="confirmModalBody">
          Are you sure?
        </div>
        <div class="confirm-modal-footer">
          <button class="btn-secondary" id="confirmCancelBtn">Cancel</button>
          <button class="btn-primary" id="confirmOkBtn">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

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
          background: rgba(26, 32, 44, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 20px;
          animation: modalFadeIn 0.2s ease;
        }
        .confirm-modal.show {
          display: flex;
        }
        .confirm-modal-content {
          background: #ffffff;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
        }
        .confirm-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #edf2f7;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
          background: #fafbfc;
        }
        .confirm-modal-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }
        .confirm-modal-close {
          background: none;
          border: none;
          font-size: 22px;
          color: #a0aec0;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .confirm-modal-close:hover {
          color: #2d3748;
        }
        .confirm-modal-body {
          padding: 24px 20px;
          font-size: 14px;
          color: #2d3748;
          line-height: 1.6;
        }
        .confirm-modal-body strong {
          color: #4361ee;
        }
        .confirm-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #edf2f7;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-shrink: 0;
          background: #fafbfc;
        }
        .confirm-modal-footer .btn-primary,
        .confirm-modal-footer .btn-secondary {
          padding: 8px 24px;
          font-size: 14px;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalBody').innerHTML = message;

  modal._onConfirm = onConfirm || function() {};
  modal._onCancel = onCancel || function() {};

  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const closeBtn = modal.querySelector('.confirm-modal-close');

  // Replace nodes to avoid duplicate listeners
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newCloseBtn = closeBtn.cloneNode(true);

  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

  newOkBtn.addEventListener('click', function() {
    if (modal._onConfirm) modal._onConfirm();
  });

  newCancelBtn.addEventListener('click', function() {
    if (modal._onCancel) modal._onCancel();
  });

  newCloseBtn.addEventListener('click', function() {
    if (modal._onCancel) modal._onCancel();
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      if (modal._onCancel) modal._onCancel();
    }
  });

  modal.classList.add('show');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

/* ============== Process / Run Payroll - SAVE CURRENT TABLE DATA ============== */

async function processPayroll() {
  const periodInput = document.getElementById('payPeriodSelect');
  if (!periodInput) return;

  const period = periodInput.value;
  if (!period) {
    showToast('Please select a pay period first', 'warning');
    periodInput.focus();
    return;
  }

  // Ensure we have currentPayrollData (calculated preview or loaded saved)
  if (!currentPayrollData || currentPayrollData.length === 0) {
    showToast('No payroll data to save. Load employees first.', 'warning');
    return;
  }

  showConfirmModal(
    'Confirm Payroll Processing',
    `Are you sure you want to save payroll for <strong>${formatPeriodLabel(period)}</strong>?<br><br>This will save the current payroll calculations to the sheet.`,
    async function() {
      try {
        showLoadingModal('Saving payroll...');

        // Save each record from current table
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
          }
        }

        if (savedCount > 0) {
          const label = formatPeriodLabel(period);
          showToast(`Payroll run for ${label} saved successfully (${savedCount} records)`, 'success');

          // refresh the payroll period (will show delete button)
          await loadPayrollPeriod();
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

/* ============== Delete Payroll Period ============== */

async function deletePayrollPeriod() {
  const period = document.getElementById('payPeriodSelect')?.value;
  if (!period) {
    showToast('No period selected', 'warning');
    return;
  }

  showConfirmModal(
    'Confirm Delete',
    `Are you sure you want to delete all payroll records for <strong>${formatPeriodLabel(period)}</strong>?<br><br>This action cannot be undone.`,
    async function() {
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
            showToast(`Deleted payroll for ${formatPeriodLabel(period)}`, 'success');
            currentPayrollData = [];
            currentPayrollSaved = false;
            // After deletion show calculated preview
            await loadPayrollPreview();
            // Hide delete button
            const deleteBtn = document.getElementById('deletePayrollBtn');
            if (deleteBtn) deleteBtn.style.display = 'none';
            // Reset period selection (keep the input but allow showing preview)
            // Optionally you can clear selection: document.getElementById('payPeriodSelect').value = '';
          } else {
            showToast(response?.error || 'Failed to delete payroll', 'error');
          }
        } else {
          showToast('Could not determine Run ID for this period', 'error');
        }
      } catch (error) {
        console.error('Error deleting payroll:', error);
        showToast('Failed to delete payroll: ' + (error.message || error), 'error');
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

function renderPayrollTable(data, isPreview = false) {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="16" class="payroll-table-empty">
          <i class="fas fa-money-check-alt"></i>
          <p>No payroll data</p>
          <span class="sub-text">${isPreview ? 'Add employees to see calculated payroll' : 'Run payroll to generate data for this period'}</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((record, index) => {
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
        <td class="col-number positive gross">${formatCell(grossSalary)}</td>
        <td class="col-number">${formatCell(employeePension)}</td>
        <td class="col-number">${formatCell(employeePf)}</td>
        <td class="col-number">${formatCell(taxRelief)}</td>
        <td class="col-number">${formatCell(taxableIncome)}</td>
        <td class="col-number negative">${formatCell(paye)}</td>
        <td class="col-number negative">${formatCell(totalDeduction)}</td>
        <td class="col-number positive net">${formatCell(netPay)}</td>
        <td class="col-number">${formatCell(employerPension)}</td>
        <td class="col-number">${formatCell(employerPf)}</td>
        <td class="col-number">${formatCell(loanMonthly)}</td>
      </tr>
    `;
  }).join('');
}

/* ============== Print Function ============== */

function printPayroll() {
  const table = document.querySelector('.payroll-table');
  if (!table) {
    showToast('Nothing to print', 'warning');
    return;
  }

  const periodLabel = currentPeriod ? formatPeriodLabel(currentPeriod) : 'Payroll Preview';
  const title = `Payroll - ${periodLabel}`;
  const now = new Date();
  const printedAt = now.toLocaleString();

  // Build printable HTML
  const tableHtml = table.outerHTML;
  const styleNodes = [];
  // Minimal styles for printing - keeps structure and emphasizes Gross/Net
  const printableStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #111; margin: 20px; }
    h1 { font-size: 20px; margin-bottom: 6px; }
    .meta { font-size: 12px; color: #333; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    table thead th { background: #f7fafc; padding: 6px; border: 1px solid #e6edf8; font-weight: 700; }
    table tbody td { padding: 6px; border: 1px solid #eef3fb; vertical-align: middle; }
    .col-staff, .col-name { text-align: left; }
    .col-number { text-align: right; font-variant-numeric: tabular-nums; font-family: monospace; }
    .gross { font-weight: 800; font-size: 13px; }
    .net { font-weight: 800; font-size: 13px; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  `;

  const popup = window.open('', '_blank', 'noopener');
  if (!popup) {
    showToast('Popup blocked - allow popups to print', 'error');
    return;
  }

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>${printableStyle}</style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">Printed: ${escapeHtml(printedAt)}</div>
          </div>
          <div style="text-align:right; font-size:12px; color:#555;">
            <div>Accounts Dept. Workspace</div>
          </div>
        </div>
        ${tableHtml}
        <script>
          // Trigger print and close window after printing
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
          window.onafterprint = function() {
            setTimeout(function(){ window.close(); }, 200);
          };
        <\/script>
      </body>
    </html>
  `);
  popup.document.close();
}

/* ============== Payroll Calculation Helpers ============== */

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
  const totalAllowances = allowances.reduce((s,a) => s + (parseFloat(a.amount) || 0), 0);
  const grossSalary = roundToTwo(basicSalary + totalAllowances);
  const employeePension = roundToTwo(grossSalary * 0.055);
  const employeePf = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
  const taxableIncome = Math.max(0, roundToTwo(grossSalary - employeePension - employeePf - (reliefAmount || 0)));
  const paye = calculatePAYE(taxableIncome);
  const netPay = roundToTwo(taxableIncome - paye);
  const totalDeduction = roundToTwo(employeePension + employeePf + paye + loanMonthly);
  const employerPension = roundToTwo(grossSalary * 0.13);
  const employerPf = pfChecked ? roundToTwo(basicSalary * (employerPFpct / 100)) : 0;
  const takeHomePay = roundToTwo(netPay - loanMonthly);

  return {
    totalAllowances,
    grossSalary,
    employeePension,
    employeePf,
    taxableIncome,
    paye,
    netPay,
    totalDeduction,
    employerPension,
    employerPf,
    takeHomePay
  };
}

/* ============== Utility Functions ============== */

function formatMoney(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.00';
  return n.toFixed(2);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'`]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  }[s]));
}

/* ============== Show Toast ============== */

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
  }, 4000);
}

/* ============== Exports ============== */

window.initPayroll = initPayroll;
window.processPayroll = processPayroll;
window.loadPayrollPeriod = loadPayrollPeriod;
window.deletePayrollPeriod = deletePayrollPeriod;
window.printPayroll = printPayroll;
window.renderPayrollTable = renderPayrollTable;
window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
