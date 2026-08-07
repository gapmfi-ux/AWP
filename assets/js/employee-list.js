/* Employee list client logic (localStorage-backed stub)
   Updated: robust Add Employee button binding + modal show/hide exports
*/

function initEmployeeList() {
  renderEmployeeTable();

  // Try to bind directly if button is present
  const btn = document.getElementById('addEmployeeBtn');
  if (btn) {
    btn.removeEventListener('click', _directAddHandler);
    btn.addEventListener('click', _directAddHandler);
  } else {
    // Fallback: delegated click listener (handles module inserted later)
    document.removeEventListener('click', _delegatedClickHandler);
    document.addEventListener('click', _delegatedClickHandler);
  }

  // local functions
  function _directAddHandler(e) {
    showAddEmployeeModal();
  }
  function _delegatedClickHandler(e) {
    const el = e.target.closest && e.target.closest('#addEmployeeBtn');
    if (el) {
      showAddEmployeeModal();
    }
  }
}

function getEmployees() {
  try { return JSON.parse(localStorage.getItem('awp_employees') || '[]'); }
  catch (e) { return []; }
}
function saveEmployees(arr) { localStorage.setItem('awp_employees', JSON.stringify(arr)); }

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
  document.getElementById('employeeModalTitle').textContent = 'Add employee';
  // clear form
  ['empStaffNumber','empName','empDepartment','empDesignation','empEmail','empSSNIT','empGhanaCard'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  modal.classList.add('show');
  modal.style.display = 'flex';
}

function closeEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.style.display = 'none';
}

function saveEmployee() {
  const staff = (document.getElementById('empStaffNumber') || {}).value.trim();
  const name = (document.getElementById('empName') || {}).value.trim();
  if (!staff || !name) {
    alert('Staff number and name are required');
    return;
  }
  const department = (document.getElementById('empDepartment') || {}).value.trim();
  const designation = (document.getElementById('empDesignation') || {}).value.trim();
  const email = (document.getElementById('empEmail') || {}).value.trim();
  const ssnit = (document.getElementById('empSSNIT') || {}).value.trim();
  const ghanaCard = (document.getElementById('empGhanaCard') || {}).value.trim();

  const employees = getEmployees();
  const idx = employees.findIndex(x=>x.staff === staff);
  const record = { staff, name, department, designation, email, ssnit, ghanaCard };
  if (idx >= 0) employees[idx] = record; else employees.push(record);
  saveEmployees(employees);
  renderEmployeeTable();
  closeEmployeeModal();
}

function filterEmployeeList() {
  const q = (document.getElementById('employeeSearch') || {}).value || '';
  const qn = q.trim().toLowerCase();
  const employees = getEmployees();
  const filtered = employees.filter(e => {
    return (e.staff||'').toLowerCase().includes(qn)
      || (e.name||'').toLowerCase().includes(qn)
      || (e.department||'').toLowerCase().includes(qn)
      || (e.designation||'').toLowerCase().includes(qn);
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

// Utility escape
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
