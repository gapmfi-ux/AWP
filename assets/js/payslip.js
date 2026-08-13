// Payslip Module - client-side
// - Loads employee list
// - Generates payslip preview modal
// - Prints payslip
// - Sends payslip (single / bulk) with progress
// - Defensive fallbacks when API isn't available

(function() {
  'use strict';

  // Local cache
  let _employees = [];
  let _currentPayslip = null; // { staff, record, period, calc, html }
  let _sendAllAbort = { aborted: false };

  // ---------- Utilities (Payroll math, formatting) ----------
  function roundToTwo(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(n) {
    if (typeof n !== 'number' || isNaN(n)) return '0.00';
    return n.toFixed(2);
  }

  function formatCurrencyLocal(v) {
    if (v === null || v === undefined || v === '') return '0.00';
    const n = parseFloat(v) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"'`]/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;'
    }[ch]));
  }

  function getTaxBrackets() {
    // same brackets as other modules in repo
    return [
      { amount: 490, rate: 0 },
      { amount: 110, rate: 0.05 },
      { amount: 130, rate: 0.10 },
      { amount: 3166.67, rate: 0.175 },
      { amount: 16000, rate: 0.25 },
      { amount: 30520, rate: 0.30 },
      { amount: Infinity, rate: 0.35 }
    ];
  }

  function calculatePAYE(taxableIncome) {
    let remaining = taxableIncome;
    let totalTax = 0;
    const brackets = getTaxBrackets();
    for (let i = 0; i < brackets.length && remaining > 0; i++) {
      const b = brackets[i];
      const amount = Math.min(b.amount, remaining);
      totalTax += amount * b.rate;
      remaining -= amount;
    }
    return roundToTwo(totalTax);
  }

  function computePayroll({ basicSalary = 0, allowances = [], employeePFpct = 5.5, employerPFpct = 5, reliefAmount = 0, loanMonthly = 0, pfChecked = true }) {
    const totalAllowances = roundToTwo(allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0));
    const grossSalary = roundToTwo((parseFloat(basicSalary) || 0) + totalAllowances);

    const employeePension = roundToTwo((parseFloat(basicSalary) || 0) * 0.055);
    const employeePf = pfChecked ? roundToTwo((parseFloat(basicSalary) || 0) * (employeePFpct / 100)) : 0;
    const taxRelief = roundToTwo(reliefAmount || 0);
    const totalDeductionsBeforeTax = roundToTwo(employeePension + employeePf + taxRelief);

    const taxableAmount = Math.max(0, roundToTwo(grossSalary - totalDeductionsBeforeTax));
    const paye = calculatePAYE(taxableAmount);
    const netPay = roundToTwo(taxableAmount - paye);
    const loanMonthlyAmount = roundToTwo(loanMonthly || 0);
    const takeHome = roundToTwo(netPay - loanMonthlyAmount);

    const employerPension = roundToTwo((parseFloat(basicSalary) || 0) * 0.13);
    const employerPf = pfChecked ? roundToTwo((parseFloat(basicSalary) || 0) * (employerPFpct / 100)) : 0;

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
      takeHome,
      employerPension,
      employerPf
    };
  }

  // ---------- DOM helpers ----------
  function byId(id) { return document.getElementById(id); }

  function showToast(message, type) {
    // Reuse existing UI if available, else fallback to alert
    if (window.printUtils && typeof printUtils.showMessage === 'function') {
      printUtils.showMessage(message, type || 'info');
      return;
    }
    // lightweight toast
    const toastId = 'payslip-toast';
    let t = document.getElementById(toastId);
    if (!t) {
      t = document.createElement('div');
      t.id = toastId;
      t.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:10px 14px;border-radius:8px;z-index:9999;color:#fff;font-weight:600;';
      document.body.appendChild(t);
    }
    t.style.background = type === 'error' ? '#ef476f' : (type === 'success' ? '#06d6a0' : '#4361ee');
    t.textContent = message;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 3000);
  }

  // ---------- Employee list and UI ----------
  async function loadEmployeeList() {
    const tbody = byId('payslipListBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="padding:20px;text-align:center;color:#999"><i class="fas fa-spinner fa-spin"></i> Loading employees...</td></tr>`;

    try {
      let employees = [];
      if (typeof API !== 'undefined' && API) {
        // prefer cache option if supported
        if (typeof API.getEmployees === 'function') {
          employees = await API.getEmployees({ useCache: true }).catch(() => API.getEmployees().catch(() => []));
        } else if (typeof API.getAllEmployees === 'function') {
          employees = await API.getAllEmployees().catch(() => []);
        }
      }
      if (!Array.isArray(employees) || employees.length === 0) {
        // try local fallback (some modules expose getEmployeesFromServer)
        if (typeof window.getEmployeesFromServer === 'function') {
          employees = await window.getEmployeesFromServer();
        }
      }
      if (!Array.isArray(employees)) employees = [];

      _employees = employees.map(e => {
        return {
          staff: e.staff || e.staffNumber || e.staff_no || e.staffNo || e.staffcode || e.code || e.staffNumber,
          name: e.name || e.fullName || e['Full Name'] || e['fullName'] || e.full_name || '',
          designation: e.designation || e.design || '',
          email: e.email || e.Email || '',
          ssnit: e.ssnit || e.SSNIT || '',
          basicSalary: parseFloat(e.basicSalary || e['Basic Salary'] || e.basic || 0) || 0
        };
      });

      renderEmployeeListTable(_employees);
    } catch (err) {
      console.error('Failed to load employees', err);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:20px;text-align:center;color:#999">Error loading employees</td></tr>`;
      showToast('Error loading employees: ' + (err.message || err), 'error');
    }
  }

  function renderEmployeeListTable(list) {
    const tbody = byId('payslipListBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center;padding:18px;color:#999">
            <i class="fas fa-users"></i>
            <div>No employees found</div>
            <div style="font-size:12px;color:#bbb">Add employees in Payroll → Employee List</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(emp => {
      const staffEsc = escapeHtml(emp.staff || '');
      const nameEsc = escapeHtml(emp.name || '');
      const emailEsc = escapeHtml(emp.email || '');
      return `
        <tr data-staff="${staffEsc}">
          <td style="padding:10px 12px;">${staffEsc}</td>
          <td style="padding:10px 12px;">
            <div style="font-weight:700">${nameEsc}</div>
            <div style="font-size:12px;color:#6b7280">${escapeHtml(emp.designation || '')} ${emailEsc ? ' • ' + emailEsc : ''}</div>
          </td>
          <td style="padding:10px 12px;text-align:center;">
            <button class="btn-outline" data-action="preview" data-staff="${staffEsc}" title="Preview Payslip" style="margin-right:8px;">Preview</button>
            <button class="btn-primary" data-action="send" data-staff="${staffEsc}" title="Send Payslip">Send</button>
          </td>
        </tr>
      `;
    }).join('');

    // Delegate clicks
    tbody.querySelectorAll('button[data-action="preview"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const staff = e.currentTarget.dataset.staff;
        openPayslipModal(staff);
      });
    });
    tbody.querySelectorAll('button[data-action="send"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const staff = e.currentTarget.dataset.staff;
        sendPayslipForStaff(staff);
      });
    });
  }

  // ---------- Payslip generation & modal ----------
  async function openPayslipModal(staff) {
    try {
      // find employee in cache
      let emp = _employees.find(x => String(x.staff) === String(staff));
      if (!emp && typeof API !== 'undefined' && API && typeof API.getEmployeeByStaffNumber === 'function') {
        const resp = await API.getEmployeeByStaffNumber(staff).catch(() => null);
        if (resp) {
          emp = {
            staff: resp.staff || resp.staffNumber || staff,
            name: resp.name || resp['Full Name'] || '',
            email: resp.email || resp.Email || '',
            ssnit: resp.ssnit || resp.SSNIT || '',
            basicSalary: parseFloat(resp.basicSalary || resp['Basic Salary'] || 0) || 0,
            designation: resp.designation || resp.Designation || ''
          };
        }
      }
      if (!emp) {
        showToast('Employee not found: ' + staff, 'error');
        return;
      }

      // allowances: try API.getAllowancesByStaff
      let allowances = [];
      if (typeof API !== 'undefined' && API && typeof API.getAllowancesByStaff === 'function') {
        allowances = await API.getAllowancesByStaff(emp.staff).catch(() => []);
        // Normalize fallback structure
        if (!Array.isArray(allowances) && allowances && Array.isArray(allowances.data)) allowances = allowances.data;
      }

      // payroll metrics
      const pfChecked = true;
      const employeePFpct = (emp.employeePFrate !== undefined) ? parseFloat(emp.employeePFrate) : 5.5;
      const employerPFpct = (emp.employerPFrate !== undefined) ? parseFloat(emp.employerPFrate) : 5;
      const taxRelief = parseFloat(emp.taxRelief || 0) || 0;
      const loanMonthly = parseFloat(emp.loanMonthly || 0) || 0;

      const calc = computePayroll({
        basicSalary: parseFloat(emp.basicSalary || 0),
        allowances: allowances.map(a => ({ type: a.type || a.name || '', amount: parseFloat(a.amount || a.value || 0) || 0 })),
        employeePFpct,
        employerPFpct,
        reliefAmount: taxRelief,
        loanMonthly,
        pfChecked
      });

      // build payroll table HTML (compact)
      const payrollTableHtml = `
        <table class="payslip-table-compact" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
          <thead>
            <tr style="background:#f7f7f7">
              <th style="text-align:left;padding:8px">Description</th>
              <th style="text-align:right;padding:8px;width:150px">Amount (GHS)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:8px">Basic Salary</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(parseFloat(emp.basicSalary || 0))}</td></tr>
            <tr><td style="padding:8px">Total Allowances</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.totalAllowances)}</td></tr>
            <tr><td style="padding:8px">Gross Salary</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.grossSalary)}</td></tr>
            <tr><td style="padding:8px">Employee Pension</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.employeePension)}</td></tr>
            <tr><td style="padding:8px">Employee PF</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.employeePf)}</td></tr>
            <tr><td style="padding:8px">Tax Relief</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.taxRelief)}</td></tr>
            <tr><td style="padding:8px">Taxable Income</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.taxableAmount)}</td></tr>
            <tr><td style="padding:8px">PAYE</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.paye)}</td></tr>
            <tr><td style="padding:8px">Net Pay</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.netPay)}</td></tr>
            <tr><td style="padding:8px">Loan Monthly</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.loanMonthly)}</td></tr>
            <tr style="font-weight:700"><td style="padding:8px">Take Home</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.takeHome)}</td></tr>
          </tbody>
        </table>
      `;

      // fill modal fields (IDs exist in payslip.html)
      byId('modalEmpId').textContent = emp.staff || '';
      byId('modalSSNIT').textContent = emp.ssnit || '';
      byId('modalName').textContent = emp.name || '';
      byId('modalGhanaCard').textContent = emp.ghanaCard || '';
      byId('modalDept').textContent = emp.department || '';
      byId('modalEmail').textContent = emp.email || '';
      byId('modalDesignation').textContent = emp.designation || '';
      // Set pay period to currently selected payslipPeriod input
      const period = byId('payslipPeriod')?.value || (new Date()).toISOString().slice(0,7);
      byId('modalPayPeriod').textContent = period;

      // payroll table area
      const area = byId('modalPayrollTableArea');
      if (area) {
        area.innerHTML = payrollTableHtml;
      }

      // Generated timestamp
      const gen = byId('modalGenerated');
      if (gen) gen.textContent = 'Generated: ' + (new Date()).toLocaleString();

      // store current
      _currentPayslip = {
        staff: emp.staff,
        record: emp,
        period,
        calc,
        html: buildPayslipPrintHtml(emp, calc, allowances, period)
      };

      // show modal (existing DOM)
      const modal = byId('payslipModal');
      if (modal) {
        modal.style.display = 'flex';
        // set focus to print button
        setTimeout(() => byId('modalPrintBtn')?.focus(), 100);
      }
    } catch (err) {
      console.error('Error opening payslip modal', err);
      showToast('Error preparing payslip: ' + (err.message || err), 'error');
    }
  }

  function buildPayslipPrintHtml(emp, calc, allowances, period) {
    // Minimal, clean print HTML for payslip
    const rowsAllowances = (allowances || []).map(a => `
      <tr>
        <td style="padding:6px 8px">${escapeHtml(a.type || a.name || '')}</td>
        <td style="padding:6px 8px;text-align:right">${formatCurrencyLocal(parseFloat(a.amount || a.value || 0))}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; color:#111;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-weight:800;font-size:20px">GAP MICROFINANCE LTD</div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#666">Payslip</div>
            <div style="font-weight:700">${escapeHtml(period)}</div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div><strong>Name:</strong> ${escapeHtml(emp.name)}</div>
          <div><strong>Staff No:</strong> ${escapeHtml(emp.staff)}</div>
          <div><strong>Designation:</strong> ${escapeHtml(emp.designation || '')}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:13px;">
          <thead>
            <tr style="background:#f7f7f7;">
              <th style="text-align:left;padding:8px">Earnings / Deductions</th>
              <th style="text-align:right;padding:8px;width:160px">Amount (GHS)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:8px">Basic Salary</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(parseFloat(emp.basicSalary || 0))}</td></tr>
            <tr><td style="padding:8px">Total Allowances</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.totalAllowances)}</td></tr>
            <tr><td style="padding:8px">Gross Salary</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.grossSalary)}</td></tr>
            <tr><td style="padding:8px">Employee Pension</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.employeePension)}</td></tr>
            <tr><td style="padding:8px">Employee PF</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.employeePf)}</td></tr>
            <tr><td style="padding:8px">PAYE</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.paye)}</td></tr>
            <tr style="font-weight:700"><td style="padding:8px">Net Pay</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.netPay)}</td></tr>
            <tr><td style="padding:8px">Loan</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.loanMonthly)}</td></tr>
            <tr style="font-weight:700"><td style="padding:8px">Take Home</td><td style="padding:8px;text-align:right">${formatCurrencyLocal(calc.takeHome)}</td></tr>
          </tbody>
        </table>

        ${ (allowances && allowances.length > 0) ? `
        <div style="margin-bottom:12px;">
          <div style="font-weight:700;margin-bottom:6px">Allowances</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f7f7f7"><th style="text-align:left;padding:6px">Type</th><th style="text-align:right;padding:6px;width:160px">Amount</th></tr></thead>
            <tbody>${rowsAllowances}</tbody>
          </table>
        </div>` : '' }

        <div style="margin-top:18px;font-size:12px;color:#777">* Computer generated payslip</div>
      </div>
    `;
  }

  // ---------- Print & send ----------
  function printPayslip() {
    if (!_currentPayslip || !_currentPayslip.html) {
      showToast('No payslip to print', 'warning');
      return;
    }

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      showToast('Popup blocked. Allow popups and try again.', 'error');
      return;
    }
    const html = `
      <html>
        <head>
          <title>Payslip - ${escapeHtml(_currentPayslip.record?.name || _currentPayslip.staff)}</title>
          <meta charset="utf-8"/>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 18px; color: #111; }
            @media print { button { display:none } }
          </style>
        </head>
        <body>
          ${_currentPayslip.html}
          <div style="margin-top:16px;"><button onclick="window.print();">Print</button></div>
        </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
    // focus window
    w.focus();
  }

  async function sendPayslipForStaff(staff) {
    try {
      // generate (if not loaded)
      if (!_currentPayslip || String(_currentPayslip.staff) !== String(staff)) {
        await openPayslipModal(staff);
      }
      if (!_currentPayslip) { showToast('Could not prepare payslip', 'error'); return; }

      // payload: use current html (server can accept HTML or structured data)
      const payload = {
        staff: _currentPayslip.staff,
        period: _currentPayslip.period,
        payslipHtml: _currentPayslip.html,
        summary: _currentPayslip.calc
      };

      // show sending UI
      const sendBtn = byId('modalSendBtn');
      if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }

      if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
        const resp = await API.sendPayslip(staff, _currentPayslip.period, payload).catch(err => { throw err; });
        if (resp && resp.success) {
          showToast('Payslip sent to ' + staff, 'success');
        } else {
          showToast('Error sending payslip: ' + (resp && resp.error ? resp.error : 'unknown'), 'error');
        }
      } else if (typeof API !== 'undefined' && API && typeof API.sendEmail === 'function') {
        // generic fallback to an email-sending endpoint
        const to = _currentPayslip.record?.email;
        if (!to) throw new Error('No email for employee');
        const resp = await API.sendEmail(to, 'Payslip ' + _currentPayslip.period, _currentPayslip.html).catch(err => { throw err; });
        showToast('Payslip queued for ' + to, 'success');
      } else {
        // no API available
        showToast('No API configured to send payslips. Download or print instead.', 'warning');
      }
    } catch (err) {
      console.error('Send payslip error', err);
      showToast('Error sending payslip: ' + (err.message || err), 'error');
    } finally {
      const sendBtn = byId('modalSendBtn');
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send'; }
    }
  }

  // ---------- Send All with progress ----------
  async function sendAllPayslips() {
    if (!Array.isArray(_employees) || _employees.length === 0) {
      showToast('No employees to send', 'warning');
      return;
    }

    if (!confirm(`Send payslips to ${_employees.length} employee(s)? This will attempt to send one-by-one.`)) return;

    _sendAllAbort = { aborted: false };

    const overlay = byId('sendAllLoadingOverlay');
    const progress = byId('sendAllProgress');
    if (overlay) overlay.classList.add('active');
    if (progress) progress.textContent = 'Preparing...';

    let sent = 0, failed = 0;
    for (let i = 0; i < _employees.length; i++) {
      if (_sendAllAbort.aborted) break;
      const emp = _employees[i];
      if (!emp || !emp.staff) continue;
      try {
        if (progress) progress.textContent = `Sending ${i+1} of ${_employees.length} — ${emp.name || emp.staff}`;
        // reuse send single function but avoid opening modal for every employee for speed:
        // prepare payload server-side if possible: attempt API.sendPayslipDirect to support html generation server-side
        // fallback: call openPayslipModal to build html and then call API
        await openPayslipModal(emp.staff);
        if (!_currentPayslip) { throw new Error('Failed to prepare payslip'); }
        // try API.sendPayslip if available
        if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
          const payload = {
            staff: _currentPayslip.staff,
            period: _currentPayslip.period,
            payslipHtml: _currentPayslip.html,
            summary: _currentPayslip.calc
          };
          const resp = await API.sendPayslip(emp.staff, _currentPayslip.period, payload).catch(e => { throw e; });
          if (!(resp && resp.success)) throw new Error(resp && resp.error ? resp.error : 'Send failed');
        } else {
          // cannot send: mark as failure
          throw new Error('No send API available');
        }
        sent++;
      } catch (err) {
        console.warn('Failed to send payslip for', emp.staff, err);
        failed++;
      }
    }

    if (progress) progress.textContent = `Done. Sent ${sent}, Failed ${failed}`;
    setTimeout(() => {
      if (overlay) overlay.classList.remove('active');
    }, 1200);

    if (sent > 0) showToast(`Sent: ${sent}. Failed: ${failed}`, failed === 0 ? 'success' : 'warning');
    else showToast('No payslips were sent', 'error');
  }

  function abortSendAll() {
    _sendAllAbort.aborted = true;
    const overlay = byId('sendAllLoadingOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ---------- Setup event listeners on the page ----------
  function initPayslipModule() {
    // Wire buttons
    const generateBtn = byId('generatePayslipBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', async function() {
        // naive generate all previews (creates currentPayslip for first employee)
        await loadEmployeeList();
        showToast('Employee list refreshed', 'success');
      });
    }

    const sendAllBtn = byId('sendAllPayslipsBtn');
    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', function() {
        sendAllPayslips();
      });
    }

    // modal buttons
    const printBtn = byId('modalPrintBtn');
    if (printBtn) printBtn.addEventListener('click', printPayslip);
    const modalSend = byId('modalSendBtn');
    if (modalSend) modalSend.addEventListener('click', function() {
      if (_currentPayslip && _currentPayslip.staff) {
        sendPayslipForStaff(_currentPayslip.staff);
      } else {
        showToast('No payslip ready', 'warning');
      }
    });
    const modalClose = byId('modalCloseBtn');
    if (modalClose) modalClose.addEventListener('click', function() {
      const modal = byId('payslipModal');
      if (modal) modal.style.display = 'none';
    });

    // Close modal when clicking outside (improve accessibility)
    const payslipModal = byId('payslipModal');
    if (payslipModal) {
      payslipModal.addEventListener('click', function(e) {
        if (e.target === payslipModal) payslipModal.style.display = 'none';
      });
    }

    // Initialize list
    loadEmployeeList();
  }

  // Expose entry point on window
  window.initPayslipModule = initPayslipModule;
  window.openPayslipModal = openPayslipModal;
  window.printPayslip = printPayslip;
  window.sendPayslipForStaff = sendPayslipForStaff;
  window.sendAllPayslips = sendAllPayslips;
  window.abortSendAllPayslips = abortSendAll;

  // Auto-init if payslip page present
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('payslipListTable')) {
      try { initPayslipModule(); } catch (e) { console.error('initPayslipModule error', e); }
    }
  });

})();
