/* Payroll client logic (localStorage stubs + compute logic)
   Updated: loan checkbox (payHasLoan), pf default checked, exports
*/

function initPayroll() {
  renderPayrollTable();
  const pp = document.getElementById('payPeriod');
  if (pp && !pp.value) {
    const d = new Date();
    pp.value = d.toISOString().slice(0,7);
  }
  loadPayrollRows();

  // Bind Add Employee Pay button if present (safety)
  const addBtn = document.querySelector('.payroll-controls .primary-btn');
  if (addBtn) {
    addBtn.removeEventListener('click', _addPayBtnHandler);
    addBtn.addEventListener('click', _addPayBtnHandler);
  }
  function _addPayBtnHandler(e){ showAddPayModal(); }
}

function getPayrollRows() {
  try { return JSON.parse(localStorage.getItem('awp_payroll_rows') || '[]'); }
  catch (e) { return []; }
}
function savePayrollRows(arr) { localStorage.setItem('awp_payroll_rows', JSON.stringify(arr)); }

function loadPayrollRows() {
  const rows = getPayrollRows();
  const period = (document.getElementById('payPeriod') || {}).value || null;
  const filtered = period ? rows.filter(r => r.period === period) : rows;
  renderPayrollTable(filtered);
}

function renderPayrollTable(rows) {
  const data = rows || getPayrollRows();
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="13">No payroll rows</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(r => {
    return `<tr data-staff="${escapeHtml(r.staff)}">
      <td>${escapeHtml(r.staff)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.designation||'')}</td>
      <td>${formatMoney(r.basicSalary)}</td>
      <td>${formatMoney(r.employeePFAmount)}</td>
      <td>${formatMoney(r.pf10Amount)}</td>
      <td>${formatMoney(r.taxRelief||0)}</td>
      <td>${formatMoney(r.taxableIncome)}</td>
      <td>${formatMoney(r.paye)}</td>
      <td>${formatMoney(r.totalDeduction)}</td>
      <td>${formatMoney(r.netPay)}</td>
      <td>${formatMoney(r.employer13Amount)}</td>
      <td>${formatMoney(r.employerPFAmount)}</td>
    </tr>`;
  }).join('');
  document.querySelectorAll('#payrollTableBody tr').forEach(tr=>{
    tr.addEventListener('click', () => {
      const staff = tr.getAttribute('data-staff');
      if (staff) showPayslipFor(staff);
    });
  });
}

function showAddPayModal() {
  const m = document.getElementById('addPayModal');
  if (!m) return;
  // reset fields
  ['payStaffNumber','payName','payDepartment','payDesignation','payBasicSalary','payEmployeePF','payEmployerPF','payReliefAmount','payLoanMonthly','payLoanFrom','payLoanTo'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) {
      if (el.type==='number') el.value = '0';
      else el.value = '';
    }
  });
  const ePF = document.getElementById('payEmployeePF');
  const erPF = document.getElementById('payEmployerPF');
  if (ePF) ePF.value = '5.5';
  if (erPF) erPF.value = '5';
  // defaults: PF checked, tax relief unchecked, loan unchecked
  const pfChk = document.getElementById('payPF');
  if (pfChk) pfChk.checked = true;
  const trChk = document.getElementById('payTaxRelief');
  if (trChk) trChk.checked = false;
  const loanChk = document.getElementById('payHasLoan');
  if (loanChk) loanChk.checked = false;

  document.getElementById('pfFields').style.display = pfChk && pfChk.checked ? 'block' : 'none';
  document.getElementById('taxReliefField').style.display = 'none';
  document.getElementById('loanFields').style.display = 'none';

  m.classList.add('show');
  m.style.display = 'flex';
}

function closeAddPayModal() {
  const m = document.getElementById('addPayModal');
  if (!m) return;
  m.classList.remove('show');
  m.style.display = 'none';
}

function autoFillEmployeeDetails(staffNumber) {
  const staff = (staffNumber || '').trim();
  if (!staff) return;
  const employees = JSON.parse(localStorage.getItem('awp_employees')||'[]');
  const emp = employees.find(e => e.staff === staff);
  if (emp) {
    const nameEl = document.getElementById('payName');
    const deptEl = document.getElementById('payDepartment');
    const desEl = document.getElementById('payDesignation');
    if (nameEl) nameEl.value = emp.name || '';
    if (deptEl) deptEl.value = emp.department || '';
    if (desEl) desEl.value = emp.designation || '';
  }
}

function togglePFFields() {
  const c = document.getElementById('payPF');
  const f = document.getElementById('pfFields');
  if (!c || !f) return;
  f.style.display = c.checked ? 'block' : 'none';
}

