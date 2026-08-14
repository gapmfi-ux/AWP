/**
 * EMPLOYEE LIST MODULE - Updated with Terminate functionality
 */

let currentEmployees = [];

function initEmployeeList() {
  console.log('Employee List module loaded');
  loadEmployeeList();
  populateDepartmentDropdown();
  populateDesignationDropdown();
}

// ============================================
// LOAD EMPLOYEE LIST
// ============================================

async function loadEmployeeList() {
  try {
    showLoadingModal('Loading employees...');
    const employees = await API.getEmployees();
    currentEmployees = Array.isArray(employees) ? employees : [];
    renderEmployeeTable(currentEmployees);
    updateEmployeeCount(currentEmployees.length);
  } catch (error) {
    console.error('Error loading employees:', error);
    showToast('Failed to load employees', 'error');
  } finally {
    hideLoadingModal();
  }
}

// ============================================
// RENDER EMPLOYEE TABLE
// ============================================

function renderEmployeeTable(employees) {
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
  
  const rows = employees.map(emp => {
    const staffNumber = emp['Staff Number'] || emp.staffNumber || '';
    const fullName = emp['Full Name'] || emp.name || '';
    const department = emp['Department'] || emp.department || '';
    const designation = emp['Designation'] || emp.designation || '';
    const email = emp['Email'] || emp.email || '';
    const ssnit = emp['SSNIT'] || emp.ssnit || '';
    const status = emp['Status'] || emp.status || 'Active';
    const isActive = status.toLowerCase() === 'active';
    
    return `
      <tr class="${!isActive ? 'inactive-row' : ''}">
        <td>${escapeHtml(staffNumber)}</td>
        <td>${escapeHtml(fullName)}</td>
        <td>${escapeHtml(department)}</td>
        <td>${escapeHtml(designation)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${escapeHtml(ssnit)}</td>
        <td style="text-align:center; white-space:nowrap;">
          <button class="action-btn" onclick="editEmployee('${escapeJs(staffNumber)}')" title="Edit Employee">
            <i class="fas fa-edit"></i>
          </button>
          ${isActive ? `
            <button class="action-btn terminate-btn" onclick="terminateEmployee('${escapeJs(staffNumber)}')" title="Terminate Employee (Set Inactive)">
              <i class="fas fa-times-circle" style="color:#e53e3e;"></i>
            </button>
          ` : `
            <span style="font-size:10px; color:#718096; background:#edf2f7; padding:2px 8px; border-radius:4px;">Inactive</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
  
  tbody.innerHTML = rows;
}

// ============================================
// TERMINATE EMPLOYEE
// ============================================

async function terminateEmployee(staffNumber) {
  if (!staffNumber) return;
  
  // Confirm before terminating
  const confirmTerminate = confirm(`Are you sure you want to terminate employee ${staffNumber}? This will set their status to Inactive.`);
  if (!confirmTerminate) return;
  
  try {
    showLoadingModal('Terminating employee...');
    
    // Get current employee data
    const employee = await API.getEmployeeByStaffNumber(staffNumber);
    if (!employee) {
      showToast('Employee not found', 'error');
      return;
    }
    
    // Update status to Inactive
    employee.Status = 'Inactive';
    employee.status = 'Inactive';
    
    // Save the updated employee
    const response = await API.updateEmployee(employee);
    
    if (response && response.success !== false) {
      showToast(`Employee ${staffNumber} terminated successfully`, 'success');
      // Refresh the employee list
      await loadEmployeeList();
    } else {
      showToast('Failed to terminate employee: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error terminating employee:', error);
    showToast('Error terminating employee', 'error');
  } finally {
    hideLoadingModal();
  }
}

// ============================================
// FILTER EMPLOYEE LIST
// ============================================

function filterEmployeeList() {
  const searchInput = document.getElementById('employeeSearch');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  if (!searchTerm) {
    renderEmployeeTable(currentEmployees);
    return;
  }
  
  const filtered = currentEmployees.filter(emp => {
    const staffNumber = (emp['Staff Number'] || emp.staffNumber || '').toLowerCase();
    const fullName = (emp['Full Name'] || emp.name || '').toLowerCase();
    const department = (emp['Department'] || emp.department || '').toLowerCase();
    const designation = (emp['Designation'] || emp.designation || '').toLowerCase();
    
    return staffNumber.includes(searchTerm) || 
           fullName.includes(searchTerm) || 
           department.includes(searchTerm) || 
           designation.includes(searchTerm);
  });
  
  renderEmployeeTable(filtered);
  updateEmployeeCount(filtered.length);
}

// ============================================
// UPDATE EMPLOYEE COUNT
// ============================================

function updateEmployeeCount(count) {
  // You can add a count display if needed
}

// ============================================
// POPULATE DROPDOWNS
// ============================================

async function populateDepartmentDropdown() {
  try {
    const departments = await API.getAllDepartments();
    const select = document.getElementById('empDepartment');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    if (departments && Array.isArray(departments)) {
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading departments:', error);
  }
}

async function populateDesignationDropdown() {
  try {
    const designations = await API.getAllDesignations();
    const select = document.getElementById('empDesignation');
    if (!select) return;
    
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    if (designations && Array.isArray(designations)) {
      designations.forEach(desg => {
        const option = document.createElement('option');
        option.value = desg;
        option.textContent = desg;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading designations:', error);
  }
}

// ============================================
// SHOW ADD EMPLOYEE MODAL
// ============================================

function showAddEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;
  
  // Reset form
  document.getElementById('empStaffNumber').value = '';
  document.getElementById('empName').value = '';
  document.getElementById('empDepartment').value = '';
  document.getElementById('empDesignation').value = '';
  document.getElementById('empEmail').value = '';
  document.getElementById('empSSNIT').value = '';
  document.getElementById('empGhanaCard').value = '';
  document.getElementById('empBasicSalary').value = '';
  document.getElementById('empEmployeePFRate').value = '5.5';
  document.getElementById('empEmployerPFRate').value = '5';
  document.getElementById('empTaxRelief').value = '';
  document.getElementById('empLoanMonthly').value = '';
  
  // Reset checkboxes
  document.getElementById('empHasPF').checked = false;
  document.getElementById('empHasTaxRelief').checked = false;
  document.getElementById('empHasAllowances').checked = false;
  document.getElementById('empHasLoan').checked = false;
  
  // Hide conditional fields
  document.getElementById('empPFFieldsWrapper').style.display = 'none';
  document.getElementById('empTaxReliefFieldWrapper').style.display = 'none';
  document.getElementById('empAllowanceArea').style.display = 'none';
  document.getElementById('empLoanFieldWrapper').style.display = 'none';
  
  // Clear allowance list
  document.getElementById('empAllowanceList').innerHTML = '';
  
  // Set title
  document.getElementById('employeeModalTitle').textContent = 'Add Employee';
  
  // Show modal
  modal.style.display = 'flex';
  modal.classList.add('show');
  
  // Reset payroll preview
  recalcPayrollPreviewFromEmployeeModal();
}

function closeEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
}

// ============================================
// EDIT EMPLOYEE
// ============================================

async function editEmployee(staffNumber) {
  try {
    showLoadingModal('Loading employee data...');
    const employee = await API.getEmployeeByStaffNumber(staffNumber);
    if (!employee) {
      showToast('Employee not found', 'error');
      return;
    }
    
    const modal = document.getElementById('employeeModal');
    if (!modal) return;
    
    // Populate form
    document.getElementById('empStaffNumber').value = employee['Staff Number'] || employee.staffNumber || '';
    document.getElementById('empName').value = employee['Full Name'] || employee.name || '';
    document.getElementById('empDepartment').value = employee['Department'] || employee.department || '';
    document.getElementById('empDesignation').value = employee['Designation'] || employee.designation || '';
    document.getElementById('empEmail').value = employee['Email'] || employee.email || '';
    document.getElementById('empSSNIT').value = employee['SSNIT'] || employee.ssnit || '';
    document.getElementById('empGhanaCard').value = employee['Ghana Card'] || employee.ghanaCard || '';
    document.getElementById('empBasicSalary').value = employee['Basic Salary'] || employee.basicSalary || '';
    document.getElementById('empEmployeePFRate').value = employee['Employee PF Rate (%)'] || employee.employeePFrate || '5.5';
    document.getElementById('empEmployerPFRate').value = employee['Employer PF Rate (%)'] || employee.employerPFrate || '5';
    document.getElementById('empTaxRelief').value = employee['Tax Relief'] || employee.taxRelief || '';
    document.getElementById('empLoanMonthly').value = employee['Monthly Loan'] || employee.loanMonthly || '';
    
    // Set checkboxes
    const hasPF = parseFloat(employee['Employee PF Rate (%)'] || employee.employeePFrate || 0) > 0;
    document.getElementById('empHasPF').checked = hasPF;
    if (hasPF) {
      document.getElementById('empPFFieldsWrapper').style.display = 'flex';
    }
    
    const hasTaxRelief = parseFloat(employee['Tax Relief'] || employee.taxRelief || 0) > 0;
    document.getElementById('empHasTaxRelief').checked = hasTaxRelief;
    if (hasTaxRelief) {
      document.getElementById('empTaxReliefFieldWrapper').style.display = 'block';
    }
    
    const hasLoan = parseFloat(employee['Monthly Loan'] || employee.loanMonthly || 0) > 0;
    document.getElementById('empHasLoan').checked = hasLoan;
    if (hasLoan) {
      document.getElementById('empLoanFieldWrapper').style.display = 'block';
    }
    
    // Set title
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Recalculate preview
    recalcPayrollPreviewFromEmployeeModal();
    
  } catch (error) {
    console.error('Error loading employee:', error);
    showToast('Failed to load employee data', 'error');
  } finally {
    hideLoadingModal();
  }
}

// ============================================
// SAVE EMPLOYEE
// ============================================

async function saveEmployee() {
  try {
    const staffNumber = document.getElementById('empStaffNumber').value.trim();
    const name = document.getElementById('empName').value.trim();
    
    if (!staffNumber || !name) {
      showToast('Staff Number and Name are required', 'warning');
      return;
    }
    
    const employeeData = {
      staff: staffNumber,
      name: name,
      department: document.getElementById('empDepartment').value,
      designation: document.getElementById('empDesignation').value,
      email: document.getElementById('empEmail').value.trim(),
      ssnit: document.getElementById('empSSNIT').value.trim(),
      ghanaCard: document.getElementById('empGhanaCard').value.trim(),
      basicSalary: parseFloat(document.getElementById('empBasicSalary').value) || 0,
      employeePFrate: parseFloat(document.getElementById('empEmployeePFRate').value) || 0,
      employerPFrate: parseFloat(document.getElementById('empEmployerPFRate').value) || 0,
      taxRelief: parseFloat(document.getElementById('empTaxRelief').value) || 0,
      loanMonthly: parseFloat(document.getElementById('empLoanMonthly').value) || 0,
      status: 'Active'
    };
    
    // Get allowances from the allowance list
    const allowanceRows = document.querySelectorAll('#empAllowanceList .allowance-row');
    const allowances = [];
    allowanceRows.forEach(row => {
      const type = row.querySelector('.allowance-type')?.value || '';
      const amount = parseFloat(row.querySelector('.allowance-amount')?.value) || 0;
      const effectiveDate = row.querySelector('.allowance-date')?.value || new Date().toISOString().split('T')[0];
      if (type && amount > 0) {
        allowances.push({ type, amount, effectiveDate });
      }
    });
    
    // Check if editing or adding
    const isEdit = document.getElementById('employeeModalTitle').textContent.includes('Edit');
    
    let response;
    if (isEdit) {
      // Add existing employee data for update
      const existing = await API.getEmployeeByStaffNumber(staffNumber);
      if (existing) {
        Object.assign(employeeData, existing);
        employeeData.status = existing.Status || existing.status || 'Active';
      }
      response = await API.updateEmployee(employeeData);
    } else {
      response = await API.addEmployee(employeeData);
    }
    
    if (response && response.success !== false) {
      showToast(`Employee ${staffNumber} ${isEdit ? 'updated' : 'added'} successfully`, 'success');
      closeEmployeeModal();
      
      // Save allowances if any
      if (allowances.length > 0) {
        for (const allowance of allowances) {
          try {
            await API.saveAllowance(staffNumber, allowance.type, allowance.amount, allowance.effectiveDate);
          } catch (e) {
            console.warn('Failed to save allowance:', e);
          }
        }
      }
      
      await loadEmployeeList();
    } else {
      showToast('Failed to save employee: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error saving employee:', error);
    showToast('Error saving employee', 'error');
  }
}

// ============================================
// TOGGLE FUNCTIONS FOR EMPLOYEE MODAL
// ============================================

function toggleEmployeePFFields() {
  const checked = document.getElementById('empHasPF').checked;
  const wrapper = document.getElementById('empPFFieldsWrapper');
  if (wrapper) {
    wrapper.style.display = checked ? 'flex' : 'none';
  }
  recalcPayrollPreviewFromEmployeeModal();
}

function toggleEmployeeTaxReliefField() {
  const checked = document.getElementById('empHasTaxRelief').checked;
  const wrapper = document.getElementById('empTaxReliefFieldWrapper');
  if (wrapper) {
    wrapper.style.display = checked ? 'block' : 'none';
  }
  recalcPayrollPreviewFromEmployeeModal();
}

function toggleEmployeeLoanFields() {
  const checked = document.getElementById('empHasLoan').checked;
  const wrapper = document.getElementById('empLoanFieldWrapper');
  if (wrapper) {
    wrapper.style.display = checked ? 'block' : 'none';
  }
  recalcPayrollPreviewFromEmployeeModal();
}

function toggleEmployeeAllowanceField() {
  const checked = document.getElementById('empHasAllowances').checked;
  const area = document.getElementById('empAllowanceArea');
  if (area) {
    area.style.display = checked ? 'block' : 'none';
  }
  if (checked && document.getElementById('empAllowanceList').children.length === 0) {
    addEmployeeAllowanceRow();
  }
  recalcPayrollPreviewFromEmployeeModal();
}

// ============================================
// ALLOWANCE ROWS
// ============================================

function addEmployeeAllowanceRow() {
  const container = document.getElementById('empAllowanceList');
  if (!container) return;
  
  const row = document.createElement('div');
  row.className = 'allowance-row';
  row.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:4px;';
  row.innerHTML = `
    <select class="allowance-type" style="flex:1; padding:4px 8px; border:1px solid #e2e8f0; border-radius:4px; font-size:12px; height:28px;">
      <option value="">Select Type</option>
      <option value="Housing">Housing</option>
      <option value="Transport">Transport</option>
      <option value="Meal">Meal</option>
      <option value="Medical">Medical</option>
      <option value="Education">Education</option>
      <option value="Other">Other</option>
    </select>
    <input type="number" class="allowance-amount" placeholder="Amount" step="0.01" min="0" style="width:100px; padding:4px 8px; border:1px solid #e2e8f0; border-radius:4px; font-size:12px; height:28px;" oninput="recalcPayrollPreviewFromEmployeeModal()">
    <input type="date" class="allowance-date" style="width:130px; padding:4px 8px; border:1px solid #e2e8f0; border-radius:4px; font-size:12px; height:28px;">
    <button type="button" class="btn-danger" style="padding:2px 8px; font-size:12px; height:28px; width:28px; display:flex; align-items:center; justify-content:center;" onclick="this.closest('.allowance-row').remove(); recalcPayrollPreviewFromEmployeeModal();">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(row);
  
  // Set default date to today
  const dateInput = row.querySelector('.allowance-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// ============================================
// PAYROLL PREVIEW CALCULATION
// ============================================

function recalcPayrollPreviewFromEmployeeModal() {
  const basicSalary = parseFloat(document.getElementById('empBasicSalary').value) || 0;
  
  // Get allowances
  const allowanceRows = document.querySelectorAll('#empAllowanceList .allowance-row');
  let totalAllowances = 0;
  allowanceRows.forEach(row => {
    const amount = parseFloat(row.querySelector('.allowance-amount')?.value) || 0;
    totalAllowances += amount;
  });
  
  const grossSalary = basicSalary + totalAllowances;
  
  // Calculate deductions
  const employeePension = grossSalary * 0.055;
  
  let employeePF = 0;
  if (document.getElementById('empHasPF').checked) {
    const rate = parseFloat(document.getElementById('empEmployeePFRate').value) || 0;
    employeePF = basicSalary * (rate / 100);
  }
  
  const taxRelief = document.getElementById('empHasTaxRelief').checked ? 
    parseFloat(document.getElementById('empTaxRelief').value) || 0 : 0;
  
  const totalDeductions = employeePension + employeePF + taxRelief;
  const taxableIncome = Math.max(0, grossSalary - totalDeductions);
  
  // Calculate PAYE using tax brackets
  const paye = calculatePAYE(taxableIncome);
  const netPay = taxableIncome - paye;
  
  // Update preview
  document.getElementById('empPreviewGross').textContent = grossSalary.toFixed(2);
  document.getElementById('empPreviewPension').textContent = employeePension.toFixed(2);
  document.getElementById('empPreviewPf').textContent = employeePF.toFixed(2);
  document.getElementById('empPreviewTaxable').textContent = taxableIncome.toFixed(2);
  document.getElementById('empPreviewPaye').textContent = paye.toFixed(2);
  document.getElementById('empPreviewNet').textContent = netPay.toFixed(2);
}

// ============================================
// DEPARTMENT/DESIGNATION HELPERS
// ============================================

function toggleNewDepartmentField() {
  const field = document.getElementById('newDepartmentField');
  if (field) {
    field.style.display = field.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleNewDesignationField() {
  const field = document.getElementById('newDesignationField');
  if (field) {
    field.style.display = field.style.display === 'none' ? 'block' : 'none';
  }
}

async function saveNewDepartment() {
  const input = document.getElementById('newDepartmentInput');
  const name = input?.value.trim();
  if (!name) {
    showToast('Please enter a department name', 'warning');
    return;
  }
  
  const select = document.getElementById('empDepartment');
  if (select) {
    // Check if already exists
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === name) {
        showToast('Department already exists', 'warning');
        return;
      }
    }
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
    select.value = name;
  }
  
  input.value = '';
  document.getElementById('newDepartmentField').style.display = 'none';
  showToast('Department added successfully', 'success');
}

async function saveNewDesignation() {
  const input = document.getElementById('newDesignationInput');
  const name = input?.value.trim();
  if (!name) {
    showToast('Please enter a designation name', 'warning');
    return;
  }
  
  const select = document.getElementById('empDesignation');
  if (select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === name) {
        showToast('Designation already exists', 'warning');
        return;
      }
    }
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
    select.value = name;
  }
  
  input.value = '';
  document.getElementById('newDesignationField').style.display = 'none';
  showToast('Designation added successfully', 'success');
}

function cancelNewDepartment() {
  document.getElementById('newDepartmentField').style.display = 'none';
  document.getElementById('newDepartmentInput').value = '';
}

function cancelNewDesignation() {
  document.getElementById('newDesignationField').style.display = 'none';
  document.getElementById('newDesignationInput').value = '';
}

function onDepartmentSelect(select) {
  // Handle department selection if needed
}

function onDesignationSelect(select) {
  // Handle designation selection if needed
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

function escapeJs(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.initEmployeeList = initEmployeeList;
window.loadEmployeeList = loadEmployeeList;
window.filterEmployeeList = filterEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.editEmployee = editEmployee;
window.saveEmployee = saveEmployee;
window.terminateEmployee = terminateEmployee;
window.toggleEmployeePFFields = toggleEmployeePFFields;
window.toggleEmployeeTaxReliefField = toggleEmployeeTaxReliefField;
window.toggleEmployeeLoanFields = toggleEmployeeLoanFields;
window.toggleEmployeeAllowanceField = toggleEmployeeAllowanceField;
window.addEmployeeAllowanceRow = addEmployeeAllowanceRow;
window.recalcPayrollPreviewFromEmployeeModal = recalcPayrollPreviewFromEmployeeModal;
window.toggleNewDepartmentField = toggleNewDepartmentField;
window.toggleNewDesignationField = toggleNewDesignationField;
window.saveNewDepartment = saveNewDepartment;
window.saveNewDesignation = saveNewDesignation;
window.cancelNewDepartment = cancelNewDepartment;
window.cancelNewDesignation = cancelNewDesignation;
window.onDepartmentSelect = onDepartmentSelect;
window.onDesignationSelect = onDesignationSelect;
