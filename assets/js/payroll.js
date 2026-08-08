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
    taxRelief: parseFloat(rec['Tax Relief']) || 0,
    taxableIncome: parseFloat(rec['Taxable Income']) || 0,
    paye: parseFloat(rec['PAYE']) || 0,
    totalDeduction: parseFloat(rec['Total Deduction']) || 0,
    netPay: parseFloat(rec['Net Pay']) || 0,
    employerPension: parseFloat(rec['Employer Pension']) || 0,
    employerPf: parseFloat(rec['Employer Pf']) || 0,
    loanMonthly: parseFloat(rec['Monthly Loan']) || 0,
    loanFrom: rec['Loan From'] || '',
    loanTo: rec['Loan To'] || '',
    period: rec['Pay Period'] || rec['PAY_PERIOD'] || ''
  };
}

async function loadPayrollRows() {
  const period = (document.getElementById('payPeriod') || {}).value || null;
  try {
    showLoadingModal('Loading payroll rows...');
    const resp = await API.getPayrollRunsByPeriod(period, { useCache: false });
    const serverRecords = (Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : resp) || [];
    // Some server endpoints return array directly; others return {records:[]}. Normalize:
    const clientRows = serverRecords.map(mapServerRecordToClient);
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
      <td class="col-center">
        <button class="btn-edit-icon" onclick="event.stopPropagation(); editPayrollRecord('${escapeHtml(r.staff)}')" title="Edit record">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
  
  document.querySelectorAll('#payrollTableBody tr[data-staff]').forEach(tr => {
    tr.addEventListener('click', function(e) {
      if (e.target.closest('.btn-edit-icon')) return;
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
  if (!staff) return;
  const period = document.getElementById('payPeriod')?.value || null;
  try {
    showLoadingModal('Loading payroll record...');
    const resp = await API.getPayrollRunsByStaff(staff, { useCache: false });
    const serverRecords = resp || [];
    // filter by period
    const rec = serverRecords.find(r => (r['Pay Period'] || r['Pay Period'] || '').trim() === period) || serverRecords[0];
    const clientRec = mapServerRecordToClient(rec);
    if (!clientRec) {
      showToast('Record not found for this staff', 'warning');
      return;
    }
    showAddPayModal(clientRec);
  } catch (err) {
    console.error('Error fetching payroll record', err);
    showToast('Failed to load record', 'error');
  } finally {
    hideLoadingModal();
  }
}

function showAddPayModal(editData) {
  const modal = document.getElementById('addPayModal');
  if (!modal) return;
  const isEdit = !!editData;
  const title = document.getElementById('payModalTitle');
  if (title) title.textContent = isEdit ? 'Edit Employee Pay' : 'Add Employee Pay';
  const fields = [
    'payStaffNumber', 'payName', 'payDesignation',
    'payBasicSalary', 'payEmployeePF', 'payEmployerPF', 'payReliefAmount',
    'payLoanMonthly', 'payLoanFrom', 'payLoanTo'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const allowanceList = document.getElementById('allowanceList');
  if (allowanceList) allowanceList.innerHTML = '';
  if (isEdit) {
    document.getElementById('payStaffNumber').value = editData.staff || '';
    document.getElementById('payName').value = editData.name || '';
    document.getElementById('payDesignation').value = editData.designation || '';
    document.getElementById('payBasicSalary').value = editData.basicSalary || '';
    document.getElementById('payEmployeePF').value = editData.employeePFpct || '5';
    document.getElementById('payEmployerPF').value = editData.employerPFpct || '5';
    document.getElementById('payReliefAmount').value = editData.taxRelief || '';
    document.getElementById('payPeriod').value = editData.period || '';
    document.getElementById('payLoanMonthly').value = editData.loanMonthly || '';
    document.getElementById('payLoanFrom').value = editData.loanFrom || '';
    document.getElementById('payLoanTo').value = editData.loanTo || '';
    const allowances = editData.allowances || [];
    if (allowances.length > 0) {
      document.getElementById('payAllowances').checked = true;
      allowances.forEach(allowance => addAllowanceRow(allowance.type, allowance.amount));
      document.getElementById('allowanceFields').style.display = 'flex';
    } else {
      document.getElementById('payAllowances').checked = false;
      document.getElementById('allowanceFields').style.display = 'none';
    }
    const pfCheck = document.getElementById('payPF');
    if (pfCheck) pfCheck.checked = true;
    const taxCheck = document.getElementById('payTaxRelief');
    if (taxCheck) taxCheck.checked = (editData.taxRelief > 0);
    const loanCheck = document.getElementById('payLoanCheck');
    if (loanCheck) loanCheck.checked = (editData.loanMonthly > 0);
    modal.dataset.editStaff = editData.staff;
  } else {
    const ePF = document.getElementById('payEmployeePF');
    const erPF = document.getElementById('payEmployerPF');
    if (ePF) ePF.value = '5';
    if (erPF) erPF.value = '5';
    document.getElementById('payAllowances').checked = false;
    document.getElementById('allowanceFields').style.display = 'none';
    const pfCheck = document.getElementById('payPF');
    if (pfCheck) pfCheck.checked = true;
    const taxCheck = document.getElementById('payTaxRelief');
    if (taxCheck) taxCheck.checked = false;
    const loanCheck = document.getElementById('payLoanCheck');
    if (loanCheck) loanCheck.checked = false;
    delete modal.dataset.editStaff;
  }
  togglePFFields();
  toggleTaxReliefField();
  toggleLoanFields();
  updateCalcPreview(0, 0, 0, 0, 0, 0);
  recalcPayrollPreview();
  modal.classList.add('show');
  document.getElementById('payStaffNumber')?.focus();
}

function closeAddPayModal() {
  const modal = document.getElementById('addPayModal');
  if (modal) modal.classList.remove('show');
}

async function saveEmployeePay() {
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
  
  const allowances = getAllowances();
  const pfChecked = document.getElementById('payPF').checked;
  const employeePFpct = pfChecked ? (parseFloat(document.getElementById('payEmployeePF').value) || 0) : 0;
  const employerPFpct = pfChecked ? (parseFloat(document.getElementById('payEmployerPF').value) || 0) : 0;
  const taxReliefChecked = document.getElementById('payTaxRelief').checked;
  const reliefAmount = taxReliefChecked ? (parseFloat(document.getElementById('payReliefAmount').value) || 0) : 0;
  const loanChecked = document.getElementById('payLoanCheck').checked;
  const loanMonthly = loanChecked ? (parseFloat(document.getElementById('payLoanMonthly').value) || 0) : 0;
  const loanFrom = document.getElementById('payLoanFrom')?.value || '';
  const loanTo = document.getElementById('payLoanTo')?.value || '';
  const period = document.getElementById('payPeriod')?.value || null;
  
  const calc = computePayrollRow({
    basicSalary,
    allowances,
    employeePFpct,
    employerPFpct,
    reliefAmount,
    loanMonthly,
    pfChecked
  });
  
  const modal = document.getElementById('addPayModal');
  const editStaff = modal?.dataset?.editStaff || null;

  // Build payrollData for server
  const payrollData = {
    // runId will be generated server-side if omitted
    staffNumber: staff,
    fullName: name,
    designation: designation,
    payPeriod: period,
    basicSalary: basicSalary,
    allowances: allowances,
    totalAllowances: calc.totalAllowances,
    grossSalary: calc.grossSalary,
    employeePension: calc.employeePension,
    employeePf: calc.employeePf,
    pf10Amount: calc.pf10Amount,
    taxRelief: reliefAmount,
    taxableIncome: calc.taxableIncome,
    paye: calc.paye,
    totalDeduction: calc.totalDeduction,
    netPay: calc.netPay,
    employerPension: calc.employerPension,
    employerPf: calc.employerPf,
    loanMonthly: loanMonthly,
    loanFrom: loanFrom,
    loanTo: loanTo
  };
  
  try {
    showLoadingModal('Saving payroll record...');
    const resp = await API.savePayrollRun(payrollData, { useCache: false });
    if (resp && resp.success) {
      showToast('Payroll record saved successfully!', 'success');
      closeAddPayModal();
      await loadPayrollRows();
      delete modal.dataset.editStaff;
    } else {
      console.error('Save payroll error', resp);
      showToast((resp && resp.error) ? resp.error : 'Failed to save payroll record', 'error');
    }
  } catch (err) {
    console.error('Error saving payroll', err);
    showToast('Error saving payroll record', 'error');
  } finally {
    hideLoadingModal();
  }
}

async function deletePayrollRecord(staff) {
  if (!staff) return;
  if (!confirm(`Delete payroll record for "${staff}"?`)) return;
  const period = document.getElementById('payPeriod')?.value || null;
  try {
    showLoadingModal('Deleting payroll record...');
    // The server deletePayrollRun operates by runId — here we don't have runId.
    // We'll call getPayrollRunsByStaff -> find the matching run for period and then delete using runId.
    const resp = await API.getPayrollRunsByStaff(staff, { useCache: false });
    const serverRecs = resp || [];
    const rec = serverRecs.find(r => (r['Pay Period'] || '').trim() === period) || serverRecs[0];
    if (!rec) {
      showToast('Record not found on server.', 'warning');
      return;
    }
    const runId = rec['Run ID'] || rec['RunId'] || rec['RUN_ID'];
    if (!runId) {
      showToast('Cannot delete: Run ID not found', 'error');
      return;
    }
    const del = await API.deletePayrollRun(runId);
    if (del && del.success) {
      showToast('Record deleted.', 'success');
      await loadPayrollRows();
    } else {
      showToast((del && del.error) ? del.error : 'Failed to delete record', 'error');
    }
  } catch (err) {
    console.error('Error deleting payroll', err);
    showToast('Error deleting payroll record', 'error');
  } finally {
    hideLoadingModal();
  }
}

function showPayslipFor(staff) {
  // keep behavior: navigate to payslip module and set selected staff in localStorage
  localStorage.setItem('awp_selected_payslip_staff', staff);
  if (typeof loadModule === 'function') {
    loadModule('payslip');
  }
}

/* The rest of utility functions (roundToTwo, formatMoney, escapeHtml, showToast, etc.) are unchanged and expected to remain in this file or globally. */

window.initPayroll = initPayroll;
window.showAddPayModal = showAddPayModal;
window.closeAddPayModal = closeAddPayModal;
window.saveEmployeePay = saveEmployeePay;
window.autoFillEmployeeDetails = autoFillEmployeeDetails;
window.toggleAllowanceFields = toggleAllowanceFields;
window.togglePFFields = togglePFFields;
window.toggleTaxReliefField = toggleTaxReliefField;
window.toggleLoanFields = toggleLoanFields;
window.addAllowanceRow = addAllowanceRow;
window.recalcPayrollPreview = recalcPayrollPreview;
window.showPayslipFor = showPayslipFor;
window.deletePayrollRecord = deletePayrollRecord;
window.loadPayrollRows = loadPayrollRows;
window.editPayrollRecord = editPayrollRecord;
