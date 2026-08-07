/* Employee list client logic (localStorage-backed stub) */

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
  tbody.innerHTML = employees.map(e => `
    <tr>
      <td>${escapeHtml(e.staff || '')}</td>
      <td>${escapeHtml(e.name || '')}</td>
      <td>${escapeHtml(e.department || '')}</td>
      <td>${escapeHtml(e.designation || '')}</td>
      <td>${escapeHtml(e.email || '')}</td>
      <td>${escapeHtml(e.ssnit || '')}</td>
      <td>${escapeHtml(e.ghanaCard || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">No employees found</td></tr>';
}

function showAddEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;
  document.getElementById('employeeModalTitle').textContent = 'Add Employee';
  // clear form
  ['empStaffNumber','empName','empDepartment','empDesignation','empEmail','empSSNIT','empGhanaCard'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  modal.style.display = 'flex';
}

function closeEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;
  modal.style.display = 'none';
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
  // if staff exists, update
  const idx = employees.findIndex(x=>x.staff === staff);
  const record = { staff, name, department, designation, email, ssnit, ghanaCard };
  if (idx >= 0) {
    employees[idx] = record;
  } else {
    employees.push(record);
  }
  saveEmployees(employees);
  renderEmployeeTable();
  closeEmployeeModal();
}

function filterEmployeeList() {
  const q = document.getElementById('employeeSearch').value.trim().toLowerCase();
  const employees = getEmployees();
  const filtered = employees.filter(e => {
    return (e.staff||'').toLowerCase().includes(q)
      || (e.name||'').toLowerCase().includes(q)
      || (e.department||'').toLowerCase().includes(q)
      || (e.designation||'').toLowerCase().includes(q);
  });
  const tbody = document.getElementById('employeeTableBody');
  if (!tbody) return;
  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td>${escapeHtml(e.staff||'')}</td>
      <td>${escapeHtml(e.name||'')}</td>
      <td>${escapeHtml(e.department||'')}</td>
      <td>${escapeHtml(e.designation||'')}</td>
      <td>${escapeHtml(e.email||'')}</td>
      <td>${escapeHtml(e.ssnit||'')}</td>
      <td>${escapeHtml(e.ghanaCard||'')}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">No employees found</td></tr>';
}

// Utility
function escapeHtml(str){
  if (!str) return '';
  return String(str).replace(/[&<>"'`]/g, s=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;','`':'&#96;'
  }[s]));
}

// Exports
window.initEmployeeList = initEmployeeList;
window.showAddEmployeeModal = showAddEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.filterEmployeeList = filterEmployeeList;
