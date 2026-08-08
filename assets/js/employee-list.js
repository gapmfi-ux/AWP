/* Employee list client logic - Server-backed */

function initEmployeeList() {
  renderEmployeeTable();
}

async function getEmployeesFromServer() {
  try {
    showLoadingModal('Loading employees...');
    const resp = await API.getEmployees({ useCache: false });
    // Server returns array of records keyed by headers
    const serverRecords = resp || [];
    // serverRecords may be array of objects (headers->values)
    const employees = (Array.isArray(serverRecords) ? serverRecords : serverRecords.records || [])
      .map(rec => ({
        staff: rec['Staff Number'] || rec['STAFF_NUMBER'] || rec.staff || '',
        name: rec['Full Name'] || rec['FULL_NAME'] || rec.name || '',
        department: rec['Department'] || rec['DEPARTMENT'] || '',
        designation: rec['Designation'] || rec['DESIGNATION'] || '',
        email: rec['Email'] || '',
        ssnit: rec['SSNIT'] || '',
        ghanaCard: rec['Ghana Card'] || '',
        basicSalary: parseFloat(rec['Basic Salary'] || 0) || 0,
        employeePFrate: parseFloat(rec['Employee PF Rate (%)'] || rec['EMPLOYEE_PF_RATE'] || 0) || 0,
        employerPFrate: parseFloat(rec['Employer PF Rate (%)'] || rec['EMPLOYER_PF_RATE'] || 0) || 0,
        employeePfAmount: parseFloat(rec['Employee PF Amount'] || 0) || 0,
        pf10Amount: parseFloat(rec['PF 10% Amount'] || 0) || 0,
        taxRelief: parseFloat(rec['Tax Relief'] || 0) || 0,
        taxableIncome: parseFloat(rec['Taxable Income'] || 0) || 0,
        paye: parseFloat(rec['PAYE'] || 0) || 0,
        totalDeduction: parseFloat(rec['Total Deduction'] || 0) || 0,
        netPay: parseFloat(rec['Net Pay'] || 0) || 0,
        employer13Amount: parseFloat(rec['Employer 13% Amount'] || rec['Employer 13% Amount'] || 0) || 0,
        employerPfAmount: parseFloat(rec['Employer Pf Amount'] || 0) || 0,
        monthlyLoan: parseFloat(rec['Monthly Loan'] || 0) || 0,
        loanFrom: rec['Loan From'] || '',
        loanTo: rec['Loan To'] || '',
        status: rec['Status'] || 'Active'
      }));
    return employees;
  } catch (err) {
    console.error('Error loading employees', err);
    showToast('Failed to load employees', 'error');
    return [];
  } finally {
    hideLoadingModal();
  }
}

