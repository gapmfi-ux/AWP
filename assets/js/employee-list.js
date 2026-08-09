/* Employee list client logic - merged Add Employee + Add Employee Pay (server-backed) */

// Cache for dropdown options
let departmentOptions = [];
let designationOptions = [];
let allowanceTypeOptions = [];

/* ============== Initialization & server employee loading ============== */

function initEmployeeList() {
  renderEmployeeTable();
  loadDropdownOptions();
}

async function loadDropdownOptions() {
  try {
    // Load departments from server
    const depts = await API.getAllDepartments().catch(() => []);
    departmentOptions = Array.isArray(depts) ? depts : [];
    
    // Load designations from server
    const desigs = await API.getAllDesignations().catch(() => []);
    designationOptions = Array.isArray(desigs) ? desigs : [];
    
    // Load allowance types from server
    const types = await API.getAllAllowanceTypes().catch(() => []);
    allowanceTypeOptions = Array.isArray(types) ? types : [];
    
    populateDepartmentSelect();
    populateDesignationSelect();
  } catch (err) {
    console.warn('Error loading dropdown options:', err);
  }
}

function populateDepartmentSelect() {
  const select = document.getElementById('empDepartment');
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select...</option>';
  departmentOptions.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });
  if (currentValue && departmentOptions.includes(currentValue)) {
    select.value = currentValue;
  }
}

function populateDesignationSelect() {
  const select = document.getElementById('empDesignation');
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select...</option>';
  designationOptions.forEach(desig => {
    const opt = document.createElement('option');
    opt.value = desig;
    opt.textContent = desig;
    select.appendChild(opt);
  });
  if (currentValue && designationOptions.includes(currentValue)) {
    select.value = currentValue;
  }
}

function populateAllowanceTypeSelect(selectElement) {
  if (!selectElement) return;
  const currentValue = selectElement.value;
  selectElement.innerHTML = '<option value="">Select type...</option>';
  allowanceTypeOptions.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    selectElement.appendChild(opt);
  });
  // Add an option for "Add New"
  const addNewOpt = document.createElement('option');
  addNewOpt.value = '__ADD_NEW__';
  addNewOpt.textContent = '➕ Add New...';
  addNewOpt.style.fontWeight = 'bold';
  addNewOpt.style.color = '#4361ee';
  selectElement.appendChild(addNewOpt);
  if (currentValue && allowanceTypeOptions.includes(currentValue)) {
    selectElement.value = currentValue;
  }
}

// Handlers for select changes
function onDepartmentSelect(select) {
  // If user selected a value, we're good
}

function onDesignationSelect(select) {
  // If user selected a value, we're good
}

/* ============== Add New Department - Inline Toggle ============== */

function toggleNewDepartmentField() {
  const field = document.getElementById('newDepartmentField');
  if (!field) return;
  const isVisible = field.style.display !== 'none';
  field.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    document.getElementById('newDepartmentInput')?.focus();
  }
}

function cancelNewDepartment() {
  document.getElementById('newDepartmentField').style.display = 'none';
  document.getElementById('newDepartmentInput').value = '';
}

async function saveNewDepartment() {
  const input = document.getElementById('newDepartmentInput');
  const name = input.value.trim();
  if (!name) {
    showToast('Please enter a department name', 'warning');
    return;
  }
  try {
    // Check if already exists
    if (departmentOptions.includes(name)) {
      showToast('Department already exists', 'warning');
      cancelNewDepartment();
      return;
    }
    
    // Add to local options
    departmentOptions.push(name);
    departmentOptions.sort();
    populateDepartmentSelect();
    document.getElementById('empDepartment').value = name;
    showToast('Department added successfully', 'success');
    cancelNewDepartment();
  } catch (err) {
    showToast('Error adding department: ' + err.message, 'error');
  }
}

/* ============== Add New Designation - Inline Toggle ============== */

function toggleNewDesignationField() {
  const field = document.getElementById('newDesignationField');
  if (!field) return;
  const isVisible = field.style.display !== 'none';
  field.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    document.getElementById('newDesignationInput')?.focus();
  }
}

function cancelNewDesignation() {
  document.getElementById('newDesignationField').style.display = 'none';
  document.getElementById('newDesignationInput').value = '';
}

