/* assets/js/payslip.js
   Payslip module:
   - loads employee list
   - generates preview in modal
   - prints payslip modal
   - sends single and all payslips with progress
   Defensive: works with/without API object, uses fallbacks.
*/

(function () {
  'use strict';

  // Configuration
  const SEND_BATCH_SIZE = 5; // concurrent sends
  const SEND_BATCH_DELAY_MS = 200; // small delay between batches

  // State
  let employees = [];
  let currentPayslip = null;
  let isSendingAll = false;
  let sendAllAbort = false;

  // Helpers: toast (uses existing site toast if present), else fallback to lightweight toast
  function showToast(message, type = 'info', timeout = 3000) {
    // prefer global toast utilities
    if (window.printUtils && typeof printUtils.showMessage === 'function') {
      printUtils.showMessage(message, type);
      return;
    }
    // fallback: simple toast element
    let toast = document.getElementById('payslip-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'payslip-toast';
      toast.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:10px 14px;border-radius:8px;z-index:6000;color:#fff;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.1);';
      document.body.appendChild(toast);
    }
    const bg = type === 'error' ? '#ef476f' : type === 'success' ? '#06d6a0' : type === 'warning' ? '#f59e0b' : '#4361ee';
    toast.style.background = bg;
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, timeout);
  }

  // Utility: safe API call wrapper
  async function safeApiCall(fnName, ...args) {
    try {
      if (window.API && typeof window.API[fnName] === 'function') {
        return await window.API[fnName](...args);
      } else if (window.API && typeof window.API.call === 'function') {
        // some projects expose generic call
        return await window.API.call(fnName, ...args);
      } else {
        return null;
      }
    } catch (err) {
      console.error('API call error for', fnName, err);
      return Promise.reject(err);
    }
  }

  // Render employee list: each row has Generate (preview) and Send button
  function renderPayslipList(list) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = `
      <tr>
        <td colspan="3" style="padding:16px; text-align:center; color:#999; font-size:13px;">
          <i class="fas fa-users"></i> No employees found
        </td>
      </tr>`;
      return;
    }

    tbody.innerHTML = list.map(emp => {
      const staff = escapeHtml(emp.staff || emp.staffNumber || emp.staffNo || '');
      const name = escapeHtml(emp.name || emp.fullName || emp['Full Name'] || '');
      return `<tr>
        <td style="padding:8px 14px; text-align:left;">${staff}</td>
        <td style="padding:8px 14px; text-align:left;">${name}</td>
        <td style="padding:8px 14px; text-align:center;">
          <button type="button" class="btn-outline btn-compact" data-action="preview" data-staff="${staff}" title="Preview payslip">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn-outline btn-compact" data-action="send" data-staff="${staff}" title="Send payslip">
            <i class="fas fa-paper-plane"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  // Escape helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Load employee list from API or fallback
  async function loadEmployeeList() {
    try {
      const resp = await safeApiCall('getEmployees');
      // Normalize: resp may be array or { data: [] } or { records: [] }
      let list = [];
      if (Array.isArray(resp)) list = resp;
      else if (resp && Array.isArray(resp.data)) list = resp.data;
      else if (resp && Array.isArray(resp.records)) list = resp.records;
      else if (resp && typeof resp === 'object') {
        // try common fields
        list = [];
      }

      // fallback to API.getEmployeesFromServer if available (some modules had a variant)
      if ((!list || list.length === 0) && window.getEmployeesFromServer) {
        list = await window.getEmployeesFromServer();
      }

      employees = list || [];
      renderPayslipList(employees);
    } catch (err) {
      console.error('Failed to load employees', err);
      showToast('Failed to load employees', 'error');
      employees = [];
      renderPayslipList([]);
    }
  }

  // Build payslip HTML for modal (basic, uses available fields; you can extend template as needed)
  function buildPayslipHtml(data) {
    // data expected: { staff, name, payPeriod, components: [{label, amount}], gross, deductions, net, generatedAt }
    const header = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:700; font-size:18px;">GAP MICROFINANCE LTD</div>
        <div style="text-align:right;">Payslip<br><small>${escapeHtml(data.payPeriod || '')}</small></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        <div><strong>Employee:</strong> ${escapeHtml(data.name || '')} (${escapeHtml(data.staff || '')})</div>
        <div style="text-align:right;"><strong>Generated:</strong> ${escapeHtml(data.generatedAt || '')}</div>
      </div>
    `;

    const rows = (data.components || []).map(c => `
      <tr>
        <td style="padding:6px 10px; text-align:left;">${escapeHtml(c.label || '')}</td>
        <td style="padding:6px 10px; text-align:right;">${formatMoney(c.amount)}</td>
      </tr>
    `).join('');

    const deductionsRows = (data.deductions || []).map(c => `
      <tr>
        <td style="padding:6px 10px; text-align:left;">${escapeHtml(c.label || '')}</td>
        <td style="padding:6px 10px; text-align:right;">-${formatMoney(c.amount)}</td>
      </tr>
    `).join('');

    const footer = `
      <tr style="font-weight:700; background:#f7fafc;">
        <td style="padding:8px 10px; text-align:left;">Net Pay</td>
        <td style="padding:8px 10px; text-align:right;">${formatMoney(data.net || 0)}</td>
      </tr>
    `;

    return `
      <div style="font-family:Arial, sans-serif; color:#111;">
        ${header}
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
          <tbody>
            ${rows}
            ${deductionsRows}
            ${footer}
          </tbody>
        </table>
        <div style="font-size:12px; color:#555;">This is a computer-generated payslip.</div>
      </div>
    `;
  }

  function formatMoney(value) {
    const n = Number(value) || 0;
    return n.toFixed(2);
  }

  // Show payslip preview modal for an employee
  async function previewPayslipForStaff(staff, period) {
    const modal = document.getElementById('payslipModal');
    const modalContentArea = document.getElementById('modalPayrollTableArea');
    const modalLoading = document.getElementById('modalLoadingOverlay');

    if (!modal || !modalContentArea) return;

    // show loading overlay inside modal
    if (modalLoading) modalLoading.classList.add('active');

    try {
      // Try API to generate payslip payload
      let payload = null;
      try {
        const apiResp = await safeApiCall('generatePayslip', staff, period);
        if (apiResp && (typeof apiResp === 'object')) {
          payload = apiResp;
        }
      } catch (err) {
        console.warn('API generatePayslip failed, will fallback', err);
      }

      // Fallback: if no payload, create a demo/simple payslip using employee basic salary
      if (!payload) {
        const emp = employees.find(e => (e.staff || e.staffNumber || e.staffNo) === staff) || {};
        const basic = Number(emp.basicSalary || emp.basic || 0);
        const allowances = emp.allowances || [];
        const totalAllowances = allowances.reduce((s, a) => s + (Number(a.amount || 0) || 0), 0);
        const gross = basic + totalAllowances;
        const pension = Number((basic * 0.055).toFixed(2));
        const pf = Number(((basic) * 0.10).toFixed(2));
        const taxRelief = Number(emp.taxRelief || 0);
        const taxable = Math.max(0, gross - (pension + pf + taxRelief));
        // naive PAYE: 0 for demo
        const paye = 0;
        const net = gross - pension - pf - paye;

        payload = {
          staff: staff,
          name: emp.name || emp.fullName || '',
          payPeriod: period || document.getElementById('payslipPeriod')?.value || '',
          components: [
            { label: 'Basic Salary', amount: basic },
            ...allowances.map(a => ({ label: a.type || a.label || 'Allowance', amount: Number(a.amount || 0) }))
          ],
          deductions: [
            { label: 'Employee Pension (5.5%)', amount: pension },
            { label: 'Employee PF', amount: pf },
            { label: 'PAYE', amount: paye }
          ],
          gross: gross,
          net: net,
          generatedAt: new Date().toLocaleString()
        };
      }

      // Build HTML and populate modal fields (header employee info etc.)
      document.getElementById('modalEmpId').textContent = payload.staff || '';
      document.getElementById('modalName').textContent = payload.name || '';
      document.getElementById('modalPayPeriod').textContent = payload.payPeriod || '';
      document.getElementById('modalSSNIT').textContent = payload.ssnit || '';
      document.getElementById('modalBank').textContent = payload.bank || '';
      document.getElementById('modalDept').textContent = payload.department || '';
      document.getElementById('modalDesignation').textContent = payload.designation || '';
      document.getElementById('modalEmail').textContent = payload.email || '';
      document.getElementById('modalGenerated').textContent = 'Generated: ' + (payload.generatedAt || '');

      modalContentArea.innerHTML = buildPayslipHtml(payload);
      currentPayslip = { staff: payload.staff, period: payload.payPeriod, payload };

      // show modal
      openPayslipModal();
    } catch (err) {
      console.error('Preview payslip failed', err);
      showToast('Failed to generate payslip preview', 'error');
    } finally {
      if (modalLoading) modalLoading.classList.remove('active');
    }
  }

  // Open/close modal helpers
  function openPayslipModal() {
    const modal = document.getElementById('payslipModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closePayslipModal() {
    const modal = document.getElementById('payslipModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Print the current modal content (modalPayrollTableArea)
  function printPayslipModal() {
    const content = document.getElementById('modalPayrollTableArea');
    if (!content) return;
    const newWindow = window.open('', '_blank', 'width=900,height=700');
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => el.outerHTML).join('\n');
    newWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Payslip</title>
          ${styles}
          <style>
            body { margin: 20px; font-family: Arial, sans-serif; color:#111; }
            table { width:100%; border-collapse:collapse; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => newWindow.print(), 350);
  }

  // Send a single payslip
  async function sendPayslip(staff, period) {
    try {
      // UI feedback
      showToast(`Sending payslip for ${staff}...`, 'info');
      // Try API
      if (window.API && typeof window.API.sendPayslip === 'function') {
        const resp = await window.API.sendPayslip(staff, period);
        if (resp && (resp.success || resp.sent)) {
          showToast(`Payslip sent to ${staff}`, 'success');
          return { ok: true, resp };
        } else {
          showToast(`Failed to send payslip to ${staff}`, 'error');
          return { ok: false, resp };
        }
      } else {
        // fallback: simulate send
        await new Promise(r => setTimeout(r, 500));
        showToast(`(Simulated) Payslip sent to ${staff}`, 'success');
        return { ok: true, resp: { simulated: true } };
      }
    } catch (err) {
      console.error('sendPayslip error', err);
      showToast(`Error sending payslip to ${staff}`, 'error');
      return { ok: false, error: err };
    }
  }

  // Send all payslips with batching and progress UI
  async function sendAllPayslips(period) {
    if (isSendingAll) {
      showToast('Already sending payslips', 'warning');
      return;
    }
    if (!Array.isArray(employees) || employees.length === 0) {
      showToast('No employees to send to', 'warning');
      return;
    }

    isSendingAll = true;
    sendAllAbort = false;

    // Show global overlay with progress
    const overlay = document.getElementById('sendAllLoadingOverlay');
    const progressEl = document.getElementById('sendAllProgress');
    if (overlay) overlay.classList.add('active');
    let sent = 0;
    const total = employees.length;

    // chunked concurrent sending
    const queue = employees.slice();
    const results = [];

    async function worker() {
      while (!sendAllAbort && queue.length > 0) {
        const emp = queue.shift();
        const staff = emp.staff || emp.staffNumber || emp.staffNo || '';
        const res = await sendPayslip(staff, period);
        results.push({ staff, ok: !!res.ok, detail: res });
        sent++;
        if (progressEl) progressEl.textContent = `Sent ${sent} / ${total}`;
      }
    }

    // Start N concurrent workers
    const workers = [];
    const concurrency = Math.max(1, Math.min(SEND_BATCH_SIZE, total));
    for (let i = 0; i < concurrency; i++) {
      workers.push(worker());
      await new Promise(r => setTimeout(r, SEND_BATCH_DELAY_MS)); // small spacing
    }

    // Wait for all workers
    await Promise.all(workers);

    isSendingAll = false;
    if (overlay) overlay.classList.remove('active');

    // Report summary
    const successCount = results.filter(r => r.ok).length;
    const failCount = results.length - successCount;
    showToast(`Send complete: ${successCount} successful, ${failCount} failed`, failCount > 0 ? 'warning' : 'success', 6000);
    console.log('Send all results:', results);
    return results;
  }

  // Event delegation for preview/send on rows
  function attachListRowHandlers() {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const staff = btn.dataset.staff;
      if (action === 'preview') {
        const period = document.getElementById('payslipPeriod')?.value || '';
        previewPayslipForStaff(staff, period);
      } else if (action === 'send') {
        const period = document.getElementById('payslipPeriod')?.value || '';
        sendPayslip(staff, period);
      }
    });
  }

  // Wire up main page buttons and modal actions
  function attachUiHandlers() {
    // Generate (bulk) - generate previews for all? In original UI this probably triggers generation — we'll make it trigger load + preview first employee as a convenience
    const genBtn = document.getElementById('generatePayslipBtn');
    if (genBtn) {
      genBtn.addEventListener('click', async function () {
        genBtn.disabled = true;
        try {
          await loadEmployeeList();
          showToast('Employee list refreshed', 'success');
        } catch (e) {
          console.error(e);
          showToast('Failed to refresh employees', 'error');
        } finally {
          genBtn.disabled = false;
        }
      });
    }

    // Send all
    const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', async function () {
        if (isSendingAll) {
          // abort option
          sendAllAbort = true;
          showToast('Cancelling send (will finish current items)...', 'warning');
          return;
        }
        const period = document.getElementById('payslipPeriod')?.value || '';
        if (!period) {
          showToast('Please choose a period before sending', 'warning');
          return;
        }
        await sendAllPayslips(period);
      });
    }

    // Modal buttons
    const modalPrintBtn = document.getElementById('modalPrintBtn');
    if (modalPrintBtn) modalPrintBtn.addEventListener('click', printPayslipModal);

    const modalSendBtn = document.getElementById('modalSendBtn');
    if (modalSendBtn) modalSendBtn.addEventListener('click', async function () {
      if (!currentPayslip) {
        showToast('No payslip to send', 'warning');
        return;
      }
      modalSendBtn.disabled = true;
      const res = await sendPayslip(currentPayslip.staff, currentPayslip.period);
      modalSendBtn.disabled = false;
      if (res && res.ok) {
        showToast('Payslip sent', 'success');
      } else {
        showToast('Failed to send payslip', 'error');
      }
    });

    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePayslipModal);

    // Close modal on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('payslipModal');
        if (modal && modal.style.display === 'flex') closePayslipModal();
      }
    });

    // Delegate click on table rows
    attachListRowHandlers();
  }

  // Initialize module
  async function initPayslipModule() {
    // ensure DOM elements exist
    if (!document.getElementById('payslipListBody')) {
      console.warn('Payslip module: missing #payslipListBody element - aborting initialization.');
      return;
    }

    attachUiHandlers();
    await loadEmployeeList();

    console.log('Payslip module initialized.');
  }

  // Expose for manual init
  window.initPayslipModule = initPayslipModule;

  // Auto-init on DOMContentLoaded (safe: only if payslip elements present)
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('payslipListBody')) {
      try {
        initPayslipModule();
      } catch (e) {
        console.error('Payslip module init error', e);
      }
    }
  });

})();