async function renderEmployeeTable() {
  const employees = await getEmployeesFromServer();
  const tbody = document.getElementById('employeeTableBody');
  if (!tbody) return;

  if (!employees || employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="employee-table-empty">
          <i class="fas fa-users"></i>
          <p>No employees found</p>
          <span class="sub-text">Click "Add Employee" to get started</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = employees.map(e => `
    <tr data-staff="${escapeHtml(e.staff || '')}">
      <td class="col-staff">${escapeHtml(e.staff || '')}</td>
      <td class="col-name">${escapeHtml(e.name || '')}</td>
      <td>${escapeHtml(e.department || '')}</td>
      <td>${escapeHtml(e.designation || '')}</td>
      <td>${escapeHtml(e.email || '')}</td>
      <td>${escapeHtml(e.ssnit || '')}</td>
      <td class="col-center">
        <div style="position:relative;display:inline-block;">
          <button class="btn-edit-icon" onclick="toggleEmployeeActions(event, '${escapeHtml(e.staff)}')" title="Actions">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="employee-actions" id="actions-${escapeHtml(e.staff)}" style="display:none; position:absolute; right:0; top:28px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; box-shadow:0 6px 18px rgba(0,0,0,0.08); z-index:50;">
            <div style="padding:8px 12px; cursor:pointer;" onclick="editEmployee('${escapeHtml(e.staff)}')"><i class="fas fa-pencil-alt"></i> Edit</div>
            <div style="padding:8px 12px; cursor:pointer;" onclick="terminateEmployee('${escapeHtml(e.staff)}')"><i class="fas fa-user-slash"></i> Terminate</div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');

  // Close any open action menus when clicking outside
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || !ev.target.closest('.employee-actions') && !ev.target.closest('.btn-edit-icon')) {
      document.querySelectorAll('.employee-actions').forEach(div => div.style.display = 'none');
    }
  });
}

function toggleEmployeeActions(event, staff) {
  event.stopPropagation();
  const id = 'actions-' + staff;
  const el = document.getElementById(id);
  if (!el) return;
  // hide others
  document.querySelectorAll('.employee-actions').forEach(div => {
    if (div.id !== id) div.style.display = 'none';
  });
  el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}

// When terminate clicked
async function terminateEmployee(staff) {
  if (!confirm(`Terminate employee ${staff}? This will set their Status to Terminated.`)) return;
  try {
    showLoadingModal('Terminating employee...');
    // Retrieve current employee record (server)
    const resp = await API.getEmployeeByStaffNumber(staff, { useCache: false });
    if (!resp) {
      showToast('Employee not found on server', 'warning');
      return;
    }
    // Map server keys to the update payload we expect
    // We'll populate known fields and set status = Terminated
    const payload = {};
    // Copy over a few expected fields if present
    payload.staff = resp['Staff Number'] || resp.staff || staff;
    payload.name = resp['Full Name'] || resp.name || '';
    payload.department = resp['Department'] || '';
    payload.designation = resp['Designation'] || '';
    payload.email = resp['Email'] || '';
    payload.ssnit = resp['SSNIT'] || '';
    payload.ghanaCard = resp['Ghana Card'] || '';
    payload.basicSalary = parseFloat(resp['Basic Salary'] || 0) || 0;
    payload.employeePFrate = parseFloat(resp['Employee PF Rate (%)'] || 0) || 0;
    payload.employerPFrate = parseFloat(resp['Employer PF Rate (%)'] || 0) || 0;
    payload.taxRelief = parseFloat(resp['Tax Relief'] || 0) || 0;
    payload.monthlyLoan = parseFloat(resp['Monthly Loan'] || 0) || 0;
    payload.loanFrom = resp['Loan From'] || '';
    payload.loanTo = resp['Loan To'] || '';
    payload.status = 'Terminated';

    await API.updateEmployee(payload);
    showToast('Employee terminated', 'success');
    await renderEmployeeTable();
  } catch (err) {
    console.error('Error terminating employee', err);
    showToast('Failed to terminate employee', 'error');
  } finally {
    hideLoadingModal();
  }
}

async function showAddEmployeeModal(editData) {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;

  const isEdit = !!editData;
  document.getElementById('employeeModalTitle').textContent = isEdit ? 'Edit Employee' : 'Add Employee';
  ['empStaffNumber', 'empName', 'empDepartment', 'empDesignation', 'empEmail', 'empSSNIT', 'empGhanaCard', 'empBasicSalary', 'empEmployeePFRate', 'empEmployerPFRate', 'empTaxRelief', 'empMonthlyLoan', 'empLoanFrom', 'empLoanTo', 'empStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Reset preview
  updateEmployeePreviewUI({
    employeePf: 0, pf10: 0, taxable: 0, paye: 0, totalDeduction: 0, netPay: 0
  });

  if (isEdit) {
    document.getElementById('empStaffNumber').value = editData.staff || '';
    document.getElementById('empName').value = editData.name || '';
    document.getElementById('empDepartment').value = editData.department || '';
    document.getElementById('empDesignation').value = editData.designation || '';
    document.getElementById('empEmail').value = editData.email || '';
    document.getElementById('empSSNIT').value = editData.ssnit || '';
    document.getElementById('empGhanaCard').value = editData.ghanaCard || '';
    document.getElementById('empBasicSalary').value = editData.basicSalary || '';
    document.getElementById('empEmployeePFRate').value = editData.employeePFrate || '5.5';
    document.getElementById('empEmployerPFRate').value = editData.employerPFrate || '5';
    document.getElementById('empTaxRelief').value = editData.taxRelief || '';
    document.getElementById('empMonthlyLoan').value = editData.monthlyLoan || '';
    document.getElementById('empLoanFrom').value = editData.loanFrom || '';
    document.getElementById('empLoanTo').value = editData.loanTo || '';
    document.getElementById('empStatus').value = editData.status || 'Active';
    modal.dataset.editStaff = editData.staff;
    // Recalc preview based on data (including allowances)
    recalcEmployeePayrollPreview();
  } else {
    delete modal.dataset.editStaff;
    document.getElementById('empEmployeePFRate').value = '5.5';
    document.getElementById('empEmployerPFRate').value = '5';
  }

  modal.classList.add('show');
}

function closeEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (modal) modal.classList.remove('show');
}

async function saveEmployee() {
  const staff = document.getElementById('empStaffNumber').value.trim();
  const name = document.getElementById('empName').value.trim();

  if (!staff || !name) {
    alert('Staff number and name are required');
    return;
  }

  const department = document.getElementById('empDepartment').value.trim();
  const designation = document.getElementById('empDesignation').value.trim();
  const email = document.getElementById('empEmail').value.trim();
  const ssnit = document.getElementById('empSSNIT').value.trim();
  const ghanaCard = document.getElementById('empGhanaCard').value.trim();
  const basicSalary = parseFloat(document.getElementById('empBasicSalary').value) || 0;
  const employeePFrate = parseFloat(document.getElementById('empEmployeePFRate').value) || 0;
  const employerPFrate = parseFloat(document.getElementById('empEmployerPFRate').value) || 0;
  const taxRelief = parseFloat(document.getElementById('empTaxRelief').value) || 0;
  const monthlyLoan = parseFloat(document.getElementById('empMonthlyLoan').value) || 0;
  const loanFrom = document.getElementById('empLoanFrom').value || '';
  const loanTo = document.getElementById('empLoanTo').value || '';
  const status = document.getElementById('empStatus').value || 'Active';

  const modal = document.getElementById('employeeModal');
  const editStaff = modal?.dataset?.editStaff || null;

  const record = {
    staff: staff,
    name: name,
    department: department,
    designation: designation,
    email: email,
    ssnit: ssnit,
    ghanaCard: ghanaCard,
    basicSalary: basicSalary,
    employeePFrate: employeePFrate,
    employerPFrate: employerPFrate,
    taxRelief: taxRelief,
    monthlyLoan: monthlyLoan,
    loanFrom: loanFrom,
    loanTo: loanTo,
    status: status
  };

  try {
    showLoadingModal(editStaff ? 'Updating employee...' : 'Adding employee...');
    if (editStaff) {
      // include staff key
      await API.updateEmployee(record);
      showToast('Employee updated successfully!', 'success');
    } else {
      await API.addEmployee(record);
      showToast('Employee added successfully!', 'success');
    }
    await renderEmployeeTable();
    closeEmployeeModal();
    delete modal.dataset.editStaff;
  } catch (err) {
    console.error('Error saving employee', err);
    showToast('Failed to save employee', 'error');
  } finally {
    hideLoadingModal();
  }
}

async function editEmployee(staff) {
  if (!staff) return;
  try {
    showLoadingModal('Loading employee...');
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
    showAddEmployeeModal(client);
  } catch (err) {
    console.error('Error fetching employee', err);
    showToast('Employee not found.', 'warning');
  } finally {
    hideLoadingModal();
  }
}

async function filterEmployeeList() {
  const q = document.getElementById('employeeSearch')?.value.trim().toLowerCase() || '';
  const employees = await getEmployeesFromServer();
  const filtered = employees.filter(e => {
    return (e.staff || '').toLowerCase().includes(q)
      || (e.name || '').toLowerCase().includes(q)
      || (e.department || '').toLowerCase().includes(q)
      || (e.designation || '').toLowerCase().includes(q);
  });
  const tbody = document.getElementById('employeeTableBody');
  if (!tbody) return;
  if (!filtered || filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="employee-table-empty">
          <i class="fas fa-search"></i>
          <p>No matching employees found</p>
          <span class="sub-text">Try a different search term</span>
        </td>
      </tr>
    `;
    return;
  }
  tbody.innerHTML = filtered.map(e => `
    <tr data-staff="${escapeHtml(e.staff)}">
      <td class="col-staff">${escapeHtml(e.staff || '')}</td>
      <td class="col-name">${escapeHtml(e.name || '')}</td>
      <td>${escapeHtml(e.department || '')}</td>
      <td>${escapeHtml(e.designation || '')}</td>
      <td>${escapeHtml(e.email || '')}</td>
      <td>${escapeHtml(e.ssnit || '')}</td>
      <td class="col-center">
        <div style="position:relative;display:inline-block;">
          <button class="btn-edit-icon" onclick="toggleEmployeeActions(event, '${escapeHtml(e.staff)}')" title="Actions">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="employee-actions" id="actions-${escapeHtml(e.staff)}" style="display:none; position:absolute; right:0; top:28px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; box-shadow:0 6px 18px rgba(0,0,0,0.08); z-index:50;">
            <div style="padding:8px 12px; cursor:pointer;" onclick="editEmployee('${escapeHtml(e.staff)}')"><i class="fas fa-pencil-alt"></i> Edit</div>
            <div style="padding:8px 12px; cursor:pointer;" onclick="terminateEmployee('${escapeHtml(e.staff)}')"><i class="fas fa-user-slash"></i> Terminate</div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

/* Utility functions (escapeHtml, showToast) remain the same as before */

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

// Fetch allowances for employee (not required but useful)
async function fetchAllowancesForEmployee() {
  const staff = document.getElementById('empStaffNumber').value.trim();
  if (!staff) {
    showToast('Enter staff number to load allowances', 'warning');
    return;
  }
  try {
    showLoadingModal('Loading allowances...');
    const resp = await API.getAllowancesByStaff(staff);
    // we don't auto-add allowances to sheet here, but preview recalc uses server allowances
    showToast((resp && resp.length ? `Loaded ${resp.length} allowances` : 'No allowances found'), 'info');
    recalcEmployeePayrollPreview();
  } catch (err) {
    showToast('Failed to load allowances', 'error');
  } finally {
    hideLoadingModal();
  }
}

// Recalc preview for employee modal (uses client compute if available)
async function recalcEmployeePayrollPreview() {
  const basicSalary = parseFloat(document.getElementById('empBasicSalary')?.value) || 0;
  const employeePFrate = parseFloat(document.getElementById('empEmployeePFRate')?.value) || 0;
  const employerPFrate = parseFloat(document.getElementById('empEmployerPFRate')?.value) || 0;
  const taxRelief = parseFloat(document.getElementById('empTaxRelief')?.value) || 0;
  const monthlyLoan = parseFloat(document.getElementById('empMonthlyLoan')?.value) || 0;
  const staff = document.getElementById('empStaffNumber')?.value || '';

  // Get allowances from server for preview
  let allowances = [];
  if (staff) {
    try {
      const resp = await API.getAllowancesByStaff(staff);
      allowances = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : [];
      // map to {type, amount}
      allowances = allowances.map(a => ({ type: a.type || a['Allowance Type'] || '', amount: parseFloat(a.amount || a['Allowance Amount'] || 0) || 0 }));
    } catch (e) {
      allowances = [];
    }
  }

  // Use computePayrollRow client-side if available (from payroll.js)
  let calc;
  if (typeof computePayrollRow === 'function') {
    calc = computePayrollRow({
      basicSalary: basicSalary,
      allowances: allowances,
      employeePFpct: employeePFrate,
      employerPFpct: employerPFrate,
      reliefAmount: taxRelief,
      loanMonthly: monthlyLoan,
      pfChecked: true
    });
  } else {
    // Fallback simple calculation
    const totalAllowances = allowances.reduce((s, a) => s + (a.amount || 0), 0);
    const gross = Math.round((basicSalary + totalAllowances) * 100) / 100;
    const empPf = Math.round((basicSalary * (employeePFrate / 100)) * 100) / 100;
    const pf10 = Math.round((basicSalary * 0.10) * 100) / 100;
    const taxable = Math.max(0, gross - (gross * 0.055) - empPf - taxRelief);
    const paye = 0; // can't compute progressive here
    const totalDeduction = Math.round((gross * 0.055) + empPf + pf10 + paye + monthlyLoan);
    const net = Math.round((taxable - paye) * 100) / 100;
    calc = {
      employeePf: empPf,
      pf10Amount: pf10,
      taxableIncome: taxable,
      paye: paye,
      totalDeduction: totalDeduction,
      netPay: net
    };
  }

  updateEmployeePreviewUI({
    employeePf: calc.employeePf || 0,
    pf10: calc.pf10Amount || calc.pf10 || 0,
    taxable: calc.taxableIncome || calc.taxable || 0,
    paye: calc.paye || 0,
    totalDeduction: calc.totalDeduction || 0,
    netPay: calc.netPay || calc.takeHomePay || 0
  });
}

function updateEmployeePreviewUI({ employeePf, pf10, taxable, paye, totalDeduction, netPay }) {
  document.getElementById('empPreviewEmployeePf').textContent = formatMoney(employeePf || 0);
  document.getElementById('empPreviewPf10').textContent = formatMoney(pf10 || 0);
  document.getElementById('empPreviewTaxable').textContent = formatMoney(taxable || 0);
  document.getElementById('empPreviewPaye').textContent = formatMoney(paye || 0);
  document.getElementById('empPreviewTotalDeduction').textContent = formatMoney(totalDeduction || 0);
  document.getElementById('empPreviewNetPay').textContent = formatMoney(netPay || 0);
}

function formatMoney(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.00';
  return n.toFixed(2);
}

// Exports
window.initEmployeeList = initEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.filterEmployeeList = filterEmployeeList;
window.editEmployee = editEmployee;