async function saveNewDesignation() {
  const input = document.getElementById('newDesignationInput');
  const name = input.value.trim();
  if (!name) {
    showToast('Please enter a designation name', 'warning');
    return;
  }
  try {
    // Check if already exists
    if (designationOptions.includes(name)) {
      showToast('Designation already exists', 'warning');
      cancelNewDesignation();
      return;
    }
    
    // Add to local options
    designationOptions.push(name);
    designationOptions.sort();
    populateDesignationSelect();
    document.getElementById('empDesignation').value = name;
    showToast('Designation added successfully', 'success');
    cancelNewDesignation();
  } catch (err) {
    showToast('Error adding designation: ' + err.message, 'error');
  }
}

/* ============== Add New Allowance Type - Inline ============== */

function toggleNewAllowanceField(selectElement) {
  const row = selectElement.closest('.allowance-row');
  if (!row) return;
  
  let newField = row.querySelector('.new-allowance-field');
  if (!newField) {
    newField = document.createElement('div');
    newField.className = 'new-allowance-field';
    newField.style.cssText = 'display:flex; gap:4px; align-items:center; margin-top:4px;';
    newField.innerHTML = `
      <input type="text" class="new-allowance-input" placeholder="Enter new allowance type" style="flex:1; padding:4px 8px; border:1px solid #4361ee; border-radius:6px; font-size:12px; height:28px; background:#f0f4ff;">
      <button type="button" class="btn-primary" onclick="saveNewAllowance(this)" style="padding:2px 10px; font-size:11px; height:28px;">Add</button>
      <button type="button" class="btn-secondary" onclick="cancelNewAllowance(this)" style="padding:2px 8px; font-size:11px; height:28px;">Cancel</button>
    `;
    row.appendChild(newField);
  }
  newField.style.display = 'flex';
  const input = newField.querySelector('.new-allowance-input');
  if (input) input.focus();
}

function cancelNewAllowance(btn) {
  const row = btn.closest('.allowance-row');
  if (!row) return;
  const field = row.querySelector('.new-allowance-field');
  if (field) field.remove();
}

async function saveNewAllowance(btn) {
  const row = btn.closest('.allowance-row');
  if (!row) return;
  
  const input = row.querySelector('.new-allowance-input');
  const name = input.value.trim();
  if (!name) {
    showToast('Please enter an allowance type name', 'warning');
    return;
  }
  
  try {
    if (allowanceTypeOptions.includes(name)) {
      showToast('Allowance type already exists', 'warning');
      const field = row.querySelector('.new-allowance-field');
      if (field) field.remove();
      return;
    }
    
    allowanceTypeOptions.push(name);
    allowanceTypeOptions.sort();
    
    // Update the select in this row
    const select = row.querySelector('.emp-allowance-type');
    if (select) {
      populateAllowanceTypeSelect(select);
      select.value = name;
    }
    
    showToast('Allowance type added successfully', 'success');
    const field = row.querySelector('.new-allowance-field');
    if (field) field.remove();
    recalcPayrollPreviewFromEmployeeModal();
  } catch (err) {
    showToast('Error adding allowance type: ' + err.message, 'error');
  }
}

/* ============== Add Allowance Row ============== */

