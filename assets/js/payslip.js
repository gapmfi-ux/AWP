// Payslip Module
// - Loads payroll run for selected period and populates payslip list.
// - Generates payslip modal content from payroll run row (name + staff number).
// - Print & send functionality (uses available API methods, with fallbacks).

(function() {
  'use strict';

  // Candidate API method names to fetch payroll run rows for a given period
  const payrollApiMethods = [
    'getPayrollRun',
    'getPayrollForPeriod',
    'getPayslipsForPeriod',
    'getPayslips',
    'getPayrollData',
    'getPayroll' // last-resort
  ];

  const sendPayslipApiMethods = [
    'sendPayslip',
    'emailPayslip',
    'dispatchPayslip'
  ];

  const DEFAULT_TOAST_TIMEOUT = 3500;

  // Init: attach events
  function initPayslipModule() {
    const genBtn = document.getElementById('generatePayslipBtn');
    const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
    const periodInput = document.getElementById('payslipPeriod');

    if (!periodInput) {
      console.warn('payslipPeriod input not found');
    } else {
      // default to current month if empty
      if (!periodInput.value) {
        const now = new Date();
        periodInput.value = now.toISOString().slice(0,7); // YYYY-MM
      }
    }

    if (genBtn) {
      genBtn.removeEventListener('click', onGenerateClicked);
      genBtn.addEventListener('click', onGenerateClicked);
    }
    if (sendAllBtn) {
      sendAllBtn.removeEventListener('click', onSendAllClicked);
      sendAllBtn.addEventListener('click', onSendAllClicked);
    }

    // Allow clicking on table rows later (delegated)
    document.getElementById('payslipListBody')?.addEventListener('click', onPayslipListClick);

    // Modal actions
    document.getElementById('modalPrintBtn')?.addEventListener('click', () => {
      // Print only the modal content
      const modalContent = document.getElementById('payslipModalContent');
      if (modalContent) {
        const before = document.body.innerHTML;
        const clone = modalContent.cloneNode(true);
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) {
          showToast('Popup blocked - allow popups for printing', 'warning');
          return;
        }
        w.document.write('<html><head><title>Payslip</title>');
        // copied minimal styles to maintain readability (app may provide print CSS)
        w.document.write('<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111} table{width:100%;border-collapse:collapse} th,td{padding:6px;border:1px solid #ddd;text-align:left} .text-right{text-align:right}</style>');
        w.document.write('</head><body>');
        w.document.write(clone.innerHTML);
        w.document.write('</body></html>');
        w.document.close();
        w.focus();
        w.print();
        // optionally close:
        // w.close();
      }
    });

    document.getElementById('modalSendBtn')?.addEventListener('click', async function() {
      const staff = document.getElementById('modalEmpId')?.textContent?.trim();
      const period = document.getElementById('payslipPeriod')?.value;
      if (!staff || !period) {
        showToast('Staff or period missing', 'error');
        return;
      }
      await sendPayslipForStaff(staff, period);
    });

    document.getElementById('modalCloseBtn')?.addEventListener('click', function() {
      closePayslipModal();
    });

    // Initial load of list (if auto generate button desired)
    // onGenerateClicked(); // don't auto-load unless you want
  }

  // Handle Generate button
  async function onGenerateClicked(e) {
    const period = document.getElementById('payslipPeriod')?.value;
    if (!period) {
      showToast('Please select a period', 'warning');
      return;
    }
    try {
      showToast('Loading payroll run...', 'info');
      const rows = await fetchPayrollRunForPeriod(period);
      if (!rows || rows.length === 0) {
        // fallback: try loading employees
        showToast('No payroll run found for period; trying employee list', 'warning');
        const employees = await tryApiCall(['getEmployees','getAllEmployees']);
        populatePayslipListFromEmployees(employees || []);
        return;
      }
      populatePayslipListFromPayrollRows(rows, period);
      showToast('Payroll run loaded (' + rows.length + ' rows)', 'success');
    } catch (err) {
      console.error('Error loading payroll run', err);
      showToast('Failed to load payroll run: ' + (err?.message || err), 'error');
    }
  }

  // Attempt multiple API methods to fetch payroll run rows for a period
  async function fetchPayrollRunForPeriod(period) {
    for (const m of payrollApiMethods) {
      const fn = window.API && window.API[m];
      if (typeof fn === 'function') {
        try {
          const result = await fn(period);
          // Normalize an array of rows expected. Accept several shapes.
          const rows = normalizePayrollResponse(result);
          if (rows && rows.length > 0) return rows;
          // if empty result, continue trying other endpoints (maybe endpoint returns empty but another exists)
        } catch (e) {
          console.warn('API.' + m + ' failed:', e);
          // continue to try next
        }
      }
    }
    // none succeeded or returned data
    return [];
  }

  // Normalizes various server response shapes into an array of payroll row objects.
  // Expected row object properties: staff, name, basicSalary, allowances (array), deductions (array), paye, netPay, ssnit, ghanaCard, bank, designation, department
  function normalizePayrollResponse(resp) {
    if (!resp) return [];
    // If already an array of objects
    if (Array.isArray(resp)) {
      // detect if it's directly rows of simple objects (already good)
      if (resp.length === 0) return [];
      if (typeof resp[0] === 'object' && !Array.isArray(resp[0])) {
        return resp.map(normalizeRowObject);
      }
      // If array of arrays, try mapping columns to object (best-effort)
      if (Array.isArray(resp[0])) {
        // can't reliably map columns without metadata - return empty
        return [];
      }
    }

    // If object with data/allRows/rows
    if (typeof resp === 'object') {
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        return resp.data.map(normalizeRowObject);
      }
      if (Array.isArray(resp.allRows) && resp.allRows.length > 0) {
        return resp.allRows.map(normalizeRowObject);
      }
      if (Array.isArray(resp.rows) && resp.rows.length > 0) {
        return resp.rows.map(normalizeRowObject);
      }
      // If the object itself is a single payroll entry
      return [normalizeRowObject(resp)];
    }
    // otherwise nothing usable
    return [];
  }

  // Normalize/clean a single row-like object
  function normalizeRowObject(row) {
    if (typeof row !== 'object' || row === null) return {};
    // normalize common field names
    const staff = row.staff || row.staffNumber || row.staff_no || row['Staff Number'] || row.staffId || row.staff_id || '';
    const name = row.name || row.fullName || row['Full Name'] || row.employeeName || row.empName || '';
    const basicSalary = parseFloat(row.basicSalary || row.basic || row['Basic Salary'] || 0) || 0;
    const ssnit = row.ssnit || row.SSNIT || row.ssnitNumber || row.ssnit_no || '';
    const ghanaCard = row.ghanaCard || row.GhanaCard || row.ghana_card || '';
    const bank = row.bank || row.bankName || row.Bank || '';
    const designation = row.designation || row.Designation || '';
    const department = row.department || row.Department || '';

    // allowances/deductions might be arrays or objects; keep as arrays for display
    let allowances = [];
    if (Array.isArray(row.allowances)) allowances = row.allowances;
    else if (row.allowances && typeof row.allowances === 'object') allowances = Object.entries(row.allowances).map(([k,v]) => ({type:k,amount:parseFloat(v)||0}));
    else if (row.allowance || row.allowances_text) {
      // best-effort parse simple structures
      allowances = [];
    }

    let deductions = [];
    if (Array.isArray(row.deductions)) deductions = row.deductions;
    else if (row.deductions && typeof row.deductions === 'object') deductions = Object.entries(row.deductions).map(([k,v]) => ({type:k,amount:parseFloat(v)||0}));

    const paye = parseFloat(row.paye || row.PAYE || 0) || 0;
    const netPay = parseFloat(row.netPay || row.net || row.NetPay || 0) || 0;
    const gross = parseFloat(row.gross || row.grossSalary || row.Gross || 0) || 0;
    const employerPension = parseFloat(row.employerPension || row.employerPfrate || row.employer_pension || 0) || 0;

    return {
      staff: String(staff || '').trim(),
      name: String(name || '').trim(),
      basicSalary,
      allowances,
      deductions,
      paye,
      netPay,
      gross,
      ssnit: String(ssnit || '').trim(),
      ghanaCard: String(ghanaCard || '').trim(),
      bank: String(bank || '').trim(),
      designation: String(designation || '').trim(),
      department: String(department || '').trim(),
      employerPension
    };
  }

  // Populate table with rows from payroll run (preferred)
  function populatePayslipListFromPayrollRows(rows, period) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) {
      console.warn('payslipListBody not found');
      return;
    }
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999">No payslip data found</td></tr>';
      return;
    }

    // Keep a map in memory for quick retrieval
    window._payslipRunCache = { period: period, rows: [] };
    const html = rows.map((r, idx) => {
      const nr = normalizeRowObject(r);
      // store normalized in cache
      window._payslipRunCache.rows.push(nr);

      const staff = escapeHtml(nr.staff || ('STAFF' + String(idx+1).padStart(3,'0')));
      const name = escapeHtml(nr.name || 'Unknown');
      return `<tr data-index="${idx}">
        <td style="padding:8px 12px;">${staff}</td>
        <td style="padding:8px 12px;">${name}</td>
        <td style="padding:8px 12px; text-align:center;">
          <button class="btn-primary generate-single-btn" data-index="${idx}" title="Open payslip">Generate</button>
        </td>
      </tr>`;
    }).join('');
    tbody.innerHTML = html;
  }

  // Fallback population from employee list if payroll run unavailable
  function populatePayslipListFromEmployees(employees) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    if (!employees || employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999">No employees available</td></tr>';
      return;
    }
    window._payslipRunCache = { period: null, rows: employees.map(e => normalizeRowObject(e)) };
    const html = window._payslipRunCache.rows.map((nr, idx) => {
      const staff = escapeHtml(nr.staff || ('STAFF' + String(idx+1).padStart(3,'0')));
      const name = escapeHtml(nr.name || 'Unknown');
      return `<tr data-index="${idx}">
        <td style="padding:8px 12px;">${staff}</td>
        <td style="padding:8px 12px;">${name}</td>
        <td style="padding:8px 12px; text-align:center;">
          <button class="btn-primary generate-single-btn" data-index="${idx}" title="Open payslip">Generate</button>
        </td>
      </tr>`;
    }).join('');
    tbody.innerHTML = html;
  }

  // Delegated click handler for list (Generate per row)
  function onPayslipListClick(ev) {
    const btn = ev.target.closest('.generate-single-btn');
    if (btn) {
      const idx = parseInt(btn.dataset.index);
      openPayslipByIndex(idx);
    }
  }

  function openPayslipByIndex(idx) {
    if (!window._payslipRunCache || !Array.isArray(window._payslipRunCache.rows)) {
      showToast('No payroll data loaded', 'error');
      return;
    }
    const row = window._payslipRunCache.rows[idx];
    if (!row) {
      showToast('Payslip row not found', 'error');
      return;
    }
    openPayslipModal(row);
  }

  // Open modal and populate fields
  function openPayslipModal(data) {
    // ensure normalized
    const row = normalizeRowObject(data);

    // fill header info
    setText('modalEmpId', row.staff || '');
    setText('modalName', row.name || '');
    setText('modalSSNIT', row.ssnit || '');
    setText('modalGhanaCard', row.ghanaCard || '');
    setText('modalDept', row.department || '');
    setText('modalEmail', row.email || '');
    setText('modalDesignation', row.designation || '');
    setText('modalBank', row.bank || '');

    // pay period field
    const period = document.getElementById('payslipPeriod')?.value || '';
    setText('modalPayPeriod', period || '—');

    // build the payroll breakdown table (basic, allowances, deductions, totals)
    const tableArea = document.getElementById('modalPayrollTableArea');
    if (!tableArea) return;

    // Build allowances HTML
    let allowancesHtml = '';
    if (Array.isArray(row.allowances) && row.allowances.length > 0) {
      allowancesHtml = row.allowances.map(a => {
        if (typeof a === 'object') {
          return `<tr><td>${escapeHtml(a.type||'Allowance')}</td><td class="text-right">${formatMoney(parseFloat(a.amount)||0)}</td></tr>`;
        } else {
          return `<tr><td>${escapeHtml(String(a))}</td><td class="text-right">0.00</td></tr>`;
        }
      }).join('');
    } else {
      allowancesHtml = `<tr><td>No allowances</td><td class="text-right">0.00</td></tr>`;
    }
    const totalAllowances = (Array.isArray(row.allowances) && row.allowances.length>0)
      ? row.allowances.reduce((s,a)=> s + (typeof a === 'object' ? (parseFloat(a.amount)||0) : 0), 0)
      : 0;

    // Deductions
    let deductionsHtml = '';
    if (Array.isArray(row.deductions) && row.deductions.length > 0) {
      deductionsHtml = row.deductions.map(d => {
        if (typeof d === 'object') {
          return `<tr><td>${escapeHtml(d.type||'Deduction')}</td><td class="text-right">${formatMoney(parseFloat(d.amount)||0)}</td></tr>`;
        } else {
          return `<tr><td>${escapeHtml(String(d))}</td><td class="text-right">0.00</td></tr>`;
        }
      }).join('');
    } else {
      deductionsHtml = `<tr><td>No deductions</td><td class="text-right">0.00</td></tr>`;
    }
    const totalDeductions = (Array.isArray(row.deductions) && row.deductions.length>0)
      ? row.deductions.reduce((s,d)=> s + (typeof d === 'object' ? (parseFloat(d.amount)||0) : 0), 0)
      : 0;

    const gross = parseFloat(row.gross) || (parseFloat(row.basicSalary||0) + totalAllowances);
    const paye = parseFloat(row.paye) || 0;
    const net = parseFloat(row.netPay) || (gross - (totalDeductions + paye));
    const employerPension = parseFloat(row.employerPension) || 0;

    // Compose summary table HTML
    const html = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
        <div style="background:#f7fafc; padding:8px; border-radius:6px;">
          <table style="width:100%; border:none; border-collapse:collapse;">
            <tr><td style="padding:4px 6px;">Basic Salary</td><td style="padding:4px 6px; text-align:right">${formatMoney(row.basicSalary||0)}</td></tr>
            ${allowancesHtml}
            <tr><td style="padding:6px 6px; font-weight:700;">Total Allowances</td><td style="padding:6px 6px; text-align:right; font-weight:700;">${formatMoney(totalAllowances)}</td></tr>
          </table>
        </div>
        <div style="background:#fff7f0; padding:8px; border-radius:6px;">
          <table style="width:100%; border:none; border-collapse:collapse;">
            <tr><td style="padding:4px 6px;">Gross Salary</td><td style="padding:4px 6px; text-align:right">${formatMoney(gross)}</td></tr>
            ${deductionsHtml}
            <tr><td style="padding:6px 6px; font-weight:700;">Total Deductions</td><td style="padding:6px 6px; text-align:right; font-weight:700;">${formatMoney(totalDeductions + paye)}</td></tr>
          </table>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:center; justify-content:space-between;">
        <div><strong>PAYE:</strong> ${formatMoney(paye)}</div>
        <div><strong>Net Pay:</strong> ${formatMoney(net)}</div>
        <div><strong>Employer Pension:</strong> ${formatMoney(employerPension)}</div>
      </div>
    `;

    tableArea.innerHTML = html;

    // modal header generated date
    const nowStr = new Date().toLocaleString();
    setText('modalGenerated', 'Generated: ' + nowStr);

    // show modal
    const modal = document.getElementById('payslipModal');
    if (modal) modal.style.display = 'flex';
  }

  function closePayslipModal() {
    const modal = document.getElementById('payslipModal');
    if (modal) modal.style.display = 'none';
  }

  // Send single payslip via API (tries multiple method names)
  async function sendPayslipForStaff(staff, period) {
    showToast('Sending payslip...' , 'info');
    for (const m of sendPayslipApiMethods) {
      const fn = window.API && window.API[m];
      if (typeof fn === 'function') {
        try {
          const resp = await fn(staff, period);
          if (resp && (resp.success || resp.sent || resp.ok)) {
            showToast('Payslip sent for ' + staff, 'success');
            return true;
          } else {
            // try next method; but inform user if response contains error
            if (resp && resp.error) {
              showToast('Send failed: ' + resp.error, 'error');
              return false;
            }
          }
        } catch (e) {
          console.warn('API.' + m + ' failed:', e);
          // try next
        }
      }
    }
    // Fallback: no send API available
    showToast('No send endpoint available; open modal and print or copy payslip', 'warning');
    return false;
  }

  // Send all payslips for loaded run
  async function onSendAllClicked() {
    if (!window._payslipRunCache || !Array.isArray(window._payslipRunCache.rows) || window._payslipRunCache.rows.length === 0) {
      showToast('No payroll run loaded', 'warning');
      return;
    }
    const period = document.getElementById('payslipPeriod')?.value || '';
    const rows = window._payslipRunCache.rows;
    const confirmMsg = `Send payslips for ${rows.length} employees for ${period}?`;
    if (!confirm(confirmMsg)) return;

    // iterate sequentially; could be made parallel with concurrency limit
    for (let i = 0; i < rows.length; i++) {
      const r = normalizeRowObject(rows[i]);
      await sendPayslipForStaff(r.staff, period);
      // small delay to avoid spamming API
      await sleep(300);
    }
    showToast('Send-all completed (or attempted)', 'success');
  }

  // Helpers

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  function formatMoney(n) {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generic try-call for other helper API methods (list provided)
  async function tryApiCall(methodNames, ...args) {
    for (const m of methodNames) {
      const fn = window.API && window.API[m];
      if (typeof fn === 'function') {
        try {
          const result = await fn(...args);
          return result;
        } catch (e) {
          console.warn('API.'+m+' failed:', e);
        }
      }
    }
    return null;
  }

  // Small toast UI (simple)
  function showToast(message, type) {
    let toast = document.getElementById('payslipToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'payslipToast';
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 16px;border-radius:8px;z-index:9999;color:#fff;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,0.15)';
      document.body.appendChild(toast);
    }
    const colors = {
      success:'#06d6a0', error:'#ef476f', info:'#3b82f6', warning:'#f59e0b'
    };
    toast.style.background = colors[type] || '#4361ee';
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> toast.style.display = 'none', DEFAULT_TOAST_TIMEOUT);
  }

  // Expose init function
  window.initPayslipModule = initPayslipModule;

  // Auto-run init if DOM has the expected elements (convenience)
  document.addEventListener('DOMContentLoaded', function() {
    try {
      // only init if the payslip page is present
      if (document.getElementById('payslipListBody')) {
        initPayslipModule();
      }
    } catch (e) {
      console.warn('Payslip module init failed:', e);
    }
  });

})();
