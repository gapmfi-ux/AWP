/* PAYSLIP MODULE (improved)
   - Drop this file as assets/js/payslip.js
   - It expects an API object (global) with methods; configure API_METHODS below to adapt to your backend names.
   - Uses existing IDs in modules/payslip.html
*/

(function () {
  'use strict';

  // -------------------------
  // Configure these to match your backend API wrapper
  // -------------------------
  const API_METHODS = {
    // functions expected to be present on the global API object.
    // If your backend wrapper uses different names, set the values here,
    // e.g. getEmployees: 'fetchStaffList'.
    getEmployees: 'getEmployees',                    // returns array of employees
    getPayslips: 'getPayslipsForPeriod',            // returns list of payslips for a period
    getPayslip: 'getPayslip',                       // returns full payslip data for staff+period
    generatePayslips: 'generatePayslipsForPeriod',  // triggers generation on server for a period
    sendPayslip: 'sendPayslip',                     // sends a single payslip (staff, period)
    sendPayslipsBulk: 'sendPayslipsForPeriod'      // send all payslips for a period
  };

  // Helper to call API wrappers safely, supports string map or function directly.
  function callApi(methodKey, ...args) {
    const methodName = API_METHODS[methodKey];
    if (!window.API) {
      return Promise.reject(new Error('API object is not available'));
    }
    const fn = window.API[methodName];
    if (typeof fn !== 'function') {
      return Promise.reject(new Error(`API method "${methodName}" not found`));
    }
    try {
      return Promise.resolve(fn.apply(window.API, args));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // -------------------------
  // DOM helpers
  // -------------------------
  function $(id) { return document.getElementById(id); }
  function createEl(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function showToast(msg, type = 'info') {
    // small toast using existing page (non-blocking)
    let toast = document.getElementById('payslipToast');
    if (!toast) {
      toast = createEl('div', { id: 'payslipToast' });
      toast.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:12px 18px;border-radius:8px;z-index:9999;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.12);';
      document.body.appendChild(toast);
    }
    const colors = {
      success: { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
      error: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
      info: { bg: '#dbeafe', color: '#1e3a8a', border: '#60a5fa' },
      warning: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' }
    };
    const s = colors[type] || colors.info;
    toast.style.background = s.bg;
    toast.style.color = s.color;
    toast.style.borderLeft = `4px solid ${s.border}`;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3500);
  }

  // -------------------------
  // UI building and state
  // -------------------------
  let currentPeriod = null;
  let employeesCache = null;
  let payslipsCache = null;

  function formatMoney(n) {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setLoading(show, message) {
    const overlay = $('sendAllLoadingOverlay');
    if (!overlay) return;
    if (show) {
      overlay.classList.add('active');
      overlay.querySelector('div > div + div')?.textContent && (overlay.querySelector('div > div + div').textContent = message || overlay.querySelector('div > div + div').textContent);
    } else {
      overlay.classList.remove('active');
    }
  }

  // -------------------------
  // Employee list rendering
  // -------------------------
  async function loadEmployeeList(period) {
    if (!period) {
      showToast('Select a period first', 'warning');
      return;
    }
    currentPeriod = period;
    const tbody = $('payslipListBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="padding:18px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading employees...</td></tr>`;

    try {
      const resp = await callApi('getEmployees', { useCache: true }).catch(() => []);
      let list = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.data) ? resp.data : []);
      employeesCache = list;
      renderEmployeeList(list);
    } catch (err) {
      console.error('loadEmployeeList error', err);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:18px;text-align:center;color:#c53030;">Error loading employees</td></tr>`;
      showToast('Failed to load employees: ' + (err.message || err), 'error');
    }
  }

  function renderEmployeeList(list) {
    const tbody = $('payslipListBody');
    if (!tbody) return;
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="padding:14px;text-align:center;color:#6b7280;"><i class="fas fa-users"></i> No employees found</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(emp => {
      const staff = emp.staff || emp.staffNumber || emp.staffNo || emp.staffId || '';
      const name = emp.name || emp.fullName || emp.displayName || '';
      return `<tr>
        <td style="padding:10px 12px;">${escapeHtml(staff)}</td>
        <td style="padding:10px 12px;">${escapeHtml(name)}</td>
        <td style="padding:10px 12px; text-align:center;">
          <button class="btn-outline" onclick="openPayslipAction(event, '${escapeJs(staff)}')">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  // -------------------------
  // Action portal (per employee)
  // -------------------------
  function openPayslipAction(event, staff) {
    event.stopPropagation();
    closePayslipActionPortal();

    const btn = event.target.closest('button');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const portal = $('payslipActionPortal');
    if (!portal) return;

    portal.innerHTML = `
      <div class="action-dropdown-content" style="min-width:160px;">
        <button class="dropdown-item" onclick="openPayslipModal('${escapeJs(staff)}')"><i class="fas fa-eye"></i> View</button>
        <button class="dropdown-item" onclick="generatePayslipForStaff('${escapeJs(staff)}')"><i class="fas fa-sync-alt"></i> Generate</button>
        <button class="dropdown-item" onclick="sendPayslip('${escapeJs(staff)}')"><i class="fas fa-envelope"></i> Send</button>
      </div>
    `;
    portal.style.display = 'block';
    portal.style.position = 'fixed';
    portal.style.top = (rect.bottom + window.scrollY) + 'px';
    portal.style.left = (rect.left + window.scrollX) + 'px';
    document.addEventListener('click', _portalCloseHandler);
  }

  function _portalCloseHandler(e) {
    closePayslipActionPortal();
    document.removeEventListener('click', _portalCloseHandler);
  }

  function closePayslipActionPortal() {
    const portal = $('payslipActionPortal');
    if (!portal) return;
    portal.innerHTML = '';
    portal.style.display = 'none';
  }

  // -------------------------
  // Payslip modal (view/print/send)
  // -------------------------
  async function openPayslipModal(staff) {
    closePayslipActionPortal();
    const period = $('payslipPeriod')?.value;
    if (!period) {
      showToast('Please select a Pay Period', 'warning');
      return;
    }

    const modal = $('payslipModal');
    if (!modal) return;

    // show loading
    const contentArea = $('modalPayrollTableArea');
    if (contentArea) contentArea.innerHTML = `<div style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading payslip...</div>`;

    modal.style.display = 'flex';
    // Buttons
    const printBtn = $('modalPrintBtn');
    const sendBtn = $('modalSendBtn');
    const closeBtn = $('modalCloseBtn');

    // Wire close
    closeBtn.onclick = () => { modal.style.display = 'none'; };

    // Load payslip from backend
    try {
      const payslip = await callApi('getPayslip', staff, period);
      const normalized = normalizePayslipResponse(payslip, staff, period);
      populatePayslipModal(normalized);

      // print action
      printBtn.onclick = () => {
        // use browser print for the modal content
        const prev = document.body.innerHTML;
        const containerHtml = $('payslipModalContent').innerHTML;
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write('<html><head><title>Payslip</title>');
        win.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">');
        win.document.write('</head><body>');
        win.document.write(containerHtml);
        win.document.write('</body></html>');
        win.document.close();
        win.focus();
        setTimeout(()=>{ win.print(); }, 400);
      };

      // send action
      sendBtn.onclick = async function () {
        sendBtn.disabled = true;
        const spinner = $('<modalSendSpinner');
        $('modalSendSpinner') && ($('modalSendSpinner').style.display = 'inline-block');
        try {
          const res = await callApi('sendPayslip', staff, period);
          const ok = (res && (res.success === true || res.sent === true)) || res === true;
          if (ok) {
            showToast('Payslip sent', 'success');
          } else {
            const errMsg = (res && res.error) ? res.error : 'Failed to send payslip';
            showToast(errMsg, 'error');
          }
        } catch (err) {
          console.error('sendPayslip error', err);
          showToast('Send failed: ' + (err.message || err), 'error');
        } finally {
          $('modalSendSpinner') && ($('modalSendSpinner').style.display = 'none');
          sendBtn.disabled = false;
        }
      };

    } catch (err) {
      console.error('openPayslipModal error', err);
      if (contentArea) contentArea.innerHTML = `<div style="padding:20px; color:#c53030; text-align:center;">Error loading payslip</div>`;
      showToast('Failed to load payslip: ' + (err.message || err), 'error');
    }
  }

  function normalizePayslipResponse(resp, staff, period) {
    // Accept many shapes; produce canonical object used by populatePayslipModal
    if (!resp) {
      return {
        staff, period, rows: [], totals: {}, meta: {}
      };
    }
    // If resp.success wrapper
    if (resp.success === false) return { staff, period, rows: [], totals: {}, meta: {}, error: resp.error || 'Failed' };
    // If resp.data
    const data = resp.data || resp;
    // If single payslip object
    if (data && data.payslip) {
      return Object.assign({ staff, period }, data.payslip);
    }
    // If array of lines
    if (Array.isArray(data) && data.length > 0 && data[0].description) {
      return { staff, period, rows: data, totals: {} };
    }
    // If object already shaped
    if (data.rows || data.totals) {
      return Object.assign({ staff, period }, data);
    }
    // Fallback: wrap raw
    return { staff, period, raw: data };
  }

  function populatePayslipModal(p) {
    // fill header elements in modal
    $('modalPayPeriod').textContent = p.period || currentPeriod || $('payslipPeriod')?.value || '--';
    $('modalEmpId').textContent = (p.staff || p.staffNumber || p.staffId || '');
    $('modalName').textContent = p.name || p.employeeName || p.fullName || '';
    $('modalSSNIT').textContent = p.ssnit || '';
    $('modalGhanaCard').textContent = p.ghanaCard || '';
    $('modalDept').textContent = p.department || '';
    $('modalEmail').textContent = p.email || '';
    $('modalDesignation').textContent = p.designation || '';
    $('modalBank').textContent = p.bank || '';

    // Build small payroll table for display
    const area = $('modalPayrollTableArea');
    if (!area) return;
    // If raw and no rows, show message
    if (p.error) {
      area.innerHTML = `<div style="padding:18px; color:#c53030;">${escapeHtml(p.error)}</div>`;
      return;
    }
    if (p.raw && !p.rows) {
      area.innerHTML = '<pre style="white-space:pre-wrap; padding:12px; background:#f7fafc;border-radius:6px;">' + escapeHtml(JSON.stringify(p.raw, null, 2)) + '</pre>';
      return;
    }

    // Build summary & table if rows exist
    const rows = p.rows || [];
    // If the server returns totals, respect them
    const totals = p.totals || {};

    // If rows is empty, but we have computed numbers, render them
    if (!rows || rows.length === 0) {
      const fallbackHtml = `
        <div style="padding:12px;">
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <div><strong>Gross:</strong> GH₵ ${formatMoney(totals.gross || 0)}</div>
            <div><strong>Net Pay:</strong> GH₵ ${formatMoney(totals.net || 0)}</div>
            <div><strong>PAYE:</strong> GH₵ ${formatMoney(totals.paye || 0)}</div>
            <div><strong>Employer Cost:</strong> GH₵ ${formatMoney(totals.employerCost || 0)}</div>
          </div>
        </div>`;
      area.innerHTML = fallbackHtml;
      return;
    }

    // Render a compact table
    let html = '<div style="overflow:auto;border:1px solid #e6edf3;border-radius:8px;padding:8px;background:#fff;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<thead><tr style="background:#f7fafc;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>';
    html += '<tbody>';
    rows.forEach(r => {
      const desc = r.description || r.label || r.name || '';
      const amt = (r.amount != null) ? formatMoney(r.amount) : '';
      html += `<tr><td style="padding:8px;border-top:1px solid #f0f3f6;">${escapeHtml(desc)}</td><td style="padding:8px;border-top:1px solid #f0f3f6;text-align:right;">${amt}</td></tr>`;
    });
    // totals section
    html += '<tr class="total-row" style="background:#f0f9ff;"><td style="padding:8px;text-align:right;font-weight:700;">Total:</td><td style="padding:8px;text-align:right;font-weight:700;">GH₵ ' + formatMoney(totals.net || rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)) + '</td></tr>';
    html += '</tbody></table></div>';
    area.innerHTML = html;

    // meta display (generated timestamp)
    $('modalGenerated').textContent = 'Generated: ' + (p.generatedAt || new Date().toLocaleString());
  }

  // -------------------------
  // Generate payslips (single staff or bulk)
  // -------------------------
  async function generatePayslipForStaff(staff) {
    closePayslipActionPortal();
    const period = $('payslipPeriod')?.value;
    if (!period) {
      showToast('Please select Pay Period', 'warning');
      return;
    }
    try {
      showToast('Generating payslip for ' + staff + '...', 'info');
      const res = await callApi('generatePayslips', { staff, period });
      const ok = res && (res.success === true || res.generated === true) || res === true;
      if (ok) {
        showToast('Payslip generated', 'success');
        // refresh caches
        await loadPayslipsForPeriod(period);
      } else {
        showToast('Generate failed: ' + (res.error || 'unknown'), 'error');
      }
    } catch (err) {
      console.error('generatePayslipForStaff error', err);
      showToast('Generate failed: ' + (err.message || err), 'error');
    }
  }

  async function generatePayslipsForPeriod() {
    const period = $('payslipPeriod')?.value;
    if (!period) { showToast('Select period', 'warning'); return; }
    try {
      setLoading(true, 'Generating payslips...');
      const res = await callApi('generatePayslips', { period });
      const ok = res && (res.success === true || res.generated === true) || res === true;
      if (ok) {
        showToast('Payslips generated for ' + period, 'success');
        await loadPayslipsForPeriod(period);
        await loadEmployeeList(period);
      } else {
        showToast('Generation failed: ' + (res.error || 'unknown'), 'error');
      }
    } catch (err) {
      console.error('generatePayslipsForPeriod error', err);
      showToast('Generation failed: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadPayslipsForPeriod(period) {
    if (!period) period = $('payslipPeriod')?.value;
    if (!period) return;
    try {
      const resp = await callApi('getPayslips', period).catch(() => null);
      payslipsCache = Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : []);
      // Optionally do something with payslips cache - not needed for list view right now
    } catch (err) {
      console.warn('loadPayslipsForPeriod failed', err);
    }
  }

  // -------------------------
  // Sending payslips
  // -------------------------
  async function sendPayslip(staff) {
    closePayslipActionPortal();
    const period = $('payslipPeriod')?.value;
    if (!period) { showToast('Select period', 'warning'); return; }
    if (!confirm(`Send payslip for ${staff} — ${period}?`)) return;
    setLoading(true, 'Sending payslip...');
    try {
      const res = await callApi('sendPayslip', staff, period);
      const ok = res && (res.success === true || res.sent === true) || res === true;
      if (ok) {
        showToast('Payslip sent', 'success');
      } else {
        showToast('Send failed: ' + (res.error || 'unknown'), 'error');
      }
    } catch (err) {
      console.error('sendPayslip error', err);
      showToast('Send failed: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function sendAllPayslipsForPeriod() {
    const period = $('payslipPeriod')?.value;
    if (!period) { showToast('Select period', 'warning'); return; }
    if (!confirm(`Send all payslips for ${period}?`)) return;
    setLoading(true, 'Sending all payslips...');
    try {
      // Call the bulk API; support different response shapes
      const res = await callApi('sendPayslipsBulk', { period });
      // res may be { success:true, sentCount: N } or { results: [...] }
      const success = res && (res.success === true || res.sentCount || Array.isArray(res.results));
      if (success) {
        showToast('Bulk send started - check progress', 'success');
      } else {
        showToast('Bulk send failed: ' + (res.error || 'unknown'), 'error');
      }
    } catch (err) {
      console.error('sendAllPayslipsForPeriod error', err);
      showToast('Bulk send failed: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // Helpers
  // -------------------------
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // For embedding staff into inline onclick (JS string)
  function escapeJs(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  // -------------------------
  // Wiring UI controls
  // -------------------------
  function init() {
    // Buttons
    const genBtn = $('generatePayslipBtn');
    const sendAllBtn = $('sendAllPayslipsBtn');
    const periodInput = $('payslipPeriod');

    if (genBtn) {
      genBtn.addEventListener('click', function () {
        const period = periodInput?.value;
        if (!period) { showToast('Select period', 'warning'); return; }
        generatePayslipsForPeriod();
      });
    }

    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', function () {
        sendAllPayslipsForPeriod();
      });
    }

    if (periodInput) {
      // when period changes, reload employees and payslips
      periodInput.addEventListener('change', function () {
        const p = periodInput.value;
        if (p) {
          loadEmployeeList(p);
          loadPayslipsForPeriod(p);
        }
      });
      // initialize default if present
      if (periodInput.value) {
        loadEmployeeList(periodInput.value);
        loadPayslipsForPeriod(periodInput.value);
      }
    }

    // close modal on X button wired in HTML; modal close handler already present in openPayslipModal
    // hide portal if click outside
    document.addEventListener('click', function (e) {
      const portal = $('payslipActionPortal');
      if (!portal) return;
      if (!portal.contains(e.target) && !e.target.closest('button[onclick^="openPayslipAction"]')) {
        closePayslipActionPortal();
      }
    });
  }

  // Expose to global scope for HTML inline onclicks created above
  window.openPayslipAction = openPayslipAction;
  window.openPayslipModal = openPayslipModal;
  window.generatePayslipForStaff = generatePayslipForStaff;
  window.sendPayslip = sendPayslip;
  window.openPayslipActionPortal = openPayslipAction;
  window.sendAllPayslipsForPeriod = sendAllPayslipsForPeriod;
  window.generatePayslipsForPeriod = generatePayslipsForPeriod;

  // Auto init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