function addEmployeeAllowanceRow(type = '', amount = '') {
  const container = document.getElementById('empAllowanceList');
  if (!container) return;

  if (allowanceTypeOptions.length === 0) {
    loadDropdownOptions();
  }

  const row = document.createElement('div');
  row.className = 'allowance-row';
  row.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;';

  const select = document.createElement('select');
  select.className = 'emp-allowance-type';
  select.style.cssText = 'flex:1; min-width:120px; padding:4px 8px; font-size:12px; border:1px solid #e2e8f0; border-radius:6px; height:28px; background:#fff;';
  select.onchange = function() {
    if (this.value === '__ADD_NEW__') {
      // Show inline new allowance field
      toggleNewAllowanceField(this);
      // Reset the select to previous value or empty
      setTimeout(() => {
        if (this.value === '__ADD_NEW__') {
          this.value = '';
        }
      }, 50);
    }
    recalcPayrollPreviewFromEmployeeModal();
  };
  
  populateAllowanceTypeSelect(select);
  if (type && allowanceTypeOptions.includes(type)) {
    select.value = type;
  } else if (type) {
    allowanceTypeOptions.push(type);
    allowanceTypeOptions.sort();
    populateAllowanceTypeSelect(select);
    select.value = type;
  }

  const amt = document.createElement('input');
  amt.type = 'number';
  amt.className = 'emp-allowance-amount';
  amt.placeholder = '0.00';
  amt.step = '0.01';
  amt.min = '0';
  amt.value = amount;
  amt.style.cssText = 'width:100px; padding:4px 8px; text-align:right; font-size:12px; border:1px solid #e2e8f0; border-radius:6px; height:28px;';
  amt.oninput = recalcPayrollPreviewFromEmployeeModal;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-outline';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.onclick = function() {
    row.remove();
    recalcPayrollPreviewFromEmployeeModal();
  };
  removeBtn.style.cssText = 'padding:4px 8px; font-size:12px; height:28px;';

  row.appendChild(select);
  row.appendChild(amt);
  row.appendChild(removeBtn);

  container.appendChild(row);
  recalcPayrollPreviewFromEmployeeModal();
}
async function getEmployeesFromServer() {
  try {
    showLoadingModal('Loading employees...');
    const resp = await API.getEmployees({ useCache: false });
    const serverRecords = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp || []);
    const employees = serverRecords.map(rec => ({
      staff: rec['Staff Number'] || rec.staff || '',
      name: rec['Full Name'] || rec.name || '',
      department: rec['Department'] || '',
      designation: rec['Designation'] || '',
      email: rec['Email'] || '',
      ssnit: rec['SSNIT'] || '',
      ghanaCard: rec['Ghana Card'] || '',
      basicSalary: parseFloat(rec['Basic Salary'] || rec.basicSalary || 0) || 0,
      employeePFrate: parseFloat(rec['Employee PF Rate (%)'] || rec.employeePFrate || 0) || 0,
      employerPFrate: parseFloat(rec['Employer PF Rate (%)'] || rec.employerPFrate || 0) || 0,
      taxRelief: parseFloat(rec['Tax Relief Amount'] || rec.taxRelief || 0) || 0
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

/* ============== Modal show / hide / populate ============== */

async function showAddEmployeeModal(editData) {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;

  // Load dropdown options if not loaded
  if (departmentOptions.length === 0) {
    await loadDropdownOptions();
  }

  const isEdit = !!editData;
  document.getElementById('employeeModalTitle').textContent = isEdit ? 'Edit Employee' : 'Add Employee';

  // Clear fields
  ['empStaffNumber','empName','empEmail','empSSNIT','empGhanaCard','empBasicSalary',
   'empEmployeePFRate','empEmployerPFRate','empTaxRelief','empLoanMonthly'].forEach(id=>{
    const el = document.getElementById(id); if (el) el.value = '';
  });

  // Reset selects to default
  document.getElementById('empDepartment').value = '';
  document.getElementById('empDesignation').value = '';

  // Hide new department/designation fields
  cancelNewDepartment();
  cancelNewDesignation();

  // clear allowances
  document.getElementById('empAllowanceList').innerHTML = '';
  document.getElementById('empAllowanceArea').style.display = 'none';
  document.getElementById('empPFFieldsWrapper').style.display = 'none';
  document.getElementById('empTaxReliefFieldWrapper').style.display = 'none';
  document.getElementById('empLoanFieldWrapper').style.display = 'none';

  // reset toggles
  document.getElementById('empHasPF').checked = false;
  document.getElementById('empHasTaxRelief').checked = false;
  document.getElementById('empHasAllowances').checked = false;
  document.getElementById('empHasLoan').checked = false;

  toggleEmployeePFFields();
  toggleEmployeeTaxReliefField();
  toggleEmployeeAllowanceField();
  toggleEmployeeLoanFields();
  recalcPayrollPreviewFromEmployeeModal();

  if (isEdit) {
    // populate from editData (client-shaped)
    document.getElementById('empStaffNumber').value = editData.staff || '';
    document.getElementById('empName').value = editData.name || '';
    
    // Set department if exists in options
    if (editData.department && departmentOptions.includes(editData.department)) {
      document.getElementById('empDepartment').value = editData.department;
    } else if (editData.department) {
      // Add it to options if it doesn't exist
      departmentOptions.push(editData.department);
      departmentOptions.sort();
      populateDepartmentSelect();
      document.getElementById('empDepartment').value = editData.department;
    }
    
    if (editData.designation && designationOptions.includes(editData.designation)) {
      document.getElementById('empDesignation').value = editData.designation;
    } else if (editData.designation) {
      designationOptions.push(editData.designation);
      designationOptions.sort();
      populateDesignationSelect();
      document.getElementById('empDesignation').value = editData.designation;
    }
    
    document.getElementById('empEmail').value = editData.email || '';
    document.getElementById('empSSNIT').value = editData.ssnit || '';
    document.getElementById('empGhanaCard').value = editData.ghanaCard || '';
    document.getElementById('empBasicSalary').value = editData.basicSalary || '';

    // PF
    if (editData.employeePFrate) {
      document.getElementById('empHasPF').checked = true;
      document.getElementById('empEmployeePFRate').value = editData.employeePFrate;
      document.getElementById('empEmployerPFRate').value = editData.employerPFrate || 0;
    }

    // tax relief
    if (editData.taxRelief && Number(editData.taxRelief) > 0) {
      document.getElementById('empHasTaxRelief').checked = true;
      document.getElementById('empTaxRelief').value = editData.taxRelief;
    }

    // loan
    if (editData.loanMonthly && Number(editData.loanMonthly) > 0) {
      document.getElementById('empHasLoan').checked = true;
      document.getElementById('empLoanMonthly').value = editData.loanMonthly;
    }

    // allowances: fetch from server and populate if present
    const allowances = await API.getAllowancesByStaff(editData.staff).catch(()=>[]);
    if (allowances && allowances.length > 0) {
      document.getElementById('empHasAllowances').checked = true;
      toggleEmployeeAllowanceField();
      allowances.forEach(a => addEmployeeAllowanceRow(a.type, a.amount));
    }

    modal.dataset.editStaff = editData.staff;
    toggleEmployeePFFields();
    toggleEmployeeTaxReliefField();
    toggleEmployeeLoanFields();
    recalcPayrollPreviewFromEmployeeModal();
  } else {
    delete modal.dataset.editStaff;
  }

  modal.classList.add('show');
  document.getElementById('empStaffNumber')?.focus();
}

function closeEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (modal) modal.classList.remove('show');
  // Clean up any open new fields
  cancelNewDepartment();
  cancelNewDesignation();
}

/* ============== Edit flow ============== */

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
      loanMonthly: parseFloat(rec['Loan Monthly'] || 0) || 0
    };
    await showAddEmployeeModal(client);
  } catch (err) {
    console.error('Error fetching employee', err);
    showToast('Employee not found.', 'warning');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Save employee + automatic payroll ============== */

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
  const hasLoan = document.getElementById('empHasLoan').checked;
  const loanMonthly = hasLoan ? (parseFloat(document.getElementById('empLoanMonthly').value) || 0) : 0;

  // gather allowances from modal
  const allowances = [];
  document.querySelectorAll('#empAllowanceList .allowance-row').forEach(row => {
    const typeSelect = row.querySelector('.emp-allowance-type');
    let type = (typeSelect?.value || '').trim();
    // Check if "Add New" was selected
    if (type === '__ADD_NEW__') {
      const newType = prompt('Enter new allowance type:');
      if (newType && newType.trim()) {
        type = newType.trim();
        if (!allowanceTypeOptions.includes(type)) {
          allowanceTypeOptions.push(type);
          allowanceTypeOptions.sort();
          populateAllowanceTypeSelect(typeSelect);
        }
        typeSelect.value = type;
      } else {
        return; // Skip this row
      }
    }
    const amt = parseFloat(row.querySelector('.emp-allowance-amount')?.value) || 0;
    if (type && amt > 0) allowances.push({ type, amount: amt });
  });

  const modal = document.getElementById('employeeModal');
  const editStaff = modal?.dataset?.editStaff || null;

  // Employee record to send to server (direct object, not nested)
  const employeeRecord = {
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
    loanMonthly
  };

  try {
    showLoadingModal(editStaff ? 'Updating employee...' : 'Adding employee...');
    let empResp;
    if (editStaff) {
      empResp = await API.updateEmployee(employeeRecord);
    } else {
      empResp = await API.addEmployee(employeeRecord);
    }

    if (!(empResp && (empResp.success !== false))) {
      throw new Error((empResp && empResp.error) ? empResp.error : 'Failed to save employee');
    }

    // Always create payroll record if basic salary > 0
    if (basicSalary > 0) {
      const calc = computePayrollRow({
        basicSalary: basicSalary,
        allowances: allowances,
        employeePFpct: employeePFrate,
        employerPFpct: employerPFrate,
        reliefAmount: taxRelief,
        loanMonthly: loanMonthly,
        pfChecked: hasPF
      });

      const payrollData = {
        staffNumber: staff,
        fullName: name,
        designation: designation,
        payPeriod: (document.getElementById('payPeriod') ? document.getElementById('payPeriod').value : (new Date()).toISOString().slice(0,7)),
        basicSalary: basicSalary,
        allowances: allowances,
        totalAllowances: calc.totalAllowances,
        grossSalary: calc.grossSalary,
        employeePension: calc.employeePension,
        employeePf: calc.employeePf,
        pf10Amount: calc.pf10Amount,
        taxRelief: taxRelief,
        taxableIncome: calc.taxableIncome,
        paye: calc.paye,
        totalDeduction: calc.totalDeduction,
        netPay: calc.netPay,
        employerPension: calc.employerPension,
        employerPf: calc.employerPf,
        loanMonthly: loanMonthly,
        loanFrom: '',
        loanTo: ''
      };

      const payResp = await API.savePayrollRun(payrollData);
      if (!(payResp && (payResp.success !== false))) {
        console.warn('Payroll save returned error', payResp);
        showToast('Employee saved but failed to create payroll record', 'warning');
      } else {
        showToast(editStaff ? 'Employee updated with payroll' : 'Employee added with payroll', 'success');
      }
    } else {
      showToast(editStaff ? 'Employee updated' : 'Employee added', 'success');
    }

    await renderEmployeeTable();
    closeEmployeeModal();
    delete modal.dataset.editStaff;
  } catch (err) {
    console.error('Error saving employee', err);
    showToast('Failed to save employee: ' + (err.message || err), 'error');
  } finally {
    hideLoadingModal();
  }
}

/* ============== Allowance rows inside modal ============== */

function addEmployeeAllowanceRow(type = '', amount = '') {
  const container = document.getElementById('empAllowanceList');
  if (!container) return;

  // Make sure allowance types are loaded
  if (allowanceTypeOptions.length === 0) {
    loadDropdownOptions();
  }

  const row = document.createElement('div');
  row.className = 'allowance-row';
  row.style.cssText = 'display:flex; gap:8px; align-items:center;';

  const select = document.createElement('select');
  select.className = 'emp-allowance-type';
  select.style.cssText = 'flex:1; padding:4px 8px; font-size:12px; border:1px solid #e2e8f0; border-radius:6px; height:28px; background:#fff;';
  select.onchange = function() {
    if (this.value === '__ADD_NEW__') {
      addNewAllowanceType(this);
    }
    recalcPayrollPreviewFromEmployeeModal();
  };
  
  // Populate select with options
  populateAllowanceTypeSelect(select);
  if (type && allowanceTypeOptions.includes(type)) {
    select.value = type;
  } else if (type) {
    // Add the type if it doesn't exist
    allowanceTypeOptions.push(type);
    allowanceTypeOptions.sort();
    populateAllowanceTypeSelect(select);
    select.value = type;
  }

  const amt = document.createElement('input');
  amt.type = 'number';
  amt.className = 'emp-allowance-amount';
  amt.placeholder = '0.00';
  amt.step = '0.01';
  amt.min = '0';
  amt.value = amount;
  amt.style.cssText = 'width:120px; padding:4px 8px; text-align:right; font-size:12px; border:1px solid #e2e8f0; border-radius:6px; height:28px;';
  amt.oninput = recalcPayrollPreviewFromEmployeeModal;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-outline';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.onclick = function() {
    row.remove();
    recalcPayrollPreviewFromEmployeeModal();
  };
  removeBtn.style.cssText = 'padding:4px 8px; font-size:12px;';

  row.appendChild(select);
  row.appendChild(amt);
  row.appendChild(removeBtn);

  container.appendChild(row);

  recalcPayrollPreviewFromEmployeeModal();
}

