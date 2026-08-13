// Payslip Module - client-side rendering, generation and send
// Exposes: initPayslipModule, loadPayslipForEmployee, generatePayslipForAll, sendAllPayslips

(function () {
  'use strict';

  // Local cache for generated payslips: { "<staff>#<period>": payslipObj }
  const payslipCache = {};

  // State
  let currentPeriod = null;
  let isGeneratingAll = false;
  let isSendingAll = false;

  // Utility: small toast
  function showToast(message, type = 'info', timeout = 3000) {
    let toast = document.getElementById('payslipToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'payslipToast';
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 6px 18px rgba(0,0,0,0.12);';
      document.body.appendChild(toast);
    }
    const colors = {
      success: { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
      error: { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
      warning: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
      info: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' }
    };
    const s = colors[type] || colors.info;
    toast.style.background = s.bg;
    toast.style.color = s.color;
    toast.style.borderLeft = `4px solid ${s.border}`;
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.style.opacity = '0';
    }, timeout);
  }

  // Utility: format money
  function formatMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Fetch employees (tries API then fallback to empty)
  async function fetchEmployees() {
    try {
      if (typeof API !== 'undefined' && API && typeof API.getEmployees === 'function') {
        const resp = await API.getEmployees({ useCache: true });
        // Accept arrays or response.data
        if (Array.isArray(resp)) return resp;
        if (resp && Array.isArray(resp.data)) return resp.data;
        if (resp && resp.records && Array.isArray(resp.records)) return resp.records;
      }
      // Fallback — try other API names
      if (typeof API !== 'undefined' && API && typeof API.getAllEmployees === 'function') {
        const r2 = await API.getAllEmployees({ useCache: true });
        if (Array.isArray(r2)) return r2;
      }
    } catch (e) {
      console.warn('fetchEmployees API error', e);
    }
    // Fallback: return empty array
    return [];
  }

  // Fetch allowances for staff
  async function fetchAllowancesForStaff(staff) {
    try {
      if (typeof API !== 'undefined' && API && typeof API.getAllowancesByStaff === 'function') {
        const resp = await API.getAllowancesByStaff(staff);
        if (Array.isArray(resp)) return resp;
        if (resp && Array.isArray(resp.data)) return resp.data;
      }
    } catch (e) {
      console.warn('fetchAllowancesForStaff API error', e);
    }
    return []; // fallback
  }

  // Generate payslip data for one employee & period (client-side)
  async function generatePayslipForEmployee(staffObj, period) {
    // key for caching
    const key = `${staffObj.staff || staffObj.staffNumber || staffObj.staffNo || staffObj.id}#${period}`;
    if (payslipCache[key]) return payslipCache[key];

    // Try server generator first
    try {
      if (typeof API !== 'undefined' && API && typeof API.generatePayslip === 'function') {
        const serverResult = await API.generatePayslip(staffObj.staff || staffObj.staffNumber || staffObj.staffNo || staffObj.id, period);
        if (serverResult && serverResult.success !== false) {
          payslipCache[key] = serverResult;
          return serverResult;
        }
      }
    } catch (e) {
      console.warn('API.generatePayslip failed, falling back to client-side compute', e);
    }

    // Client-side compute: use computePayrollRow() if available
    const allowances = await fetchAllowancesForStaff(staffObj.staff || staffObj.staffNumber || staffObj.staffNo || staffObj.id);
    const allowanceList = Array.isArray(allowances) ? allowances.map(a => ({ amount: Number(a.amount || a) || 0, type: a.type || a.name || '' })) : [];

    // Build input
    const basic = Number(staffObj.basicSalary || staffObj.basic || staffObj.salary || 0) || 0;
    const employeePFpct = Number(staffObj.employeePFrate || staffObj.empPf || 5.5) || 0;
    const employerPFpct = Number(staffObj.employerPFrate || staffObj.erPf || 5) || 0;
    const reliefAmount = Number(staffObj.taxRelief || staffObj.relief || 0) || 0;
    const loanMonthly = Number(staffObj.loanMonthly || 0) || 0;
    const pfChecked = !!(staffObj.hasPF || employeePFpct > 0);

    let calc;
    if (typeof window.computePayrollRow === 'function') {
      calc = window.computePayrollRow({
        basicSalary: basic,
        allowances: allowanceList,
        employeePFpct,
        employerPFpct,
        reliefAmount,
        loanMonthly,
        pfChecked
      });
    } else {
      // Minimal fallback calculations
      const totalAllowances = allowanceList.reduce((s, a) => s + (Number(a.amount) || 0), 0);
      const grossSalary = basic + totalAllowances;
      const employeePension = basic * 0.055;
      const employeePf = pfChecked ? basic * (employeePFpct / 100) : 0;
      const taxableAmount = Math.max(0, grossSalary - (employeePension + employeePf + reliefAmount));
      const paye = Math.round(taxableAmount * 0.15 * 100) / 100; // simple placeholder 15%
      const netPay = taxableAmount - paye;
      calc = {
        totalAllowances,
        grossSalary,
        employeePension,
        employeePf,
        taxRelief: reliefAmount,
        totalDeductionsBeforeTax: employeePension + employeePf + reliefAmount,
        taxableAmount,
        paye,
        netPay,
        loanMonthly,
        takeHomePay: Math.max(0, netPay - loanMonthly),
        employerPension: basic * 0.13,
        employerPf: employerPFpct ? basic * (employerPFpct / 100) : 0
      };
    }

    // Build payslip object
    const payslip = {
      staff: staffObj.staff || staffObj.staffNumber || staffObj.staffNo || staffObj.id,
      name: staffObj.name || staffObj.fullName || staffObj.empName || '',
      department: staffObj.department || staffObj.dept || '',
      designation: staffObj.designation || staffObj.title || '',
      email: staffObj.email || '',
      ssnit: staffObj.ssnit || '',
      ghanaCard: staffObj.ghanaCard || '',
      period,
      basic,
      allowances: allowanceList,
      calculations: calc,
      generatedAt: new Date().toISOString()
    };

    payslipCache[key] = payslip;
    return payslip;
  }

  // Render payslip list table rows
  function renderPayslipListTable(payslips) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    if (!payslips || payslips.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="padding:16px; text-align:center; color:#999; font-size:13px;">
            <i class="fas fa-inbox"></i> No payslips generated for selected period.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = payslips.map(p => {
      const staffKey = p.staff || '';
      return `
        <tr>
          <td style="padding:10px 14px;">${escapeHtml(staffKey)}</td>
          <td style="padding:10px 14px;">${escapeHtml(p.name || '')}</td>
          <td style="padding:10px 14px; text-align:center;">
            <button class="btn-outline" onclick="window.showPayslipModal('${escapeHtml(staffKey)}')">View</button>
            <button class="btn-primary" style="margin-left:8px;" onclick="window.sendPayslip('${escapeHtml(staffKey)}')">Send</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`]/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[s]));
  }

  // Public: show payslip modal for a given staff (global function for button onclick)
  window.showPayslipModal = async function (staffKey) {
    if (!staffKey) return;
    const period = currentPeriod || document.getElementById('payslipPeriod')?.value || (new Date().toISOString().slice(0,7));
    // Try find payslip from cache; if not, try to generate using employee fetch
    const key = `${staffKey}#${period}`;
    let payslip = payslipCache[key];
    if (!payslip) {
      // Need employee object
      const employees = await fetchEmployees();
      const staffObj = employees.find(e => (e.staff === staffKey) || (e.staffNumber === staffKey) || (e.staffNo === staffKey) || (e.id === staffKey));
      if (!staffObj) {
        showToast('Employee not found: ' + staffKey, 'error');
        return;
      }
      payslip = await generatePayslipForEmployee(staffObj, period);
    }
    populatePayslipModal(payslip);
    const modal = document.getElementById('payslipModal');
    if (modal) modal.style.display = 'flex';
  };

  // Populate modal DOM with payslip data
  function populatePayslipModal(p) {
    if (!p) return;
    document.getElementById('modalPayPeriod').textContent = p.period || '';
    document.getElementById('modalEmpId').textContent = p.staff || '';
    document.getElementById('modalSSNIT').textContent = p.ssnit || '--';
    document.getElementById('modalName').textContent = p.name || '--';
    document.getElementById('modalGhanaCard').textContent = p.ghanaCard || '--';
    document.getElementById('modalDept').textContent = p.department || '--';
    document.getElementById('modalEmail').textContent = p.email || '--';
    document.getElementById('modalDesignation').textContent = p.designation || '--';
    document.getElementById('modalBank').textContent = p.bank || '--';

    // Build payroll table area
    const container = document.getElementById('modalPayrollTableArea');
    if (!container) return;

    const calc = p.calculations || {};
    const allowancesHtml = (p.allowances || []).map(a => `<tr><td style="text-align:left">${escapeHtml(a.type || '')}</td><td style="text-align:right">${formatMoney(a.amount || 0)}</td></tr>`).join('');
    const payrollTableHtml = `
      <table class="payslip-table-compact" style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr>
            <th style="text-align:left">Particulars</th>
            <th style="text-align:right">Amount (GH₵)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="text-align:left">Basic Salary</td><td style="text-align:right">${formatMoney(p.basic)}</td></tr>
          ${allowancesHtml || '<tr><td style="text-align:left">Allowances</td><td style="text-align:right">0.00</td></tr>'}
          <tr><td style="text-align:left"><strong>Gross Salary</strong></td><td style="text-align:right"><strong>${formatMoney(calc.grossSalary || 0)}</strong></td></tr>
          <tr><td style="text-align:left">Employee Pension</td><td style="text-align:right">${formatMoney(calc.employeePension || 0)}</td></tr>
          <tr><td style="text-align:left">Employee PF</td><td style="text-align:right">${formatMoney(calc.employeePf || 0)}</td></tr>
          <tr><td style="text-align:left">Tax Relief</td><td style="text-align:right">${formatMoney(calc.taxRelief || 0)}</td></tr>
          <tr><td style="text-align:left">Taxable Income</td><td style="text-align:right">${formatMoney(calc.taxableAmount || 0)}</td></tr>
          <tr><td style="text-align:left">PAYE</td><td style="text-align:right">${formatMoney(calc.paye || 0)}</td></tr>
          <tr><td style="text-align:left">Loan Monthly</td><td style="text-align:right">${formatMoney(calc.loanMonthly || 0)}</td></tr>
          <tr><td style="text-align:left"><strong>Net Pay</strong></td><td style="text-align:right"><strong>${formatMoney(calc.netPay || 0)}</strong></td></tr>
        </tbody>
      </table>
    `;
    container.innerHTML = payrollTableHtml;

    document.getElementById('modalGenerated').textContent = 'Generated: ' + (p.generatedAt ? new Date(p.generatedAt).toLocaleString() : new Date().toLocaleString());

    // Wire modal buttons (print / send / close)
    const printBtn = document.getElementById('modalPrintBtn');
    const sendBtn = document.getElementById('modalSendBtn');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (printBtn) {
      printBtn.onclick = function () {
        printPayslipModalContent();
      };
    }
    if (sendBtn) {
      sendBtn.onclick = function () {
        sendPayslip(p.staff);
      };
    }
    if (closeBtn) {
      closeBtn.onclick = function () {
        const modal = document.getElementById('payslipModal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // Print modal content using a simple popup window containing the payslip HTML
  function printPayslipModalContent() {
    const contentEl = document.getElementById('payslipModalContent');
    if (!contentEl) return;
    const html = `
      <html>
        <head>
          <title>Payslip</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 6px 8px; border-bottom: 1px solid #eee; }
            .header { text-align: center; margin-bottom: 12px; }
            .header h2 { margin: 0; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          ${contentEl.innerHTML}
        </body>
      </html>
    `;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
      showToast('Popup blocked. Please allow popups to print.', 'warning');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 300);
  }

  // Send payslip for a single staff
  window.sendPayslip = async function (staffKey) {
    if (!staffKey) return;
    const period = currentPeriod || document.getElementById('payslipPeriod')?.value || (new Date().toISOString().slice(0,7));
    const key = `${staffKey}#${period}`;
    const payslip = payslipCache[key];
    if (!payslip) {
      showToast('Payslip not generated yet for ' + staffKey, 'warning');
      return;
    }

    try {
      if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
        showToast('Sending payslip to ' + staffKey + '...', 'info');
        const resp = await API.sendPayslip(staffKey, period, payslip);
        if (resp && resp.success !== false) {
          showToast('Payslip sent: ' + staffKey, 'success');
        } else {
          throw new Error(resp && resp.error ? resp.error : 'Send failed');
        }
      } else {
        // Fallback: pretend to send
        showToast('Sending (simulated) payslip to ' + staffKey, 'success');
      }
    } catch (e) {
      console.error('sendPayslip error', e);
      showToast('Failed to send payslip: ' + (e.message || e), 'error');
    }
  };

  // Generate payslips for all employees in the current list
  async function generatePayslipForAll() {
    if (isGeneratingAll) return;
    isGeneratingAll = true;
    const btn = document.getElementById('generatePayslipBtn');
    if (btn) btn.disabled = true;

    const period = document.getElementById('payslipPeriod')?.value || (new Date().toISOString().slice(0,7));
    currentPeriod = period;

    showToast('Generating payslips for ' + period + ' ...', 'info', 4000);

    try {
      const employees = await fetchEmployees();
      if (!employees || employees.length === 0) {
        showToast('No employees found to generate payslips', 'warning');
        return;
      }

      const generated = [];
      for (const emp of employees) {
        try {
          const p = await generatePayslipForEmployee(emp, period);
          generated.push(p);
        } catch (e) {
          console.warn('Failed generating for', emp, e);
        }
      }

      renderPayslipListTable(generated);
      showToast('Payslips generated for ' + generated.length + ' employees', 'success');
    } catch (e) {
      console.error('generatePayslipForAll error', e);
      showToast('Error generating payslips: ' + (e.message || e), 'error');
    } finally {
      isGeneratingAll = false;
      if (btn) btn.disabled = false;
    }
  }

  // Send all generated payslips
  async function sendAllPayslips() {
    if (isSendingAll) return;
    isSendingAll = true;
    const btn = document.getElementById('sendAllPayslipsBtn');
    if (btn) btn.disabled = true;

    const period = document.getElementById('payslipPeriod')?.value || currentPeriod || (new Date().toISOString().slice(0,7));
    const keys = Object.keys(payslipCache).filter(k => k.endsWith('#' + period));
    if (keys.length === 0) {
      showToast('No generated payslips for ' + period, 'warning');
      isSendingAll = false;
      if (btn) btn.disabled = false;
      return;
    }

    // Show modal overlay with progress if present
    const overlay = document.getElementById('sendAllLoadingOverlay');
    if (overlay) overlay.classList.add('active');

    try {
      let sent = 0;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const p = payslipCache[key];
        // Update progress text
        const progressText = document.getElementById('sendAllProgress');
        if (progressText) progressText.textContent = `Sending ${i+1}/${keys.length} — ${p.staff || p.name || ''}`;

        // Send via API if available, else simulate
        try {
          if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
            const resp = await API.sendPayslip(p.staff, period, p);
            if (resp && resp.success !== false) {
              sent++;
            } else {
              console.warn('sendPayslip returned error for', p.staff, resp);
            }
          } else {
            // simulate small delay
            await new Promise(r => setTimeout(r, 200));
            sent++;
          }
        } catch (e) {
          console.warn('Error sending payslip for', p.staff, e);
        }
      }

      showToast(`Sent ${sent}/${keys.length} payslips`, 'success');
    } catch (e) {
      console.error('sendAllPayslips error', e);
      showToast('Error sending payslips: ' + (e.message || e), 'error');
    } finally {
      isSendingAll = false;
      if (btn) btn.disabled = false;
      if (overlay) overlay.classList.remove('active');
      // hide overlay after short delay
      setTimeout(() => {
        const overlay2 = document.getElementById('sendAllLoadingOverlay');
        if (overlay2) overlay2.classList.remove('active');
      }, 800);
    }
  }

  // Initialize module: hook UI and load existing data (if any)
  async function initPayslipModule() {
    try {
      // Hook buttons
      const genBtn = document.getElementById('generatePayslipBtn');
      if (genBtn) {
        genBtn.removeEventListener('click', generatePayslipForAll);
        genBtn.addEventListener('click', generatePayslipForAll);
      }

      const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
      if (sendAllBtn) {
        sendAllBtn.removeEventListener('click', sendAllPayslips);
        sendAllBtn.addEventListener('click', sendAllPayslips);
      }

      const periodInput = document.getElementById('payslipPeriod');
      if (periodInput) {
        // default to current month
        if (!periodInput.value) {
          const now = new Date();
          periodInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        periodInput.removeEventListener('change', onPeriodChange);
        periodInput.addEventListener('change', onPeriodChange);
        currentPeriod = periodInput.value;
      }

      // Prepopulate list (if server has pre-generated payslips, we could fetch them)
      // For now, show employees as "generate-able"
      await loadAndRenderEmployeeList();

      // Make global functions available (used by buttons in rendered rows)
      window.generatePayslipForAll = generatePayslipForAll;
      window.sendAllPayslips = sendAllPayslips;
      window.initPayslipModule = initPayslipModule;

      console.log('Payslip module initialized');
    } catch (e) {
      console.error('initPayslipModule error', e);
    }
  }

  async function onPeriodChange(e) {
    currentPeriod = e.target.value;
    // Clear cache for other periods? keep cache but render empty state
    // Re-render list using cached payslips for this period, if any
    const keys = Object.keys(payslipCache).filter(k => k.endsWith('#' + currentPeriod));
    if (keys.length > 0) {
      const payslips = keys.map(k => payslipCache[k]);
      renderPayslipListTable(payslips);
    } else {
      // empty state
      renderPayslipListTable([]);
    }
  }

  // Load employee list and display as "not-yet-generated" rows (allows generate per staff)
  async function loadAndRenderEmployeeList() {
    const employees = await fetchEmployees();
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;

    if (!employees || employees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="padding:16px; text-align:center; color:#999; font-size:13px;">
            <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> No employees loaded.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = employees.map(emp => {
      const staffKey = emp.staff || emp.staffNumber || emp.staffNo || emp.id || '';
      const fullName = emp.name || emp.fullName || emp.empName || '';
      return `
        <tr>
          <td style="padding:10px 14px;">${escapeHtml(staffKey)}</td>
          <td style="padding:10px 14px;">${escapeHtml(fullName)}</td>
          <td style="padding:10px 14px; text-align:center;">
            <button class="btn-outline" onclick="(async function(){ const period=document.getElementById('payslipPeriod').value; const p = await (window.generatePayslipForEmployee ? window.generatePayslipForEmployee(${JSON.stringify(staffKey)}, period) : null); window.showPayslipModal('${escapeHtml(staffKey)}'); })();">View / Generate</button>
            <button class="btn-primary" style="margin-left:8px;" onclick="(async function(){ const period=document.getElementById('payslipPeriod').value; const empObj = ${JSON.stringify(emp)}; await (window.generatePayslipForEmployee ? window.generatePayslipForEmployee(empObj, period) : null); renderPayslipListTable([payslipCache[Object.keys(payslipCache).find(k=>k.startsWith('${escapeHtml(staffKey)}#'))]]); })();">Generate</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Expose generatePayslipForEmployee to global (already used in row action)
  window.generatePayslipForEmployee = generatePayslipForEmployee;

  // Expose init
  window.initPayslipModule = initPayslipModule;

  // Auto-init if fragment is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Do not auto-initialize here; caller (the fragment) should call initPayslipModule()
    // But it's safe to attach the function to window now.
  }
})();
