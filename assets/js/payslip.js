/**
 * Payslip module (client-side)
 * - Loads payroll run staff list from Payroll Runs sheet via API
 * - Builds payslip details combining Payroll Runs + Payroll Allowance Runs
 * - Computes YTD (if API supports fetching historical runs)
 *
 * Drop this file at: assets/js/payslip.js
 * Ensure index.html includes it (your index already does).
 */

(function () {
  'use strict';

  // Local cache
  let _currentPeriod = null;
  let _payrollRuns = []; // array of payroll rows for current period
  let _allowanceRuns = []; // allowances for current period (array of {staff, type, amount} or map)
  let _isInitialized = false;

  // Utility: try several API function names or argument shapes
  async function tryApiCall(possibleCalls) {
    for (const call of possibleCalls) {
      try {
        if (!window.API) continue;
        const fn = window.API[call.name];
        if (typeof fn !== 'function') continue;
        const res = await fn.apply(window.API, call.args || []);
        if (res !== undefined && res !== null) return res;
      } catch (e) {
        console.warn('tryApiCall error for', call.name, e && e.message);
      }
    }
    return null;
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '0.00';
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Normalize payroll run items to a predictable shape
  function normalizePayrollRuns(raw) {
    // Accept:
    // - array of objects [{ staffNumber, name, basic, gross, net, paye, pension, employerCost, loan, allowances: [] }, ...]
    // - object with data property
    let rows = [];
    if (!raw) return rows;
    if (Array.isArray(raw)) rows = raw;
    else if (raw.data && Array.isArray(raw.data)) rows = raw.data;
    else if (raw.records && Array.isArray(raw.records)) rows = raw.records;
    else if (typeof raw === 'object') {
      // attempt to extract array-valued properties
      const arr = Object.values(raw).find(v => Array.isArray(v));
      if (arr) rows = arr;
    }

    // Heuristic normalizer: ensure staffNumber and name exist
    return rows.map(r => {
      // if rows are arrays (CSV-like), attempt to map by index with header fallback
      if (Array.isArray(r)) {
        // try to find common positions: staff, name, basic, gross, net
        return {
          staffNumber: r[0] || '',
          name: r[1] || '',
          basic: parseFloat(r[2]) || 0,
          gross: parseFloat(r[3]) || 0,
          net: parseFloat(r[4]) || 0,
          paye: parseFloat(r[5]) || 0,
          pension: parseFloat(r[6]) || 0,
          allowances: r[7] || []
        };
      } else {
        return {
          staffNumber: r.staffNumber || r.staff || r.staff_no || r.staffId || r.staff_number || r['Staff Number'] || '',
          name: r.name || r.fullName || r['Full Name'] || r.employeeName || '',
          basic: parseFloat(r.basic || r.basicSalary || r.basic_pay || r['Basic Salary']) || 0,
          gross: parseFloat(r.gross || r.grossPay) || 0,
          net: parseFloat(r.net || r.netPay) || 0,
          paye: parseFloat(r.paye || r.PAYE || r.tax || 0) || 0,
          pension: parseFloat(r.employeePension || r.pension || 0) || 0,
          employerCost: parseFloat(r.employerCost || r.employerPension || 0) || 0,
          loan: parseFloat(r.loanMonthly || r.loan || 0) || 0,
          allowances: r.allowances || r.allowanceDetails || []
        };
      }
    });
  }

  // Normalize allowance runs into a map: { staffNumber: [ { type, amount }, ... ] }
  function normalizeAllowanceRuns(raw) {
    const map = {};
    if (!raw) return map;
    let rows = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw.data && Array.isArray(raw.data)) rows = raw.data;
    else if (raw.records && Array.isArray(raw.records)) rows = raw.records;
    else {
      const arr = Object.values(raw).find(v => Array.isArray(v));
      if (arr) rows = arr;
    }

    rows.forEach(r => {
      if (Array.isArray(r)) {
        const staff = r[0] || '';
        const type = r[1] || 'Allowance';
        const amount = parseFloat(r[2]) || 0;
        if (!map[staff]) map[staff] = [];
        map[staff].push({ type, amount });
      } else {
        const staff = r.staffNumber || r.staff || r['Staff Number'] || '';
        const type = r.type || r.allowanceType || 'Allowance';
        const amount = parseFloat(r.amount || r.value || r.allowance || 0) || 0;
        if (!map[staff]) map[staff] = [];
        map[staff].push({ type, amount });
      }
    });

    return map;
  }

  // Build payslip HTML (modal content). YTD values are computed separately and injected.
  function buildPayslipHtml(payData, ytdData) {
    // payData: { staffNumber, name, basic, allowances: [{type,amount}], gross, net, paye, pension, employerCost, loan }
    const allowances = payData.allowances || [];
    const allowancesHtml = allowances.length === 0
      ? '<tr><td>—</td><td class="text-right">0.00</td></tr>'
      : allowances.map(a => `<tr><td>${a.type}</td><td class="text-right">${formatCurrency(a.amount)}</td></tr>`).join('');

    const totalAllowances = allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

    const html = `
      <div class="payslip-modal-inner" style="padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <div style="font-weight:800; font-size:18px;">GAP MICROFINANCE LTD</div>
            <div style="color:#666; margin-top:6px;">Payslip for: <strong>${payData.name || '—'}</strong></div>
            <div style="color:#666; margin-top:4px;">Staff No: <strong>${payData.staffNumber || '—'}</strong></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#666;">Pay Period</div>
            <div style="font-weight:700; font-size:16px;">${_currentPeriod || '—'}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px;">
          <div style="background:#f7fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="font-weight:700; margin-bottom:8px;">Earnings</div>
            <table style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td>Basic Salary</td><td class="text-right">${formatCurrency(payData.basic)}</td></tr>
                ${allowancesHtml}
                <tr class="total-row" style="font-weight:700; border-top:1px dashed #e2e8f0;"><td>Total Earnings</td><td class="text-right">${formatCurrency((payData.basic||0) + totalAllowances)}</td></tr>
              </tbody>
            </table>
          </div>

          <div style="background:#fff7f8; padding:12px; border-radius:8px; border:1px solid #fde2e6;">
            <div style="font-weight:700; margin-bottom:8px;">Deductions</div>
            <table style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr><td>Employee Pension</td><td class="text-right">${formatCurrency(payData.pension || 0)}</td></tr>
                <tr><td>Employee PF</td><td class="text-right">${formatCurrency(payData.employeePf || 0)}</td></tr>
                <tr><td>PAYE (Tax)</td><td class="text-right">${formatCurrency(payData.paye || 0)}</td></tr>
                <tr><td>Loan</td><td class="text-right">${formatCurrency(payData.loan || 0)}</td></tr>
                <tr class="total-row" style="font-weight:700; border-top:1px dashed #e2e8f0;"><td>Total Deductions</td><td class="text-right">${formatCurrency(payData.totalDeductions || ((payData.pension||0)+(payData.employeePf||0)+(payData.paye||0)+(payData.loan||0)))}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:16px; gap:12px; align-items:center;">
          <div style="background:#f0fff4; padding:12px; border-radius:8px; border:1px solid #e2f6e9; flex:1;">
            <div style="font-size:12px; color:#666;">Net Pay</div>
            <div style="font-weight:800; font-size:20px; margin-top:6px;">GH₵ ${formatCurrency(payData.net)}</div>
          </div>
          <div style="background:#f7f7ff; padding:12px; border-radius:8px; border:1px solid #e6e6ff; flex:1;">
            <div style="font-size:12px; color:#666;">Employer Cost</div>
            <div style="font-weight:700; font-size:16px; margin-top:6px;">GH₵ ${formatCurrency(payData.employerCost || 0)}</div>
            <div style="font-size:12px; color:#999; margin-top:4px;">(Employer Pension & PF)</div>
          </div>
          <div style="background:#fff8e6; padding:12px; border-radius:8px; border:1px solid #fff0d1; flex:1;">
            <div style="font-size:12px; color:#666;">Take Home</div>
            <div style="font-weight:800; font-size:16px; margin-top:6px;">GH₵ ${formatCurrency(payData.takeHome || payData.net - (payData.loan||0))}</div>
          </div>
        </div>

        <div style="margin-top:18px;">
          <div style="font-weight:700; margin-bottom:8px;">Year to Date (YTD)</div>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
            <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eaeaea;">
              <div style="font-size:11px; color:#666;">Gross YTD</div>
              <div style="font-weight:700; margin-top:6px;">GH₵ ${formatCurrency(ytdData.gross || 0)}</div>
            </div>
            <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eaeaea;">
              <div style="font-size:11px; color:#666;">Net YTD</div>
              <div style="font-weight:700; margin-top:6px;">GH₵ ${formatCurrency(ytdData.net || 0)}</div>
            </div>
            <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eaeaea;">
              <div style="font-size:11px; color:#666;">PAYE YTD</div>
              <div style="font-weight:700; margin-top:6px;">GH₵ ${formatCurrency(ytdData.paye || 0)}</div>
            </div>
            <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eaeaea;">
              <div style="font-size:11px; color:#666;">Pension YTD</div>
              <div style="font-weight:700; margin-top:6px;">GH₵ ${formatCurrency(ytdData.pension || 0)}</div>
            </div>
          </div>
        </div>

      </div>
    `;

    return html;
  }

  // UI: render staff list (table rows)
  function renderPayslipList(normalizedRuns) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;

    if (!normalizedRuns || normalizedRuns.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="padding:16px; text-align:center; color:#999;">
            <i class="fas fa-inbox"></i> No payroll run found for selected period.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = normalizedRuns.map(r => {
      const staff = r.staffNumber || r.staff || '';
      const name = r.name || r.fullName || '';

      return `<tr>
        <td style="padding:10px 12px;">${escapeHtml(staff)}</td>
        <td style="padding:10px 12px;">${escapeHtml(name)}</td>
        <td style="text-align:center;">
          <button class="btn-outline" data-staff="${escapeHtml(staff)}" data-name="${escapeHtml(name)}" onclick="openPayslipModal('${escapeHtml(staff)}', '${escapeHtml(name)}')">
            <i class="fas fa-file-invoice"></i> View
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`]/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[s]));
  }

  // PUBLIC: open payslip modal and populate content
  window.openPayslipModal = async function (staffNumber, staffName) {
    // Find payroll run entry in cache
    const entry = _payrollRuns.find(r => {
      const s = (r.staffNumber || r.staff || r['Staff Number'] || '').toString();
      return s === staffNumber.toString();
    }) || null;

    // allowances map
    const allowancesMap = normalizeAllowanceRuns(_allowanceRuns);
    const staffAllowances = allowancesMap[staffNumber] || entry && entry.allowances || [];

    // Compose payData
    const payData = {
      staffNumber,
      name: staffName || (entry && entry.name) || '',
      basic: entry && (entry.basic || 0) || 0,
      allowances: Array.isArray(staffAllowances) ? staffAllowances : [],
      gross: entry && (entry.gross || 0) || 0,
      net: entry && (entry.net || 0) || 0,
      paye: entry && (entry.paye || 0) || 0,
      pension: entry && (entry.pension || 0) || 0,
      employeePf: entry && (entry.employeePf || 0) || 0,
      employerCost: entry && (entry.employerCost || 0) || 0,
      loan: entry && (entry.loan || 0) || 0,
      totalDeductions: entry && entry.totalDeductions
    };

    // Compute takeHome if missing
    payData.takeHome = payData.net;

    // Attempt to compute YTD by summing payroll runs up to current period
    const ytdData = await computeYTDForStaff(staffNumber, _currentPeriod);

    // Build HTML and show modal
    const area = document.getElementById('modalPayrollTableArea');
    if (!area) {
      alert('Payslip modal area not found');
      return;
    }
    area.innerHTML = buildPayslipHtml(payData, ytdData);

    // Show modal
    const modal = document.getElementById('payslipModal');
    if (modal) modal.style.display = 'flex';

    // Hook print / send / close inside modal
    setupPayslipModalActions(staffNumber, payData, ytdData);
  };

  async function computeYTDForStaff(staffNumber, period) {
    // Try to get payroll runs up to the period and sum fields
    // Possible API names:
    // - API.getPayrollRunsUpTo(period)
    // - API.getPayrollRuns({ upTo: period })
    // - API.getPayrollRunsHistory(period) (fallback)
    const resp = await tryApiCall([
      { name: 'getPayrollRunsUpTo', args: [period] },
      { name: 'getPayrollRuns', args: [{ upTo: period }] },
      { name: 'getPayrollRuns', args: [] }, // maybe returns all runs
      { name: 'getPayrollHistory', args: [period] }
    ]);

    const normalized = normalizePayrollRuns(resp);
    let gross = 0, net = 0, paye = 0, pension = 0;
    if (normalized && normalized.length) {
      normalized.forEach(r => {
        const s = (r.staffNumber || r.staff || '').toString();
        if (s === staffNumber.toString()) {
          gross += parseFloat(r.gross || 0) || 0;
          net += parseFloat(r.net || 0) || 0;
          paye += parseFloat(r.paye || 0) || 0;
          pension += parseFloat(r.pension || 0) || 0;
        }
      });
    }

    return { gross, net, paye, pension };
  }

  function setupPayslipModalActions(staffNumber, payData, ytdData) {
    const printBtn = document.getElementById('modalPrintBtn');
    const sendBtn = document.getElementById('modalSendBtn');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (printBtn) {
      printBtn.onclick = function () {
        // Print the modal content area only
        const content = document.querySelector('#payslipModalContent .payslip-modal-inner') || document.getElementById('modalPayrollTableArea');
        if (!content) {
          window.print();
          return;
        }
        const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
        w.document.write('<html><head><title>Payslip</title>');
        // copy stylesheets
        Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
          w.document.head.appendChild(node.cloneNode(true));
        });
        w.document.write('</head><body>');
        w.document.write(content.outerHTML);
        w.document.write('</body></html>');
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 500);
      };
    }

    if (sendBtn) {
      sendBtn.onclick = async function () {
        // if API.sendPayslip exists, use it. Otherwise show a toast.
        if (!window.API || typeof window.API.sendPayslip !== 'function') {
          alert('Send payslip is not configured on this installation. Implement API.sendPayslip(staffNumber, period, payload) to enable sending.');
          return;
        }
        try {
          sendBtn.disabled = true;
          sendBtn.querySelector && sendBtn.querySelector('i') && (sendBtn.querySelector('i').className = 'fas fa-spinner fa-spin');
          const payload = {
            staffNumber,
            period: _currentPeriod,
            payslip: payData,
            ytd: ytdData
          };
          const result = await window.API.sendPayslip(staffNumber, _currentPeriod, payload);
          if (result && (result.success || result.status === 'ok')) {
            alert('Payslip sent successfully');
          } else {
            alert('Send failed: ' + (result && result.error ? result.error : 'Unknown error'));
          }
        } catch (e) {
          console.error('Error sending payslip:', e);
          alert('Error sending payslip: ' + (e.message || e));
        } finally {
          sendBtn.disabled = false;
          sendBtn.querySelector && sendBtn.querySelector('i') && (sendBtn.querySelector('i').className = 'fas fa-envelope');
        }
      };
    }

    if (closeBtn) {
      closeBtn.onclick = function () {
        const modal = document.getElementById('payslipModal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // Load payroll runs and allowances for a period
  async function loadPayrollDataForPeriod(period) {
    _currentPeriod = period;

    // Try to call the most common endpoints
    const payrollResp = await tryApiCall([
      { name: 'getPayrollRuns', args: [period] },
      { name: 'getPayrollRun', args: [period] },
      { name: 'getPayrollData', args: [period] },
      { name: 'loadPayrollRuns', args: [period] }
    ]);

    const allowanceResp = await tryApiCall([
      { name: 'getPayrollAllowancesRun', args: [period] },
      { name: 'getPayrollAllowanceRuns', args: [period] },
      { name: 'getPayrollAllowances', args: [period] },
      { name: 'loadPayrollAllowances', args: [period] }
    ]);

    _payrollRuns = normalizePayrollRuns(payrollResp);
    _allowanceRuns = allowanceResp || [];

    renderPayslipList(_payrollRuns);
  }

  // Public: load list for period UI
  async function loadPayslipList(period) {
    // default to selected period UI element if not provided
    const periodInput = document.getElementById('payslipPeriod');
    const per = period || (periodInput && periodInput.value) || null;
    if (!per) {
      // no period - clear list
      _currentPeriod = null;
      _payrollRuns = [];
      _allowanceRuns = [];
      renderPayslipList([]);
      return;
    }
    await loadPayrollDataForPeriod(per);
  }

  // Wire UI and initialization
  function initPayslipModule() {
    if (_isInitialized) return;
    _isInitialized = true;

    // Set default period (if not set) to current month
    const periodInput = document.getElementById('payslipPeriod');
    if (periodInput && !periodInput.value) {
      const now = new Date();
      const m = now.getMonth() + 1;
      const monthStr = String(m).padStart(2, '0');
      periodInput.value = `${now.getFullYear()}-${monthStr}`;
    }

    // Attach event handlers
    const genBtn = document.getElementById('generatePayslipBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        loadPayslipList();
      });
    }

    if (periodInput) {
      periodInput.addEventListener('change', function () {
        loadPayslipList();
      });
    }

    const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', async function () {
        // fetch all staff and send sequentially (or stub)
        if (!window.API || typeof window.API.sendPayslip !== 'function') {
          alert('Batch send not available: API.sendPayslip is not implemented.');
          return;
        }
        if (!_currentPeriod) {
          alert('Please select a period first.');
          return;
        }
        // simple confirmation
        if (!confirm('Send payslips to all employees in the list?')) return;
        const list = _payrollRuns.slice(0);
        for (const row of list) {
          const staff = row.staffNumber || row.staff || row['Staff Number'];
          const payload = { staffNumber: staff, period: _currentPeriod, payslipData: row };
          try {
            await window.API.sendPayslip(staff, _currentPeriod, payload);
            console.log('Sent payslip to', staff);
          } catch (e) {
            console.warn('Failed to send to', staff, e);
          }
        }
        alert('Send attempt completed. Check console for details.');
      });
    }

    // initial load if period set
    loadPayslipList();

    // If modal close button exists, ensure it hides modal on click
    const modalClose = document.getElementById('modalCloseBtn');
    if (modalClose) modalClose.addEventListener('click', () => {
      const modal = document.getElementById('payslipModal');
      if (modal) modal.style.display = 'none';
    });

    // close modal on background click
    const payslipModal = document.getElementById('payslipModal');
    if (payslipModal) {
      payslipModal.addEventListener('click', (e) => {
        if (e.target === payslipModal) payslipModal.style.display = 'none';
      });
    }
  }

  // Expose public API
  window.initPayslipModule = initPayslipModule;
  window.loadPayslipList = loadPayslipList;
  window.openPayslipModal = window.openPayslipModal;

  // Auto initialize on DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initPayslipModule, 50);
  } else {
    document.addEventListener('DOMContentLoaded', initPayslipModule);
  }

})();