function toggleTaxReliefField() {
  const c = document.getElementById('payTaxRelief');
  const f = document.getElementById('taxReliefField');
  if (!c || !f) return;
  f.style.display = c.checked ? 'block' : 'none';
}

function toggleLoanFields() {
  const c = document.getElementById('payHasLoan');
  const f = document.getElementById('loanFields');
  if (!f) return;
  f.style.display = (c && c.checked) ? 'block' : 'none';
}

function saveEmployeePay() {
  const staff = (document.getElementById('payStaffNumber') || {}).value || '';
  const name = (document.getElementById('payName') || {}).value || '';
  if (!staff.trim() || !name.trim()) { alert('Staff and name required'); return; }
  const designation = (document.getElementById('payDesignation') || {}).value || '';
  const basicSalary = parseFloat((document.getElementById('payBasicSalary') || {}).value) || 0;
  const pfChecked = document.getElementById('payPF') ? document.getElementById('payPF').checked : true;
  const employeePFpct = parseFloat((document.getElementById('payEmployeePF') || {}).value) || 0;
  const employerPFpct = parseFloat((document.getElementById('payEmployerPF') || {}).value) || 0;
  const taxReliefChecked = document.getElementById('payTaxRelief') ? document.getElementById('payTaxRelief').checked : false;
  const reliefAmount = taxReliefChecked ? (parseFloat(document.getElementById('payReliefAmount').value) || 0) : 0;
  const hasLoan = document.getElementById('payHasLoan') ? document.getElementById('payHasLoan').checked : false;
  const loanMonthly = hasLoan ? (parseFloat(document.getElementById('payLoanMonthly').value)||0) : 0;
  const period = (document.getElementById('payPeriod')||{}).value || null;

  const calc = computePayrollRow({
    basicSalary,
    employeePFpct,
    employerPFpct,
    reliefAmount,
    loanMonthly,
    pfChecked
  });

  const rows = getPayrollRows();
  const newRow = {
    staff: staff.trim(),
    name: name.trim(),
    designation,
    basicSalary,
    employeePFpct,
    employerPFpct,
    employeePFAmount: calc.employeePFAmount,
    pf10Amount: calc.pf10Amount,
    taxRelief: reliefAmount,
    taxableIncome: calc.taxableIncome,
    paye: calc.paye,
    totalDeduction: calc.totalDeduction,
    netPay: calc.netPay,
    employer13Amount: calc.employer13Amount,
    employerPFAmount: calc.employerPFAmount,
    loanMonthly,
    period
  };
  rows.push(newRow);
  savePayrollRows(rows);
  loadPayrollRows();
  closeAddPayModal();
}

function computePayrollRow({ basicSalary=0, employeePFpct=5.5, employerPFpct=5, reliefAmount=0, loanMonthly=0, pfChecked=true }) {
  const employeePFAmount = pfChecked ? roundToTwo(basicSalary * (employeePFpct/100)) : 0;
  const pf10Amount = roundToTwo(basicSalary * 0.10);
  const taxableIncome = Math.max(0, roundToTwo(basicSalary - employeePFAmount - reliefAmount - loanMonthly));
  const paye = roundToTwo(taxableIncome * 0.10);
  const totalDeduction = roundToTwo(employeePFAmount + pf10Amount + paye + loanMonthly);
  const netPay = roundToTwo(basicSalary - totalDeduction);
  const employer13Amount = roundToTwo(basicSalary * 0.13);
  const employerPFAmount = pfChecked ? roundToTwo(basicSalary * (employerPFpct/100)) : 0;
  return { employeePFAmount, pf10Amount, taxableIncome, paye, totalDeduction, netPay, employer13Amount, employerPFAmount };
}

function runPayroll() {
  alert('Payroll run executed (client-side demo). Replace with backend call to persist runs.');
}

function roundToTwo(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function formatMoney(n) { return (typeof n === 'number') ? n.toFixed(2) : '0.00'; }
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>\"'`]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;','`':'&#96;'}[c])); }

// Exports for inline handlers and main loader
window.initPayroll = initPayroll;
window.showAddPayModal = showAddPayModal;
window.closeAddPayModal = closeAddPayModal;
window.saveEmployeePay = saveEmployeePay;
window.autoFillEmployeeDetails = autoFillEmployeeDetails;
window.togglePFFields = togglePFFields;
window.toggleTaxReliefField = toggleTaxReliefField;
window.toggleLoanFields = toggleLoanFields;
window.showPayslipFor = function(staff){ localStorage.setItem('awp_selected_payslip_staff', staff); if (typeof loadModule === 'function') loadModule('payslip'); };
window.runPayroll = runPayroll;