/* ============== Toggles show/hide ============== */

function toggleEmployeePFFields() {
  const checked = document.getElementById('empHasPF').checked;
  const wrapper = document.getElementById('empPFFieldsWrapper');
  if (wrapper) {
    wrapper.style.display = checked ? 'flex' : 'none';
  }
}

function toggleEmployeeTaxReliefField() {
  const checked = document.getElementById('empHasTaxRelief').checked;
  const wrapper = document.getElementById('empTaxReliefFieldWrapper');
  if (wrapper) {
    wrapper.style.display = checked ? 'block' : 'none';
  }
}

function toggleEmployeeAllowanceField() {
  const checked = document.getElementById('empHasAllowances').checked;
  const area = document.getElementById('empAllowanceArea');
  if (area) {
    area.style.display = checked ? 'block' : 'none';
  }
  if (!checked) {
    document.getElementById('empAllowanceList').innerHTML = '';
    recalcPayrollPreviewFromEmployeeModal();
  }
}

function toggleEmployeeLoanFields() {
  const checked = document.getElementById('empHasLoan').checked;
  const wrapper = document.getElementById('empLoanFieldWrapper');
  if (wrapper) {
    wrapper.style.display = checked ? 'block' : 'none';
  }
}

/* ============== Auto-fill payroll defaults when staff is selected ============== */

