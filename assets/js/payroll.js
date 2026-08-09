/**
 * Payroll Module - Client Side Logic
 * Handles payroll processing, loading, and display
 */

let currentPayrollData = [];
let currentPeriod = '';

/* ============== Initialization ============== */

function initPayroll() {
  // Set default period to empty (Select Month)
  currentPeriod = '';
  
  const periodInput = document.getElementById('payPeriodSelect');
  if (periodInput) {
    periodInput.value = '';
  }
  
  // Load all employees and show calculated payroll details
  loadPayrollPreview();
}

/* ============== Load Payroll Preview (calculated figures) ============== */

async function loadPayrollPreview() {
  try {
    showLoadingModal('Loading payroll preview...');
    
    // Get all employees
    const employees = await API.getEmployees().catch(() => []);
    
    if (!employees || employees.length === 0) {
      currentPayrollData = [];
      renderPayrollTable([]);
      showToast('No employees found. Add employees first.', 'warning');
      hideLoadingModal();
      return;
    }
    
    // Calculate payroll for each employee
    const payrollData = [];
    
    for (const emp of employees) {
      const staffNumber = emp['Staff Number'] || emp.staff || '';
      const fullName = emp['Full Name'] || emp.name || '';
      const designation = emp['Designation'] || emp.designation || '';
      const basicSalary = parseFloat(emp['Basic Salary'] || emp.basicSalary || 0) || 0;
      const employeePFrate = parseFloat(emp['Employee PF Rate (%)'] || emp.employeePFrate || 0) || 0;
      const employerPFrate = parseFloat(emp['Employer PF Rate (%)'] || emp.employerPFrate || 0) || 0;
      const taxRelief = parseFloat(emp['Tax Relief'] || emp.taxRelief || 0) || 0;
      
      // Get allowances for this employee
      let allowances = [];
      try {
        allowances = await API.getAllowancesByStaff(staffNumber).catch(() => []);
      } catch (e) {
        allowances = [];
      }
      
      // Calculate payroll
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
        'Employee Pension': calc.employeePension,
        'PF 10% Amount': calc.pf10Amount,
        'Tax Relief': taxRelief,
        'Taxable Income': calc.taxableIncome,
        'PAYE': calc.paye,
        'Total Deduction': calc.totalDeduction,
        'Net Pay': calc.netPay,
        'Employer 13% Amount': calc.employerPension,
        'Employer PF Amount': calc.employerPf,
        'Monthly Loan': 0,
        'Allowances': allowances
      });
    }
    
    currentPayrollData = payrollData;
    renderPayrollTable(payrollData, true);
    showToast('Showing calculated payroll preview', 'info');
    
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
  
  // If no period selected, show calculated preview
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
      showToast(`Loaded saved payroll for ${period}`, 'success');
    } else {
      // No saved payroll - show calculated preview
      showToast(`No saved payroll found for ${period}. Showing calculated preview.`, 'info');
      await loadPayrollPreview();
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
    showToast('Please select a pay period first', 'warning');
    periodInput.focus();
    return;
  }
  
  // Show confirmation modal
  showConfirmModal(
    'Confirm Payroll Processing',
    `Are you sure you want to process payroll for <strong>${period}</strong>?<br><br>This will save payroll for all employees.`,
    async function() {
      try {
        showLoadingModal('Processing payroll...');
        const response = await API.processPayrollRun(period);
        
        if (response && response.success) {
          showToast(`Payroll processed successfully for ${period}`, 'success');
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
    `Are you sure you want to delete all payroll records for <strong>${period}</strong>?<br><br>This action cannot be undone.`,
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
            showToast(`Deleted payroll records for ${period}`, 'success');
            currentPayrollData = [];
            await loadPayrollPreview();
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
        closeConfirmModal();
      }
    },
    function() {
      closeConfirmModal();
    }
  );
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
          <span class="sub-text">${isPreview ? 'Add employees to see calculated payroll' : 'Run payroll to generate data for this period'}</span>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = data.map((record, index) => {
    // Extract values from record - using matching column names
    const staffNumber = record['Staff Number'] || record.staffNumber || '';
    const fullName = record['Full Name'] || record.fullName || '';
    const designation = record['Designation'] || record.designation || '';
    const basicSalary = parseFloat(record['Basic Salary'] || record.basicSalary || 0) || 0;
    const totalAllowances = parseFloat(record['Total Allowances'] || record.totalAllowances || 0) || 0;
    const grossSalary = parseFloat(record['Gross Salary'] || record.grossSalary || 0) || 0;
    const employeePension = parseFloat(record['Employee Pension'] || record.employeePension || 0) || 0;
    const pf10Amount = parseFloat(record['PF 10% Amount'] || record.pf10Amount || 0) || 0;
    const taxRelief = parseFloat(record['Tax Relief'] || record.taxRelief || 0) || 0;
    const taxableIncome = parseFloat(record['Taxable Income'] || record.taxableIncome || 0) || 0;
    const paye = parseFloat(record['PAYE'] || record.paye || 0) || 0;
    const totalDeduction = parseFloat(record['Total Deduction'] || record.totalDeduction || 0) || 0;
    const netPay = parseFloat(record['Net Pay'] || record.netPay || 0) || 0;
    const employerPension = parseFloat(record['Employer 13% Amount'] || record.employerPension || 0) || 0;
    const employerPf = parseFloat(record['Employer PF Amount'] || record.employerPf || 0) || 0;
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

function computePayrollRow({ basicSalary = 0, allowances = [], employeePFpct = 5, employerPFpct = 5, reliefAmount = 0, loanMonthly = 0, pfChecked = true }) {
  const totalAllowances = allowances.reduce((s,a) => s + (parseFloat(a.amount) || 0), 0);
  const grossSalary = roundToTwo(basicSalary + totalAllowances);
  const employeePension = roundToTwo(grossSalary * 0.055);
  const employeePf = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
  const pf10Amount = roundToTwo(basicSalary * 0.10);
  const taxableIncome = Math.max(0, roundToTwo(grossSalary - employeePension - employeePf - (reliefAmount || 0)));
  const paye = calculatePAYE(taxableIncome);
  const netPay = roundToTwo(taxableIncome - paye);
  const totalDeduction = roundToTwo(employeePension + employeePf + pf10Amount + paye + loanMonthly);
  const employerPension = roundToTwo(grossSalary * 0.13);
  const employerPf = pfChecked ? roundToTwo(basicSalary * (employerPFpct / 100)) : 0;
  const takeHomePay = roundToTwo(netPay - loanMonthly);

  return {
    totalAllowances,
    grossSalary,
    employeePension,
    employeePf,
    pf10Amount,
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
  }, 3000);
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
