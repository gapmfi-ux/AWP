/* Employee list client logic - Server-backed */

// Ensure we have utility functions (escapeHtml, showToast). Use existing global if available; otherwise provide small fallbacks.
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

// small toast fallback if global showToast is missing
function showToast(message, type = 'info') {
  // If a global implementation exists, use it
  if (window.showToast && window.showToast !== showToast) {
    return window.showToast(message, type);
  }

  // Otherwise use a minimal inline toast
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 21000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 380px;
      display: none;
      transition: all 0.3s ease;
      color: #fff;
    `;
    document.body.appendChild(toast);
  }

  const colors = {
    success: '#38a169',
    error: '#e53e3e',
    warning: '#d69e2e',
    info: '#4361ee'
  };
  toast.style.background = colors[type] || colors.info;
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

// Initialization
function initEmployeeList() {
  renderEmployeeTable();
}

// Get employees from server (normalizes server format)
async function getEmployeesFromServer() {
  try {
    showLoadingModal('Loading employees...');
    const resp = await API.getEmployees({ useCache: false });
    const serverRecords = resp || [];
    // If server returned an object wrapping records, try to find arrays
    let arr = [];
    if (Array.isArray(serverRecords)) {
      arr = serverRecords;
    } else if (serverRecords.records && Array.isArray(serverRecords.records)) {
      arr = serverRecords.records;
    } else if (serverRecords.data && Array.isArray(serverRecords.data)) {
      arr = serverRecords.data;
    } else {
      // If server returned a single object, wrap it
      if (typeof serverRecords === 'object' && Object.keys(serverRecords).length > 0) {
        arr = [serverRecords];
      } else {
        arr = [];
      }
    }

    const employees = arr.map(rec => ({
      staff: rec['Staff Number'] || rec['STAFF_NUMBER'] || rec.staff || '',
      name: rec['Full Name'] || rec['FULL_NAME'] || rec.name || '',
      department: rec['Department'] || rec.department || '',
      designation: rec['Designation'] || rec.designation || '',
      email: rec['Email'] || rec.email || '',
      ssnit: rec['SSNIT'] || rec.ssnit || '',
      ghanaCard: rec['Ghana Card'] || rec['GHANA_CARD'] || rec.ghanaCard || ''
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

  const modal = document.getElementById('employeeModal');
  const editStaff = modal?.dataset?.editStaff || null;

  const record = {
    staff: staff,
    name: name,
    department: department,
    designation: designation,
    email: email,
    ssnit: ssnit,
    ghanaCard: ghanaCard
  };

  try {
    showLoadingModal(editStaff ? 'Updating employee...' : 'Adding employee...');
    if (editStaff) {
      // updateEmployee now expects the employee object directly
      const resp = await API.updateEmployee(record, { useCache: false });
      // API.request rejects on error so reaching here means success response
      showToast('Employee updated successfully!', 'success');
    } else {
      const resp = await API.addEmployee(record, { useCache: false });
      showToast('Employee added successfully!', 'success');
    }
    await renderEmployeeTable();
    closeEmployeeModal();
    delete modal.dataset.editStaff;
  } catch (err) {
    console.error('Error saving employee', err);
    showToast((err && err.message) ? err.message : 'Failed to save employee', 'error');
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
      ghanaCard: rec['Ghana Card'] || ''
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

// Export
window.initEmployeeList = initEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.filterEmployeeList = filterEmployeeList;
window.editEmployee = editEmployee;