async function autoFillEmployeePayrollDefaults(staffNumber) {
  if (!staffNumber || staffNumber.trim() === '') return;
  try {
    const rec = await API.getEmployeeByStaffNumber(staffNumber).catch(()=>null);
    if (!rec) return;
    const basic = parseFloat(rec['Basic Salary'] || rec.basicSalary || 0) || 0;
    const empPf = parseFloat(rec['Employee PF Rate (%)'] || rec.employeePFrate || 0) || 0;
    const erPf = parseFloat(rec['Employer PF Rate (%)'] || rec.employerPFrate || 0) || 0;
    const tr = parseFloat(rec['Tax Relief Amount'] || rec.taxRelief || 0) || 0;
    const loan = parseFloat(rec['Loan Monthly'] || 0) || 0;

    if (basic > 0) document.getElementById('empBasicSalary').value = basic;
    if (empPf) { document.getElementById('empHasPF').checked = true; document.getElementById('empEmployeePFRate').value = empPf; }
    if (erPf) document.getElementById('empEmployerPFRate').value = erPf;
    if (tr && tr > 0) { document.getElementById('empHasTaxRelief').checked = true; document.getElementById('empTaxRelief').value = tr; }
    if (loan && loan > 0) { document.getElementById('empHasLoan').checked = true; document.getElementById('empLoanMonthly').value = loan; }

    toggleEmployeePFFields();
    toggleEmployeeTaxReliefField();
    toggleEmployeeLoanFields();

    // Load allowances
    const allowances = await API.getAllowancesByStaff(staffNumber).catch(()=>[]);
    if (allowances && allowances.length > 0) {
      document.getElementById('empHasAllowances').checked = true;
      toggleEmployeeAllowanceField();
      allowances.forEach(a => addEmployeeAllowanceRow(a.type, a.amount));
    }

    recalcPayrollPreviewFromEmployeeModal();
  } catch (err) {
    console.warn('autoFillEmployeePayrollDefaults error', err);
  }
}

