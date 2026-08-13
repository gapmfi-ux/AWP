// Payslip module: init, preview, print, send (single + batch) with progress
// Drop this file into assets/js/payslip.js — index.html already includes it.

(function () {
  'use strict';

  // Config
  const SEND_CONCURRENCY = 5; // parallel emails when sending all

  // Helpers
  function qs(selector, ctx = document) { return ctx.querySelector(selector); }
  function qsa(selector, ctx = document) { return Array.from((ctx || document).querySelectorAll(selector)); }
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }
  function formatCurrency(n) {
    const v = parseFloat(n) || 0;
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Toast helper (re-uses existing toasts if present)
  function showToast(message, type = 'info') {
    // use existing sendAll overlay or create simple toast
    let toast = document.getElementById('payslipToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'payslipToast';
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 16px;border-radius:8px;color:#fff;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.12);';
      document.body.appendChild(toast);
    }
    const bg = type === 'success' ? '#06d6a0' : type === 'error' ? '#ef476f' : type === 'warning' ? '#f59e0b' : '#4361ee';
    toast.style.background = bg;
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(12px)'; }, 3500);
  }

  // DOM references
  const dom = {
    generateBtn: () => document.getElementById('generatePayslipBtn'),
    sendAllBtn: () => document.getElementById('sendAllPayslipsBtn'),
    periodInput: () => document.getElementById('payslipPeriod'),
    listBody: () => document.getElementById('payslipListBody'),
    modal: () => document.getElementById('payslipModal'),
    modalContent: () => document.getElementById('payslipModalContent'),
    modalPrintBtn: () => document.getElementById('modalPrintBtn'),
    modalSendBtn: () => document.getElementById('modalSendBtn'),
    modalCloseBtn: () => document.getElementById('modalCloseBtn'),
    modalSendSpinner: () => document.getElementById('modalSendSpinner'),
    sendAllOverlay: () => document.getElementById('sendAllLoadingOverlay'),
    sendAllProgress: () => document.getElementById('sendAllProgress'),
    payslipListTable: () => document.getElementById('payslipListTable'),
    payslipListBody: () => document.getElementById('payslipListBody')
  };

  // State
  let employeesCache = [];
  let currentPreview = null; // { staff, employee, payroll }
  let sendingAllAbort = { aborted: false };

  // Initialize module
  async function init() {
    // Wire up UI
    if (dom.generateBtn()) dom.generateBtn().addEventListener('click', onGenerateAllClicked);
    if (dom.sendAllBtn()) dom.sendAllBtn().addEventListener('click', onSendAllClicked);
    if (dom.modalPrintBtn()) dom.modalPrintBtn().addEventListener('click', onModalPrint);
    if (dom.modalSendBtn()) dom.modalSendBtn().addEventListener('click', onModalSend);
    if (dom.modalCloseBtn()) dom.modalCloseBtn().addEventListener('click', closeModal);

    // Load list
    await loadEmployeeList();
  }

  // Load employees and render list
  async function loadEmployeeList() {
    const tbody = dom.payslipListBody();
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="padding:16px;text-align:center;color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading employees...</td></tr>`;
    try {
      // Prefer API.getEmployees or API.getEmployeesFromServer depending on your API
      let employees = [];
      if (window.API && typeof window.API.getEmployees === 'function') {
        const resp = await window.API.getEmployees({ useCache: true }).catch(() => null);
        if (Array.isArray(resp)) employees = resp;
        else if (resp && Array.isArray(resp.records)) employees = resp.records;
        else if (resp && Array.isArray(resp.data)) employees = resp.data;
      }
      // fallback to global function getEmployeesFromServer if available
      if ((!employees || employees.length === 0) && typeof window.getEmployeesFromServer === 'function') {
        employees = await window.getEmployeesFromServer().catch(() => []);
      }

      employeesCache = normalizeEmployees(employees || []);
      if (!employeesCache.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:16px;text-align:center;color:#999;">No employees found</td></tr>`;
        return;
      }

      tbody.innerHTML = employeesCache.map(e => `
        <tr>
          <td style="padding:10px 14px;">${escapeHtml(e.staff)}</td>
          <td style="padding:10px 14px;">${escapeHtml(e.name)}</td>
          <td style="padding:10px 14px;text-align:center;">
            <button class="btn-outline" data-staff="${escapeHtml(e.staff)}" data-action="preview">Preview</button>
            <button class="btn-outline" data-staff="${escapeHtml(e.staff)}" data-action="send">Send</button>
          </td>
        </tr>
      `).join('');

      // delegate clicks
      tbody.removeEventListener('click', onListClick);
      tbody.addEventListener('click', onListClick);
    } catch (err) {
      console.error('Failed to load employees', err);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:16px;text-align:center;color:#999;">Error loading employees</td></tr>`;
    }
  }

  function normalizeEmployees(list) {
    // convert possible server shapes into { staff, name, ... }
    return (list || []).map(r => {
      if (r.staff && r.name) return r;
      // common alternate keys
      return {
        staff: r['Staff Number'] || r.staff || r.staffNumber || r.staff_no || '',
        name: r['Full Name'] || r.name || r.fullName || '',
        email: r['Email'] || r.email || '',
        department: r['Department'] || r.department || '',
        designation: r['Designation'] || r.designation || '',
        basicSalary: parseFloat(r['Basic Salary'] || r.basicSalary || 0) || 0,
        ssnit: r['SSNIT'] || r.ssnit || '',
        ghanaCard: r['Ghana Card'] || r.ghanaCard || ''
      };
    });
  }

  // Click handler for list (preview/send)
  function onListClick(ev) {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const staff = btn.dataset.staff;
    const action = btn.dataset.action;
    if (!staff) return;

    if (action === 'preview') {
      openPreviewForStaff(staff);
    } else if (action === 'send') {
      sendSinglePayslip(staff);
    }
  }

  // Preview modal population
  async function openPreviewForStaff(staff) {
    const modal = dom.modal();
    const period = dom.periodInput() ? dom.periodInput().value : '';
    // fetch employee
    let employee = employeesCache.find(e => e.staff === staff);
    if (!employee && window.API && typeof window.API.getEmployeeByStaffNumber === 'function') {
      const resp = await window.API.getEmployeeByStaffNumber(staff).catch(() => null);
      if (resp) employee = normalizeEmployees([resp])[0];
    }

    if (!employee) {
      showToast('Employee record not found', 'error');
      return;
    }

    // compute payroll: prefer computePayrollRow if available
    let payroll = null;
    try {
      payroll = buildPayrollForEmployee(employee);
    } catch (e) {
      payroll = null;
    }

    currentPreview = { staff, employee, payroll, period };

    populateModal(employee, payroll, period);
    modal.classList.add('show');
    // focus management
    (dom.modalCloseBtn() || dom.modal()).focus();
  }

  function closeModal() {
    const modal = dom.modal();
    if (modal) modal.classList.remove('show');
    currentPreview = null;
  }

  function buildPayrollForEmployee(employee) {
    // If computePayrollRow exists use it for consistent logic; else compute minimal summary
    const basic = parseFloat(employee.basicSalary || 0) || 0;
    // allowances are not known here; check API.getAllowancesByStaff if available
    let allowances = [];
    if (window.API && typeof window.API.getAllowancesByStaff === 'function') {
      // synchronous here would be awkward; try to fetch but fallback
      // We'll call it synchronously via cached if possible; otherwise empty
      // (open preview will show immediately then update if needed)
    }
    if (typeof computePayrollRow === 'function') {
      // use default params if not provided
      return computePayrollRow({ basicSalary: basic, allowances: allowances });
    } else {
      // basic fallback
      const gross = basic;
      const empPension = round2(basic * 0.055);
      const empPf = round2(basic * 0.10);
      const taxable = Math.max(0, gross - empPension - empPf);
      const paye = calculatePAYESafe(taxable);
      const net = round2(taxable - paye);
      return {
        totalAllowances: 0,
        grossSalary: gross,
        employeePension: empPension,
        employeePf: empPf,
        taxRelief: 0,
        totalDeductionsBeforeTax: round2(empPension + empPf),
        taxableAmount: taxable,
        paye: paye,
        netPay: net,
        loanMonthly: 0,
        takeHomePay: net,
        employerPension: round2(basic * 0.13),
        employerPf: round2(basic * 0.05)
      };
    }
  }

  // Utility used by fallback payroll
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function calculatePAYESafe(taxable) {
    if (typeof calculatePAYE === 'function') return calculatePAYE(taxable);
    // simple fallback: 10% flat (extremely conservative fallback)
    return round2((parseFloat(taxable) || 0) * 0.10);
  }

  function populateModal(employee, payroll, period) {
    // header fields in modal: many ids exist in payslip.html:
    // modalEmpId, modalSSNIT, modalName, modalGhanaCard, modalDept, modalEmail, modalDesignation, modalBank
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt || '--'; };

    setText('modalEmpId', employee.staff || '--');
    setText('modalSSNIT', employee.ssnit || '--');
    setText('modalName', employee.name || '--');
    setText('modalGhanaCard', employee.ghanaCard || '--');
    setText('modalDept', employee.department || '--');
    setText('modalEmail', employee.email || '--');
    setText('modalDesignation', employee.designation || '--');
    setText('modalBank', employee.bank || '--');

    // pay period
    setText('modalPayPeriod', period || dom.periodInput()?.value || '--');

    // generated / date
    setText('modalGenerated', 'Generated: ' + new Date().toLocaleString());

    // Payroll table area: build a compact table
    const area = document.getElementById('modalPayrollTableArea');
    if (!area) return;
    area.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'payslip-table-compact';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="text-align:left;padding:8px;">Description</th>
          <th style="text-align:right;padding:8px;">Amount (GHS)</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    if (payroll) {
      const rows = [
        ['Gross Salary', payroll.grossSalary],
        ['Employee Pension', payroll.employeePension],
        ['Employee PF', payroll.employeePf],
        ['Tax Relief', payroll.taxRelief],
        ['Taxable Income', payroll.taxableAmount],
        ['PAYE', payroll.paye],
        ['Net Pay', payroll.netPay],
        ['Loan (Monthly)', payroll.loanMonthly || 0],
        ['Take Home Pay', payroll.takeHomePay]
      ];
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:6px 8px;">${escapeHtml(r[0])}</td><td style="padding:6px 8px;text-align:right;">${formatCurrency(r[1])}</td>`;
        tbody.appendChild(tr);
      });
    } else {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="2" style="padding:12px;text-align:center;color:#666;">Payroll preview not available</td>`;
      tbody.appendChild(tr);
    }

    area.appendChild(table);
  }

  // Print logic: open a new window with payslip printable content
  function onModalPrint() {
    if (!currentPreview) {
      showToast('No payslip to print', 'warning');
      return;
    }
    const contentContainer = dom.modalContent();
    if (!contentContainer) return;
    // Build printable HTML from modalContent
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      showToast('Unable to open print window (popup blocked?)', 'error');
      return;
    }
    const doc = printWin.document;
    doc.open();
    const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(n => n.outerHTML).join('\n');
    doc.write(`
      <html>
        <head>
          <title>Payslip - ${escapeHtml(currentPreview.employee.name || '')}</title>
          ${cssLinks}
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .payslip-print { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="payslip-print">${contentContainer.innerHTML}</div>
        </body>
      </html>
    `);
    doc.close();
    // Give browser a tick to render
    setTimeout(() => {
      try { printWin.focus(); printWin.print(); } catch (e) { console.error(e); }
    }, 500);
  }

  // Send single payslip
  async function onModalSend() {
    if (!currentPreview) {
      showToast('No payslip selected', 'error');
      return;
    }
    const btn = dom.modalSendBtn();
    const spinner = dom.modalSendSpinner();
    if (btn) btn.disabled = true;
    if (spinner) spinner.style.display = '';

    try {
      const staff = currentPreview.staff;
      const period = currentPreview.period || dom.periodInput()?.value || '';
      if (!window.API || typeof window.API.sendPayslip !== 'function') {
        // Attempt generic endpoint 'sendPayslip' fallback to serverless or warn
        showToast('Send function is not available in API', 'error');
        return;
      }
      const resp = await window.API.sendPayslip(staff, period).catch(e => ({ success: false, error: e && e.message ? e.message : e }));
      if (resp && resp.success !== false) {
        showToast('Payslip sent', 'success');
      } else {
        showToast('Send failed: ' + (resp && resp.error ? resp.error : 'Unknown'), 'error');
      }
    } catch (err) {
      console.error('Send error', err);
      showToast('Send failed: ' + (err.message || err), 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  }

  // Send single (from list)
  async function sendSinglePayslip(staff) {
    // quick confirm
    if (!confirm('Send payslip to ' + staff + '?')) return;
    // build employee preview to populate required info (or send minimal)
    try {
      const period = dom.periodInput() ? dom.periodInput().value : '';
      if (!window.API || typeof window.API.sendPayslip !== 'function') {
        showToast('Send function is not available in API', 'error');
        return;
      }
      showToast('Sending ' + staff + ' ...', 'info');
      const res = await window.API.sendPayslip(staff, period).catch(e => ({ success: false, error: e && e.message ? e.message : e }));
      if (res && res.success !== false) showToast('Sent ' + staff, 'success');
      else showToast('Send failed for ' + staff + ': ' + (res && res.error ? res.error : 'Unknown'), 'error');
    } catch (err) {
      console.error(err); showToast('Send failed: ' + (err.message || err), 'error');
    }
  }

  // Send all payslips (batch) with concurrency, progress
  async function onSendAllClicked() {
    if (!confirm('Send payslips to all employees for the selected period?')) return;
    const period = dom.periodInput() ? dom.periodInput().value : '';
    const list = employeesCache.slice(); // shallow copy
    if (!list.length) { showToast('No employees to send', 'warning'); return; }

    // Reset abort flag
    sendingAllAbort = { aborted: false };

    const overlay = dom.sendAllOverlay();
    const progressText = dom.sendAllProgress();
    if (overlay) overlay.classList.add('active');
    if (progressText) progressText.textContent = `0 / ${list.length}`;

    let completed = 0;
    let successCount = 0;
    let failureCount = 0;

    // concurrency worker
    const pool = [];
    const items = list.slice();

    function updateProgress() {
      if (progressText) progressText.textContent = `${completed} / ${list.length} (Success: ${successCount} / Fail: ${failureCount})`;
    }

    async function worker() {
      while (!sendingAllAbort.aborted && items.length) {
        const emp = items.shift();
        try {
          if (!window.API || typeof window.API.sendPayslip !== 'function') throw new Error('API.sendPayslip not implemented');
          const r = await window.API.sendPayslip(emp.staff, period).catch(e => ({ success: false, error: e && e.message ? e.message : e }));
          if (r && r.success !== false) successCount++;
          else failureCount++;
        } catch (err) {
          console.error('send error for', emp.staff, err);
          failureCount++;
        } finally {
          completed++;
          updateProgress();
        }
      }
    }

    // start N workers
    for (let i = 0; i < SEND_CONCURRENCY; i++) pool.push(worker());
    await Promise.all(pool);

    // finished
    if (overlay) overlay.classList.remove('active');
    showToast(`Send finished. Success: ${successCount}, Failed: ${failureCount}`, failureCount ? 'warning' : 'success');
  }

  // Generate all payslips (preview) - simply opens preview for first employee as demonstration
  function onGenerateAllClicked() {
    // If you have server side generation, call it here. For now open preview of first employee.
    if (!employeesCache.length) { showToast('No employees to generate for', 'warning'); return; }
    openPreviewForStaff(employeesCache[0].staff);
  }

  // Escape html helper
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

  // Expose init to global
  window.initPayslipModule = init;

  // Auto-init when DOM ready if this fragment is present
  document.addEventListener('DOMContentLoaded', function () {
    // Only init when the payslip HTML is present
    if (document.getElementById('payslipListTable')) {
      try { init(); } catch (e) { console.error('Failed to init payslip module', e); }
    }
  });

})();
