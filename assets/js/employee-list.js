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
    const employees = (Array.isArray(serverRecords) ? serverRecords : serverRecords.records || [])
      .map(rec => ({
        staff: rec['Staff Number'] || rec['STAFF_NUMBER'] || rec['Staff'] || '',
        name: rec['Full Name'] || rec['FULL_NAME'] || rec['Name'] || '',
        department: rec['Department'] || '',
        designation: rec['Designation'] || '',
        email: rec['Email'] || '',
        ssnit: rec['SSNIT'] || '',
        ghanaCard: rec['Ghana Card'] || ''
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
      // updateEmployee expects a formData object with staff field
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
    // resp will be server-side record or null
    // map to client shape
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

/* Utility functions (escapeHtml, showToast) remain the same as before */

window.initEmployeeList = initEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.filterEmployeeList = filterEmployeeList;
window.editEmployee = editEmployee;