/* ============== Payroll calculation helpers (client-side preview) ============== */

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
  // ==========================================
  // STEP 1: Calculate Gross Salary
  // ==========================================
  const totalAllowances = roundToTwo(allowances.reduce((s,a) => s + (parseFloat(a.amount) || 0), 0));
  const grossSalary = roundToTwo(basicSalary + totalAllowances);
  
  // ==========================================
  // STEP 2: Calculate Deductions (Before Tax)
  // ==========================================
  
  // Employee Pension = 5.5% of Gross
  const employeePension = roundToTwo(grossSalary * 0.055);
  
  // Employee PF = Employee PF Rate × Basic Salary (if PF eligible)
  const employeePf = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
  
  // Tax Relief (user defined)
  const taxRelief = roundToTwo(reliefAmount || 0);
  
  // Total Deductions before tax
  const totalDeductionsBeforeTax = roundToTwo(employeePension + employeePf + taxRelief);
  
  // ==========================================
  // STEP 3: Calculate Taxable Amount
  // ==========================================
  const taxableAmount = Math.max(0, roundToTwo(grossSalary - totalDeductionsBeforeTax));
  
  // ==========================================
  // STEP 4: Calculate PAYE on Taxable Amount
  // ==========================================
  const paye = calculatePAYE(taxableAmount);
  
  // ==========================================
  // STEP 5: Calculate Net Pay
  // ==========================================
  const netPay = roundToTwo(taxableAmount - paye);
  
  // ==========================================
  // STEP 6: Calculate Take-Home Pay
  // ==========================================
  const loanMonthlyAmount = roundToTwo(loanMonthly || 0);
  const takeHomePay = roundToTwo(netPay - loanMonthlyAmount);
  
  // ==========================================
  // STEP 7: Calculate Employer Costs
  // ==========================================
  
  // Employer Pension = 13% of Gross
  const employerPension = roundToTwo(grossSalary * 0.13);
  
  // Employer PF = Employer PF Rate × Basic Salary (if PF eligible)
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

