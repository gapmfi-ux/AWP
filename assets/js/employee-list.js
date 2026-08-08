/* Employee list client logic - Server-backed with improved Add/Edit modal (3-4 columns and toggles) */

function initEmployeeList() {
  renderEmployeeTable();
}

async function getEmployeesFromServer() {
  try {
    showLoadingModal('Loading employees...');
    const resp = await API.getEmployees({ useCache: false });
    const serverRecords = resp || [];
    const employees = (Array.isArray(serverRecords) ? serverRecords : serverRecords.records || [])
      .map(rec => ({
        staff: rec['Staff Number'] || rec['STAFF_NUMBER'] || rec['Staff'] || '',
        name: rec['Full Name'] || rec['FullName'] || rec['FULL_NAME'] || '',
        department: rec['Department'] || '',
        designation: rec['Designation'] || '',
        email: rec['Email'] || '',
        ssnit: rec['SSNIT'] || '',
        ghanaCard: rec['Ghana Card'] || '',
        basicSalary: parseFloat(rec['Basic Salary'] || rec['BASIC_SALARY'] || 0) || 0,
        employeePFrate: parseFloat(rec['Employee PF Rate (%)'] || rec['EMPLOYEE_PF_RATE'] || rec.employeePFrate) || 0,
        employerPFrate: parseFloat(rec['Employer PF Rate (%)'] || rec['EMPLOYER_PF_RATE'] || rec.employerPFrate) || 0,
        taxRelief: parseFloat(rec['Tax Relief Amount'] || rec['TAX_RELIEF'] || 0) || 0
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
    <tr>
      <td class="col-staff">${escapeHtml(e.staff || '')}</td>
      <td class="col-name">${escapeHtml(e.name || '')}</td>
      <td>${escapeHtml(e.department || '')}</td>
      <td>${escapeHtml(e.designation || '')}</td>
      <td>${escapeHtml(e.email || '')}</td>
      <td>${escapeHtml(e.ssnit || '')}</td>
      <td class="col-center">
        <button class="btn-edit-icon" onclick="editEmployee('${escapeHtml(e.staff)}')" title="Edit employee">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function showAddEmployeeModal(editData) {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;
  
  const isEdit = !!editData;
  document.getElementById('employeeModalTitle').textContent = isEdit ? 'Edit Employee' : 'Add Employee';
  ['empStaffNumber', 'empName', 'empDepartment', 'empDesignation', 'empEmail', 'empSSNIT', 'empGhanaCard', 'empBasicSalary',
   'empEmployeePFRate', 'empEmployerPFRate', 'empTaxRelief', 'empLoanMonthly'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // reset toggles
  document.getElementById('empHasPF').checked = false;
  document.getElementById('empHasTaxRelief').checked = false;
  document.getElementById('empHasAllowances').checked = false;
  document.getElementById('empHasLoan').checked = false;
  toggleEmployeePFFields();
  toggleEmployeeTaxReliefField();
  toggleEmployeeAllowanceField();
  toggleEmployeeLoanFields();

  if (isEdit) {
    // populate fields (editData is expected to be client-shaped)
    document.getElementById('empStaffNumber').value = editData.staff || '';
    document.getElementById('empName').value = editData.name || '';
    document.getElementById('empDepartment').value = editData.department || '';
    document.getElementById('empDesignation').value = editData.designation || '';
    document.getElementById('empEmail').value = editData.email || '';
    document.getElementById('empSSNIT').value = editData.ssnit || '';
    document.getElementById('empGhanaCard').value = editData.ghanaCard || '';
    document.getElementById('empBasicSalary').value = editData.basicSalary || '';

    // PF fields
    const empPf = editData.employeePFrate || editData.employeePFrate || editData.employeePFrate === 0 ? editData.employeePFrate : '';
    const erPf = editData.employerPFrate || editData.employerPFrate || editData.employerPFrate === 0 ? editData.employerPFrate : '';
    if (empPf !== '') {
      document.getElementById('empHasPF').checked = true;
      document.getElementById('empEmployeePFRate').value = empPf;
    }
    if (erPf !== '') {
      document.getElementById('empEmployerPFRate').value = erPf;
    }
    toggleEmployeePFFields();

    // tax relief
    const tr = editData.taxRelief || 0;
    if (tr && Number(tr) > 0) {
      document.getElementById('empHasTaxRelief').checked = true;
      document.getElementById('empTaxRelief').value = tr;
    }
    toggleEmployeeTaxReliefField();

    // allowances (we don't show allowance list here, just the toggle)
    if (editData.hasAllowances) {
      document.getElementById('empHasAllowances').checked = true;
    }
    toggleEmployeeAllowanceField();

    // loan
    if (editData.loanMonthly && Number(editData.loanMonthly) > 0) {
      document.getElementById('empHasLoan').checked = true;
      document.getElementById('empLoanMonthly').value = editData.loanMonthly;
    }
    toggleEmployeeLoanFields();

    modal.dataset.editStaff = editData.staff;
  } else {
    delete modal.dataset.editStaff;
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
  const hasPF = document.getElementById('empHasPF').checked;
  const employeePFrate = hasPF ? (parseFloat(document.getElementById('empEmployeePFRate').value) || 0) : 0;
  const employerPFrate = hasPF ? (parseFloat(document.getElementById('empEmployerPFRate').value) || 0) : 0;
  const hasTaxRelief = document.getElementById('empHasTaxRelief').checked;
  const taxRelief = hasTaxRelief ? (parseFloat(document.getElementById('empTaxRelief').value) || 0) : 0;
  const hasAllowances = document.getElementById('empHasAllowances').checked;
  const hasLoan = document.getElementById('empHasLoan').checked;
  const loanMonthly = hasLoan ? (parseFloat(document.getElementById('empLoanMonthly').value) || 0) : 0;
  
  const modal = document.getElementById('employeeModal');
  const editStaff = modal?.dataset?.editStaff || null;
  
  const record = { 
    staff, 
    name, 
    department, 
    designation, 
    email, 
    ssnit, 
    ghanaCard,
    basicSalary,
    employeePFrate,
    employerPFrate,
    taxRelief,
    hasAllowances,
    hasLoan,
    loanMonthly
  };
  
  try {
    showLoadingModal(editStaff ? 'Updating employee...' : 'Adding employee...');
    if (editStaff) {
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
      employeePFrate: parseFloat(rec['Employee PF Rate (%)'] || rec.employeePFrate || 0) || 0,
      employerPFrate: parseFloat(rec['Employer PF Rate (%)'] || rec.employerPFrate || 0) || 0,
      taxRelief: parseFloat(rec['Tax Relief Amount'] || rec.taxRelief || 0) || 0,
      hasAllowances: false,
      loanMonthly: parseFloat(rec['Loan Monthly'] || 0) || 0
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
    <tr>
      <td class="col-staff">${escapeHtml(e.staff || '')}</td>
      <td class="col-name">${escapeHtml(e.name || '')}</td>
      <td>${escapeHtml(e.department || '')}</td>
      <td>${escapeHtml(e.designation || '')}</td>
      <td>${escapeHtml(e.email || '')}</td>
      <td>${escapeHtml(e.ssnit || '')}</td>
      <td class="col-center">
        <button class="btn-edit-icon" onclick="editEmployee('${escapeHtml(e.staff)}')" title="Edit employee">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/* Toggle helper functions for the modal fields */

function toggleEmployeePFFields() {
  const checked = document.getElementById('empHasPF').checked;
  document.getElementById('empPFFields').style.display = checked ? 'block' : 'none';
  document.getElementById('empERPFFields').style.display = checked ? 'block' : 'none';
}

function toggleEmployeeTaxReliefField() {
  const checked = document.getElementById('empHasTaxRelief').checked;
  document.getElementById('empTaxReliefField').style.display = checked ? 'block' : 'none';
}

function toggleEmployeeAllowanceField() {
  // We only keep the toggle here. Detailed allowances are managed in Allowance module.
  // No specific input required in employee modal currently.
  const checked = document.getElementById('empHasAllowances').checked;
  // nothing additional to show for now, but kept for UX consistency
}

function toggleEmployeeLoanFields() {
  const checked = document.getElementById('empHasLoan').checked;
  document.getElementById('empLoanField').style.display = checked ? 'block' : 'none';
}

/* Utility functions */

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

/* Exports */

window.initEmployeeList = initEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.filterEmployeeList = filterEmployeeList;
window.editEmployee = editEmployee;
window.toggleEmployeePFFields = toggleEmployeePFFields;
window.toggleEmployeeTaxReliefField = toggleEmployeeTaxReliefField;
window.toggleEmployeeAllowanceField = toggleEmployeeAllowanceField;
window.toggleEmployeeLoanFields = toggleEmployeeLoanFields;
