
(function() {
  'use strict';

  // Helpers (reuse app utilities when available)
  function qs(id) { return document.getElementById(id); }
  function showToast(message, type) {
    if (typeof window.showToast === 'function') return showToast(message, type);
    // fallback: simple toast
    const g = qs('global-toast');
    if (g) {
      g.textContent = message;
      g.className = type || 'info';
      g.style.display = 'block';
      clearTimeout(g._t);
      g._t = setTimeout(() => g.style.display = 'none', 3000);
    } else {
      console.log(type || 'info', message);
    }
  }

  function formatMoney(n) {
    const num = Number(n || 0);
    if (isNaN(num)) return String(n);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;' }[ch]));
  }

  // Build table rows for employees
  async function loadPayslipTable() {
    const tbody = qs('payslipTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#6b7280;">Loading...</td></tr>';

    // Determine period
    const periodInput = qs('payslipPeriod');
    const period = periodInput && periodInput.value ? periodInput.value : '';

    // Fetch employees from API or fallback
    let employees = [];
    if (window.API && typeof API.getEmployees === 'function') {
      try {
        const resp = await API.getEmployees({ useCache: true }).catch(() => []);
        employees = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : [];
      } catch (e) {
        console.error('API.getEmployees error', e);
      }
    }

    // Fallback: try window.getEmployeesFromServer if app provides
    if ((!employees || employees.length === 0) && typeof window.getEmployeesFromServer === 'function') {
      employees = await window.getEmployeesFromServer().catch(()=>[]);
    }

    // Final fallback: empty
    if (!employees || employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#6b7280;">No employees found</td></tr>';
      return;
    }

    // Normalize employees records (support array of objects or Google-style records)
    const rows = employees.map(emp => {
      const staff = emp['Staff Number'] || emp.staff || emp.staffNumber || '';
      const name = emp['Full Name'] || emp.name || emp.fullName || '';
      const staffEsc = escapeHtml(staff);
      const nameEsc = escapeHtml(name);

      return `
        <tr data-staff="${escapeHtml(staff)}" data-name="${escapeHtml(name)}">
          <td style="padding:10px;">${staffEsc}</td>
          <td style="padding:10px;">${nameEsc}</td>
          <td style="padding:8px; text-align:center;">
            <div style="position:relative; display:inline-block;">
              <button class="payslip-action-btn btn-outline" data-staff="${staffEsc}" data-name="${nameEsc}" style="padding:6px 10px;">Action ▾</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;

    // attach action handlers
    document.querySelectorAll('.payslip-action-btn').forEach(btn => {
      btn.addEventListener('click', openPayslipActionDropdown);
    });
  }

  // Small dropdown portal for per-row actions
  let _payslipPortal = null;
  function ensurePortal() {
    if (!_payslipPortal) {
      _payslipPortal = document.createElement('div');
      _payslipPortal.id = 'payslipActionPortal';
      _payslipPortal.style.position = 'fixed';
      _payslipPortal.style.display = 'none';
      _payslipPortal.style.zIndex = 4000;
      document.body.appendChild(_payslipPortal);
    }
    return _payslipPortal;
  }

  function openPayslipActionDropdown(e) {
    const btn = e.currentTarget;
    const staff = btn.getAttribute('data-staff') || '';
    const name = btn.getAttribute('data-name') || '';

    const rect = btn.getBoundingClientRect();
    const portal = ensurePortal();

    portal.innerHTML = `
      <div style="background:white; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.08); overflow:hidden; min-width:140px;">
        <button class="dropdown-item" data-action="view" style="display:block; width:100%; padding:8px 12px; text-align:left; border:none; background:transparent; cursor:pointer;">View</button>
        <button class="dropdown-item" data-action="send" style="display:block; width:100%; padding:8px 12px; text-align:left; border:none; background:transparent; cursor:pointer;">Send</button>
      </div>
    `;

    // position
    portal.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    portal.style.left = (rect.left + window.scrollX) + 'px';
    portal.style.display = 'block';

    // attach handlers
    portal.querySelectorAll('.dropdown-item').forEach(item => {
      item.onclick = async function(ev) {
        const action = this.getAttribute('data-action');
        closePayslipActionPortal();
        if (action === 'view') {
          await handleViewPayslip(staff, name);
        } else if (action === 'send') {
          await handleSendPayslip(staff, name);
        }
      };
    });

    // click outside closes
    setTimeout(() => {
      document.addEventListener('click', onDocClickClosePortal);
    }, 10);

    e.stopPropagation();
  }

  function onDocClickClosePortal(ev) {
    const portal = qs('payslipActionPortal');
    if (portal && !portal.contains(ev.target)) {
      closePayslipActionPortal();
    }
  }

  function closePayslipActionPortal() {
    const portal = qs('payslipActionPortal');
    if (portal) portal.style.display = 'none';
    document.removeEventListener('click', onDocClickClosePortal);
  }

  // View payslip: try API.getPayslip(staff, period) else compute preview client-side
  async function handleViewPayslip(staff, name) {
    const period = qs('payslipPeriod')?.value || '';
    let payslipHtml = `<div style="padding:8px 0 12px;"><strong>${escapeHtml(name)} (${escapeHtml(staff)})</strong><br><small>Period: ${escapeHtml(period || '(not selected)')}</small></div>`;

    let payload = null;
    if (window.API && typeof API.getPayslip === 'function') {
      try {
        payload = await API.getPayslip(staff, period);
      } catch (err) {
        console.warn('API.getPayslip error', err);
      }
    }

    if (payload && (payload.items || payload.netPay || payload.gross)) {
      // render if API response includes nice structure
      payslipHtml += `<pre style="white-space:pre-wrap; font-family:monospace; font-size:13px;">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
    } else {
      // Fallback: try to compute using computePayrollRow if available
      let empRecord = null;
      if (window.getEmployeesFromServer) {
        try {
          const list = await window.getEmployeesFromServer();
          empRecord = (list || []).find(r => (r['Staff Number'] || r.staff || r.staffNumber) == staff);
        } catch (e) {}
      }

      if (empRecord || window.computePayrollRow) {
        // build demo preview: basic salary + allowances -> compute
        const basic = parseFloat(empRecord?.['Basic Salary'] || empRecord?.basicSalary || 0) || 0;
        let allowances = [];
        if (empRecord && empRecord.allowances) allowances = empRecord.allowances;
        // Try to request allowances via API if available
        if (window.API && typeof API.getAllowancesByStaff === 'function') {
          try {
            const a = await API.getAllowancesByStaff(staff).catch(()=>[]);
            allowances = Array.isArray(a) ? a : allowances;
          } catch (e) {}
        }
        const computed = (typeof computePayrollRow === 'function')
          ? computePayrollRow({ basicSalary: basic, allowances: allowances })
          : { grossSalary: basic, netPay: 0 };

        payslipHtml += `
          <table style="width:100%; border-collapse:collapse; font-family:monospace;">
            <tbody>
              <tr><td style="padding:6px 8px;">Basic Salary</td><td style="padding:6px 8px; text-align:right;">GH₵ ${formatMoney(basic)}</td></tr>
              <tr><td style="padding:6px 8px;">Total Allowances</td><td style="padding:6px 8px; text-align:right;">GH₵ ${formatMoney(computed.totalAllowances || 0)}</td></tr>
              <tr><td style="padding:6px 8px;">Gross Salary</td><td style="padding:6px 8px; text-align:right;">GH₵ ${formatMoney(computed.grossSalary || 0)}</td></tr>
              <tr><td style="padding:6px 8px;">PAYE</td><td style="padding:6px 8px; text-align:right;">GH₵ ${formatMoney(computed.paye || 0)}</td></tr>
              <tr><td style="padding:6px 8px;">Net Pay</td><td style="padding:6px 8px; text-align:right; font-weight:700;">GH₵ ${formatMoney(computed.netPay || 0)}</td></tr>
            </tbody>
          </table>
        `;
      } else {
        payslipHtml += '<div style="padding:8px; color:#6b7280;">No payslip data available for this staff/period.</div>';
      }
    }

    qs('payslipPreviewContent').innerHTML = payslipHtml;
    qs('payslipPreviewModal').style.display = 'flex';
  }

  // Send payslip for a single staff
  async function handleSendPayslip(staff, name) {
    const period = qs('payslipPeriod')?.value || '';
    if (!period) {
      showToast('Please select a period (month)', 'warning');
      return;
    }

    // confirm
    if (!confirm(`Send payslip to ${name} (${staff}) for ${period}?`)) return;

    if (window.API && typeof API.sendPayslip === 'function') {
      try {
        showToast('Sending payslip...', 'info');
        const resp = await API.sendPayslip(staff, period);
        if (resp && resp.success !== false) {
          showToast(`Payslip sent to ${name}`, 'success');
        } else {
          showToast(`Failed to send payslip: ${resp?.error || 'Unknown'}`, 'error');
        }
      } catch (err) {
        console.error('sendPayslip error', err);
        showToast('Failed to send payslip (network)', 'error');
      }
    } else {
      // simulate
      showToast(`(Simulated) Payslip sent to ${name}`, 'success');
    }
  }

  // Bulk send
  async function sendAllPayslips() {
    const period = qs('payslipPeriod')?.value || '';
    if (!period) {
      showToast('Please select a period (month) before sending', 'warning');
      return;
    }

    if (!confirm(`Send payslips to all employees for ${period}?`)) return;

    // collect staff numbers
    const rows = Array.from(document.querySelectorAll('#payslipTableBody tr[data-staff]'));
    if (rows.length === 0) {
      showToast('No employees to send to', 'warning');
      return;
    }

    showToast('Sending payslips (this may take a while)...', 'info');

    for (let i = 0; i < rows.length; i++) {
      const staff = rows[i].getAttribute('data-staff');
      const name = rows[i].getAttribute('data-name') || staff;
      try {
        if (window.API && typeof API.sendPayslip === 'function') {
          const resp = await API.sendPayslip(staff, period);
          if (!(resp && resp.success !== false)) {
            console.warn('sendPayslip response fail for', staff, resp);
          }
        } else {
          // simulate small delay
          await new Promise(r => setTimeout(r, 120));
        }
      } catch (err) {
        console.error('Error sending payslip for', staff, err);
      }
    }

    showToast('Payslip send process completed', 'success');
  }

  // Modal handlers
  function initModalHandlers() {
    const closeBtn = qs('payslipModalCloseBtn');
    const printBtn = qs('payslipPrintBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => qs('payslipPreviewModal').style.display = 'none');
    if (printBtn) printBtn.addEventListener('click', () => {
      // Simple print of preview content
      const content = qs('payslipPreviewContent').innerHTML;
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Payslip</title></head><body>' + content + '</body></html>');
      w.document.close();
      w.print();
      w.close();
    });
    // close modal when clicking outside content
    const modal = qs('payslipPreviewModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  }

  // initialize module
  function initPayslipModule() {
    // set default period to current month
    const input = qs('payslipPeriod');
    if (input && !input.value) {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      input.value = `${d.getFullYear()}-${mm}`;
    }

    // wire buttons
    const refreshBtn = qs('payslipRefreshBtn');
    const sendAllBtn = qs('payslipSendAllBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadPayslipTable);
    if (sendAllBtn) sendAllBtn.addEventListener('click', sendAllPayslips);
    if (qs('payslipPeriod')) qs('payslipPeriod').addEventListener('change', loadPayslipTable);

    initModalHandlers();
    loadPayslipTable();
  }

  // expose globally for main.js to call
  window.initPayslipModule = initPayslipModule;

})();