function recalcPayrollPreviewFromEmployeeModal() {
  const basicSalary = parseFloat(document.getElementById('empBasicSalary').value) || 0;
  const pfChecked = document.getElementById('empHasPF').checked;
  const employeePFpct = pfChecked ? (parseFloat(document.getElementById('empEmployeePFRate').value) || 5.5) : 0;
  const employerPFpct = pfChecked ? (parseFloat(document.getElementById('empEmployerPFRate').value) || 5) : 0;
  const taxReliefChecked = document.getElementById('empHasTaxRelief').checked;
  const reliefAmount = taxReliefChecked ? (parseFloat(document.getElementById('empTaxRelief').value) || 0) : 0;
  const loanChecked = document.getElementById('empHasLoan').checked;
  const loanMonthly = loanChecked ? (parseFloat(document.getElementById('empLoanMonthly').value) || 0) : 0;

  // allowances
  const allowances = [];
  document.querySelectorAll('#empAllowanceList .allowance-row').forEach(row => {
    const typeSelect = row.querySelector('.emp-allowance-type');
    let type = (typeSelect?.value || '').trim();
    if (type === '__ADD_NEW__') type = '';
    const amt = parseFloat(row.querySelector('.emp-allowance-amount')?.value) || 0;
    if (type && amt > 0) allowances.push({ type, amount: amt });
  });

  // Always calculate preview using CORRECTED structure
  const calc = computePayrollRow({
    basicSalary,
    allowances,
    employeePFpct,
    employerPFpct,
    reliefAmount,
    loanMonthly,
    pfChecked
  });

  updateEmployeeCalcPreview(calc);
}

function updateEmployeeCalcPreview(calc) {
  document.getElementById('empPreviewGross').textContent = formatMoney(calc.grossSalary);
  document.getElementById('empPreviewNet').textContent = formatMoney(calc.netPay);
  document.getElementById('empPreviewPaye').textContent = formatMoney(calc.paye);
  document.getElementById('empPreviewTaxable').textContent = formatMoney(calc.taxableAmount);
  document.getElementById('empPreviewPension').textContent = formatMoney(calc.employeePension);
  document.getElementById('empPreviewPf').textContent = formatMoney(calc.employeePf);
}

/* ============== Search ============== */

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

/* ============== Utilities ============== */

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

/* ============== Exports ============== */

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
window.addEmployeeAllowanceRow = addEmployeeAllowanceRow;
window.recalcPayrollPreviewFromEmployeeModal = recalcPayrollPreviewFromEmployeeModal;
window.toggleNewDepartmentField = toggleNewDepartmentField;
window.cancelNewDepartment = cancelNewDepartment;
window.saveNewDepartment = saveNewDepartment;
window.toggleNewDesignationField = toggleNewDesignationField;
window.cancelNewDesignation = cancelNewDesignation;
window.saveNewDesignation = saveNewDesignation;
window.onDepartmentSelect = onDepartmentSelect;
window.onDesignationSelect = onDesignationSelect;
