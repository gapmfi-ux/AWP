/* Employee list client logic - Updated for new table design */

function initEmployeeList() {
  renderEmployeeTable();
}

function getEmployees() {
  try {
    return JSON.parse(localStorage.getItem('awp_employees') || '[]');
  } catch (e) {
    return [];
  }
}

function saveEmployees(arr) {
  localStorage.setItem('awp_employees', JSON.stringify(arr));
}

function renderEmployeeTable() {
  const employees = getEmployees();
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

function showAddEmployeeModal(editData) {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;
  
  const isEdit = !!editData;
  document.getElementById('employeeModalTitle').textContent = isEdit ? 'Edit Employee' : 'Add Employee';
  
  // Clear form
  ['empStaffNumber', 'empName', 'empDepartment', 'empDesignation', 'empEmail', 'empSSNIT', 'empGhanaCard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  if (isEdit) {
    document.getElementById('empStaffNumber').value = editData.staff || '';
    document.getElementById('empName').value = editData.name || '';
    document.getElementById('empDepartment').value = editData.department || '';
    document.getElementById('empDesignation').value = editData.designation || '';
    document.getElementById('empEmail').value = editData.email || '';
    document.getElementById('empSSNIT').value = editData.ssnit || '';
    document.getElementById('empGhanaCard').value = editData.ghanaCard || '';
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

function saveEmployee() {
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
  
  const employees = getEmployees();
  const modal = document.getElementById('employeeModal');
  const editStaff = modal?.dataset?.editStaff || null;
  
  const record = { staff, name, department, designation, email, ssnit, ghanaCard };
  
  if (editStaff) {
    const idx = employees.findIndex(x => x.staff === editStaff);
    if (idx >= 0) {
      employees[idx] = record;
      showToast('Employee updated successfully!', 'success');
    }
  } else {
    const idx = employees.findIndex(x => x.staff === staff);
    if (idx >= 0) {
      if (!confirm(`Employee "${staff}" already exists. Update it?`)) return;
      employees[idx] = record;
      showToast('Employee updated successfully!', 'success');
    } else {
      employees.push(record);
      showToast('Employee added successfully!', 'success');
    }
  }
  
  saveEmployees(employees);
  renderEmployeeTable();
  closeEmployeeModal();
  delete modal.dataset.editStaff;
}

function editEmployee(staff) {
  if (!staff) return;
  const employees = getEmployees();
  const emp = employees.find(e => e.staff === staff);
  if (emp) {
    showAddEmployeeModal(emp);
  } else {
    showToast('Employee not found.', 'warning');
  }
}

function filterEmployeeList() {
  const q = document.getElementById('employeeSearch')?.value.trim().toLowerCase() || '';
  const employees = getEmployees();
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

// Utility
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

// Exports
window.initEmployeeList = initEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.filterEmployeeList = filterEmployeeList;
window.editEmployee = editEmployee;
