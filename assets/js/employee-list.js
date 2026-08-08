/* Employee list client logic - merged Add Employee + Add Employee Pay (server-backed) */

/* ============== Initialization & server employee loading ============== */

function initEmployeeList() {
  renderEmployeeTable();
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

  const isEdit = !!editData;
  document.getElementById('employeeModalTitle').textContent = isEdit ? 'Edit Employee' : 'Add Employee';

  // Clear fields
  ['empStaffNumber','empName','empDepartment','empDesignation','empEmail','empSSNIT','empGhanaCard','empBasicSalary',
   'empEmployeePFRate','empEmployerPFRate','empTaxRelief','empLoanMonthly'].forEach(id=>{
    const el = document.getElementById(id); if (el) el.value = '';
  });

  // clear allowances
  document.getElementById('empAllowanceList').innerHTML = '';
  document.getElementById('empAllowanceArea').style.display = 'none';

  // reset toggles
  document.getElementById('empHasPF').checked = false;
  document.getElementById('empHasTaxRelief').checked = false;
  document.getElementById('empHasAllowances').checked = false;
  document.getElementById('empHasLoan').checked = false;
  document.getElementById('empCreatePayroll').checked = false;

  toggleEmployeePFFields();
  toggleEmployeeTaxReliefField();
  toggleEmployeeAllowanceField();
  toggleEmployeeLoanFields();
  recalcPayrollPreviewFromEmployeeModal();

  if (isEdit) {
    // populate from editData (client-shaped)
    document.getElementById('empStaffNumber').value = editData.staff || '';
    document.getElementById('empName').value = editData.name || '';
    document.getElementById('empDepartment').value = editData.department || '';
    document.getElementById('empDesignation').value = editData.designation || '';
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
}

/* ============== Edit flow ============== */

async function editEmployee(staff) {
  if (!staff) return;
  try {
    showLoadingModal('Loading employee...');
    const resp = await API.getEmployeeByStaffNumber(staff);
    // map server rec to client shape
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

/* ============== Save employee + optional payroll ============== */

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
  const createPayroll = document.getElementById('empCreatePayroll').checked;

  // gather allowances from modal
  const allowances = [];
  document.querySelectorAll('#empAllowanceList .allowance-row').forEach(row => {
    const type = (row.querySelector('.emp-allowance-type')?.value || '').trim();
    const amt = parseFloat(row.querySelector('.emp-allowance-amount')?.value) || 0;
    if (type && amt > 0) allowances.push({ type, amount: amt });
  });

  const modal = document.getElementById('employeeModal');
  const editStaff = modal?.dataset?.editStaff || null;

  // Employee record to send to server (server expects formData JSON)
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

    // Optionally create payroll record
    if (createPayroll) {
      if (basicSalary <= 0) {
        showToast('Cannot create payroll record: Basic salary required', 'warning');
      } else {
        // compute payroll using client compute helper
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
          showToast('Employee and payroll record saved', 'success');
        }
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

  const row = document.createElement('div');
  row.className = 'allowance-row';
  row.style.cssText = 'display:flex; gap:8px; align-items:center;';

  const select = document.createElement('input');
  select.type = 'text';
  select.className = 'emp-allowance-type';
  select.placeholder = 'Type (e.g. Housing)';
  select.value = type;
  select.style.cssText = 'flex:1; padding:6px;';

  const amt = document.createElement('input');
  amt.type = 'number';
  amt.className = 'emp-allowance-amount';
  amt.placeholder = '0.00';
  amt.step = '0.01';
  amt.min = '0';
  amt.value = amount;
  amt.style.cssText = 'width:120px; padding:6px; text-align:right;';
  amt.oninput = recalcPayrollPreviewFromEmployeeModal;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-outline';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.onclick = function() {
    row.remove();
    recalcPayrollPreviewFromEmployeeModal();
  };
  removeBtn.style.cssText = 'padding:6px 8px;';

  row.appendChild(select);
  row.appendChild(amt);
  row.appendChild(removeBtn);

  container.appendChild(row);

  recalcPayrollPreviewFromEmployeeModal();
}

/* ============== Toggles show/hide ============== */

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
  const checked = document.getElementById('empHasAllowances').checked;
  document.getElementById('empAllowanceArea').style.display = checked ? 'block' : 'none';
  if (!checked) {
    document.getElementById('empAllowanceList').innerHTML = '';
    recalcPayrollPreviewFromEmployeeModal();
  }
}

function toggleEmployeeLoanFields() {
  const checked = document.getElementById('empHasLoan').checked;
  document.getElementById('empLoanField').style.display = checked ? 'block' : 'none';
}

/* ============== Auto-fill payroll defaults when staff is selected ============== */

async function autoFillEmployeePayrollDefaults(staffNumber) {
  // If staff exists, fetch server record and prefill payroll defaults
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

    // load allowances
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

function computePayrollRow({ basicSalary = 0, allowances = [], employeePFpct = 5, employerPFpct = 5, reliefAmount = 0, loanMonthly = 0, pfChecked = true }) {
  const totalAllowances = allowances.reduce((s,a)=>s + (parseFloat(a.amount)||0), 0);
  const grossSalary = roundToTwo(basicSalary + totalAllowances);
  const employeePension = roundToTwo(grossSalary * 0.055);
  const employeePf = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
  const taxableIncome = Math.max(0, roundToTwo(grossSalary - employeePension - employeePf - (reliefAmount || 0)));
  const paye = calculatePAYE(taxableIncome);
  const netPay = roundToTwo(taxableIncome - paye);
  const pf10Amount = roundToTwo(basicSalary * 0.10);
  const totalDeduction = roundToTwo(employeePension + employeePf + pf10Amount + paye + loanMonthly);
  const employerPension = roundToTwo(grossSalary * 0.13);
  const employerPf = pfChecked ? roundToTwo(basicSalary * (employerPFpct / 100)) : 0;
  const takeHomePay = roundToTwo(netPay - loanMonthly);

  return {
    totalAllowances,
    grossSalary,
    employeePension,
    employeePf,
    taxableIncome,
    paye,
    netPay,
    pf10Amount,
    totalDeduction,
    employerPension,
    employerPf,
    takeHomePay
  };
}

function recalcPayrollPreviewFromEmployeeModal() {
  const basicSalary = parseFloat(document.getElementById('empBasicSalary').value) || 0;
  const pfChecked = document.getElementById('empHasPF').checked;
  const employeePFpct = pfChecked ? (parseFloat(document.getElementById('empEmployeePFRate').value) || 0) : 0;
  const employerPFpct = pfChecked ? (parseFloat(document.getElementById('empEmployerPFRate').value) || 0) : 0;
  const taxReliefChecked = document.getElementById('empHasTaxRelief').checked;
  const reliefAmount = taxReliefChecked ? (parseFloat(document.getElementById('empTaxRelief').value) || 0) : 0;
  const loanChecked = document.getElementById('empHasLoan').checked;
  const loanMonthly = loanChecked ? (parseFloat(document.getElementById('empLoanMonthly').value) || 0) : 0;

  // allowances
  const allowances = [];
  document.querySelectorAll('#empAllowanceList .allowance-row').forEach(row => {
    const type = (row.querySelector('.emp-allowance-type')?.value || '').trim();
    const amt = parseFloat(row.querySelector('.emp-allowance-amount')?.value) || 0;
    if (type && amt > 0) allowances.push({ type, amount: amt });
  });

  const createPayroll = document.getElementById('empCreatePayroll').checked;
  if (!createPayroll) {
    // reset preview
    updateEmployeeCalcPreview(0,0,0,0,0,0);
    return;
  }

  const calc = computePayrollRow({
    basicSalary,
    allowances,
    employeePFpct,
    employerPFpct,
    reliefAmount,
    loanMonthly,
    pfChecked
  });

  updateEmployeeCalcPreview(calc.grossSalary, calc.netPay, calc.paye, calc.taxableIncome, calc.employeePension, calc.employeePf);
}

function updateEmployeeCalcPreview(gross, net, paye, taxable, pension, pf) {
  document.getElementById('empPreviewGross').textContent = formatMoney(gross);
  document.getElementById('empPreviewNet').textContent = formatMoney(net);
  document.getElementById('empPreviewPaye').textContent = formatMoney(paye);
  document.getElementById('empPreviewTaxable').textContent = formatMoney(taxable);
  document.getElementById('empPreviewPension').textContent = formatMoney(pension);
  document.getElementById('empPreviewPf').textContent = formatMoney(pf);
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
