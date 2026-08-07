/* Payroll client logic - Enhanced with better UI */

function initPayroll() {
  renderPayrollTable();
  const pp = document.getElementById('payPeriod');
  if (pp && !pp.value) {
    const d = new Date();
    pp.value = d.toISOString().slice(0, 7);
  }
  loadPayrollRows();
  
  // Setup keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAddPayModal();
    }
  });
}

function getPayrollRows() {
  try {
    return JSON.parse(localStorage.getItem('awp_payroll_rows') || '[]');
  } catch (e) {
    return [];
  }
}

function savePayrollRows(arr) {
  localStorage.setItem('awp_payroll_rows', JSON.stringify(arr));
}

function loadPayrollRows() {
  const rows = getPayrollRows();
  const period = (document.getElementById('payPeriod') || {}).value || null;
  const filtered = period ? rows.filter(r => r.period === period) : rows;
  renderPayrollTable(filtered);
}

function renderPayrollTable(rows) {
  const data = rows || getPayrollRows();
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;
  
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="payroll-table-empty">
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
      <td class="col-number">${formatMoney(r.employeePFAmount)}</td>
      <td class="col-number">${formatMoney(r.pf10Amount)}</td>
      <td class="col-number">${formatMoney(r.taxRelief || 0)}</td>
      <td class="col-number">${formatMoney(r.taxableIncome)}</td>
      <td class="col-number ${r.paye > 0 ? 'negative' : ''}">${formatMoney(r.paye)}</td>
      <td class="col-number negative">${formatMoney(r.totalDeduction)}</td>
      <td class="col-number positive">${formatMoney(r.netPay)}</td>
      <td class="col-number">${formatMoney(r.employer13Amount)}</td>
      <td class="col-number">${formatMoney(r.employerPFAmount)}</td>
    </tr>
  `).join('');
  
  // Click to view payslip
  document.querySelectorAll('#payrollTableBody tr[data-staff]').forEach(tr => {
    tr.addEventListener('click', function() {
      const staff = this.getAttribute('data-staff');
      if (staff) showPayslipFor(staff);
    });
    
    // Add hover hint
    const hint = document.createElement('span');
    hint.className = 'click-hint';
    hint.textContent = '↗';
    tr.querySelector('td:first-child')?.appendChild(hint);
  });
  
  updateSummary(data);
}

function updateSummary(data) {
  const totalNetPay = data.reduce((sum, r) => sum + (r.netPay || 0), 0);
  const totalPaye = data.reduce((sum, r) => sum + (r.paye || 0), 0);
  const totalDeductions = data.reduce((sum, r) => sum + (r.totalDeduction || 0), 0);
  
  const netEl = document.getElementById('payrollTotalNet');
  const payeEl = document.getElementById('payrollTotalPaye');
  const dedEl = document.getElementById('payrollTotalDeductions');
  
  if (netEl) netEl.textContent = formatMoney(totalNetPay);
  if (payeEl) payeEl.textContent = formatMoney(totalPaye);
  if (dedEl) dedEl.textContent = formatMoney(totalDeductions);
}

function showAddPayModal() {
  const modal = document.getElementById('addPayModal');
  if (!modal) return;
  
  // Reset form
  const fields = [
    'payStaffNumber', 'payName', 'payDepartment', 'payDesignation',
    'payBasicSalary', 'payEmployeePF', 'payEmployerPF', 'payReliefAmount',
    'payLoanMonthly'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.type === 'number' || el.type === 'text' && el.id.includes('Amount')) {
        el.value = '';
      } else if (el.type === 'text') {
        el.value = '';
      }
    }
  });
  
  // Set defaults
  const ePF = document.getElementById('payEmployeePF');
  const erPF = document.getElementById('payEmployerPF');
  if (ePF) ePF.value = '5.5';
  if (erPF) erPF.value = '5';
  
  // Reset checkboxes
  const pfCheck = document.getElementById('payPF');
  const taxCheck = document.getElementById('payTaxRelief');
  if (pfCheck) pfCheck.checked = true;
  if (taxCheck) taxCheck.checked = false;
  
  // Reset loan option
  const loanOpt = document.getElementById('payLoanOption');
  if (loanOpt) loanOpt.value = 'none';
  
  // Hide toggle sections
  document.getElementById('pfFields').style.display = 'block';
  document.getElementById('taxReliefField').style.display = 'none';
  document.getElementById('loanFields').style.display = 'none';
  
  // Clear calculated preview
  updateCalcPreview(0, 0, 0, 0);
  
  modal.classList.add('show');
  document.getElementById('payStaffNumber')?.focus();
}

function closeAddPayModal() {
  const modal = document.getElementById('addPayModal');
  if (modal) modal.classList.remove('show');
}

// Close modal on backdrop click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('addPayModal');
  if (modal && modal.classList.contains('show')) {
    if (e.target === modal) {
      closeAddPayModal();
    }
  }
});

function autoFillEmployeeDetails(staffNumber) {
  const staff = (staffNumber || '').trim();
  if (!staff) return;
  
  const employees = JSON.parse(localStorage.getItem('awp_employees') || '[]');
  const emp = employees.find(e => e.staff === staff);
  
  if (emp) {
    const nameEl = document.getElementById('payName');
    const deptEl = document.getElementById('payDepartment');
    const desEl = document.getElementById('payDesignation');
    if (nameEl) nameEl.value = emp.name || '';
    if (deptEl) deptEl.value = emp.department || '';
    if (desEl) desEl.value = emp.designation || '';
    
    // Auto-fill basic salary if available from employee record
    // (we could add a salary field to employee list)
  } else {
    // Clear fields if staff not found
    const nameEl = document.getElementById('payName');
    if (nameEl && !nameEl.value) nameEl.value = '';
  }
  
  // Recalculate
  recalcPayrollPreview();
}

function togglePFFields() {
  const checked = document.getElementById('payPF')?.checked || false;
  const fields = document.getElementById('pfFields');
  if (fields) {
    fields.style.display = checked ? 'block' : 'none';
  }
  recalcPayrollPreview();
}

function toggleTaxReliefField() {
  const checked = document.getElementById('payTaxRelief')?.checked || false;
  const field = document.getElementById('taxReliefField');
  if (field) {
    field.style.display = checked ? 'block' : 'none';
  }
  recalcPayrollPreview();
}

function toggleLoanFields() {
  const value = document.getElementById('payLoanOption')?.value || 'none';
  const field = document.getElementById('loanFields');
  if (field) {
    field.style.display = value === 'loan' ? 'block' : 'none';
  }
  recalcPayrollPreview();
}

function recalcPayrollPreview() {
  const basicSalary = parseFloat(document.getElementById('payBasicSalary')?.value) || 0;
  const pfChecked = document.getElementById('payPF')?.checked || false;
  const employeePFpct = parseFloat(document.getElementById('payEmployeePF')?.value) || 0;
  const taxReliefChecked = document.getElementById('payTaxRelief')?.checked || false;
  const reliefAmount = taxReliefChecked ? (parseFloat(document.getElementById('payReliefAmount')?.value) || 0) : 0;
  const loanOption = document.getElementById('payLoanOption')?.value || 'none';
  const loanMonthly = loanOption === 'loan' ? (parseFloat(document.getElementById('payLoanMonthly')?.value) || 0) : 0;
  
  const calc = computePayrollRow({
    basicSalary,
    employeePFpct: pfChecked ? employeePFpct : 0,
    employerPFpct: 0,
    reliefAmount,
    loanMonthly,
    pfChecked
  });
  
  updateCalcPreview(calc.netPay, calc.paye, calc.totalDeduction, calc.taxableIncome);
}

function updateCalcPreview(netPay, paye, totalDeduction, taxableIncome) {
  const netEl = document.getElementById('previewNetPay');
  const payeEl = document.getElementById('previewPaye');
  const dedEl = document.getElementById('previewDeductions');
  const taxEl = document.getElementById('previewTaxable');
  
  if (netEl) netEl.textContent = formatMoney(netPay);
  if (payeEl) payeEl.textContent = formatMoney(paye);
  if (dedEl) dedEl.textContent = formatMoney(totalDeduction);
  if (taxEl) taxEl.textContent = formatMoney(taxableIncome);
}

function saveEmployeePay() {
  const staff = document.getElementById('payStaffNumber').value.trim();
  const name = document.getElementById('payName').value.trim();
  
  if (!staff || !name) {
    alert('Staff number and name are required.');
    document.getElementById('payStaffNumber')?.focus();
    return;
  }
  
  const designation = document.getElementById('payDesignation').value.trim();
  const basicSalary = parseFloat(document.getElementById('payBasicSalary').value) || 0;
  
  if (basicSalary <= 0) {
    alert('Please enter a valid basic salary.');
    document.getElementById('payBasicSalary')?.focus();
    return;
  }
  
  const pfChecked = document.getElementById('payPF').checked;
  const employeePFpct = parseFloat(document.getElementById('payEmployeePF').value) || 0;
  const employerPFpct = parseFloat(document.getElementById('payEmployerPF').value) || 0;
  const taxReliefChecked = document.getElementById('payTaxRelief').checked;
  const reliefAmount = taxReliefChecked ? (parseFloat(document.getElementById('payReliefAmount').value) || 0) : 0;
  const loanOption = document.getElementById('payLoanOption').value || 'none';
  const loanMonthly = loanOption === 'loan' ? (parseFloat(document.getElementById('payLoanMonthly').value) || 0) : 0;
  const period = document.getElementById('payPeriod')?.value || null;
  
  const calc = computePayrollRow({
    basicSalary,
    employeePFpct: pfChecked ? employeePFpct : 0,
    employerPFpct: pfChecked ? employerPFpct : 0,
    reliefAmount,
    loanMonthly,
    pfChecked
  });
  
  const rows = getPayrollRows();
  
  // Check if staff already exists for this period
  const existingIndex = rows.findIndex(r => r.staff === staff && r.period === period);
  const newRow = {
    staff,
    name,
    designation,
    basicSalary,
    employeePFpct: pfChecked ? employeePFpct : 0,
    employerPFpct: pfChecked ? employerPFpct : 0,
    employeePFAmount: calc.employeePFAmount,
    pf10Amount: calc.pf10Amount,
    taxRelief: reliefAmount,
    taxableIncome: calc.taxableIncome,
    paye: calc.paye,
    totalDeduction: calc.totalDeduction,
    netPay: calc.netPay,
    employer13Amount: calc.employer13Amount,
    employerPFAmount: calc.employerPFAmount,
    loanMonthly,
    period,
    updatedAt: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    if (!confirm(`"${name}" already has a payroll record for this period. Update it?`)) {
      return;
    }
    rows[existingIndex] = newRow;
  } else {
    rows.push(newRow);
  }
  
  savePayrollRows(rows);
  loadPayrollRows();
  closeAddPayModal();
  showToast('Payroll record saved successfully!', 'success');
}

function computePayrollRow({ basicSalary = 0, employeePFpct = 5.5, employerPFpct = 5, reliefAmount = 0, loanMonthly = 0, pfChecked = true }) {
  const employeePFAmount = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
  const pf10Amount = roundToTwo(basicSalary * 0.10);
  const taxableIncome = Math.max(0, roundToTwo(basicSalary - employeePFAmount - reliefAmount - loanMonthly));
  const paye = roundToTwo(taxableIncome * 0.10);
  const totalDeduction = roundToTwo(employeePFAmount + pf10Amount + paye + loanMonthly);
  const netPay = roundToTwo(basicSalary - totalDeduction);
  const employer13Amount = roundToTwo(basicSalary * 0.13);
  const employerPFAmount = pfChecked ? roundToTwo(basicSalary * (employerPFpct / 100)) : 0;
  
  return { employeePFAmount, pf10Amount, taxableIncome, paye, totalDeduction, netPay, employer13Amount, employerPFAmount };
}

function runPayroll() {
  showToast('Payroll run executed (client-side demo). Replace with backend call to persist runs.', 'info');
}

function deletePayrollRecord(staff) {
  if (!staff) return;
  if (!confirm(`Delete payroll record for "${staff}"?`)) return;
  
  const rows = getPayrollRows();
  const period = document.getElementById('payPeriod')?.value || null;
  const filtered = rows.filter(r => !(r.staff === staff && r.period === period));
  
  if (filtered.length === rows.length) {
    showToast('Record not found.', 'warning');
    return;
  }
  
  savePayrollRows(filtered);
  loadPayrollRows();
  showToast('Record deleted.', 'success');
}

function showPayslipFor(staff) {
  localStorage.setItem('awp_selected_payslip_staff', staff);
  if (typeof loadModule === 'function') {
    loadModule('payslip');
  }
}

// ---- Utility Functions ----
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
    // Create toast if it doesn't exist
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
window.autoFillEmployeeDetails = autoFillEmployeeDetails;
window.togglePFFields = togglePFFields;
window.toggleTaxReliefField = toggleTaxReliefField;
window.toggleLoanFields = toggleLoanFields;
window.recalcPayrollPreview = recalcPayrollPreview;
window.showPayslipFor = showPayslipFor;
window.deletePayrollRecord = deletePayrollRecord;
window.runPayroll = runPayroll;
window.loadPayrollRows = loadPayrollRows;
