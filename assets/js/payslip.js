// assets/js/payslip.js
(function() {
  // state
  let _actionPortalOpen = false;
  let _currentPeriod = null;

  function initPayslipModule() {
    // set default period to current month (YYYY-MM)
    const monthInput = document.getElementById('payslipPeriod');
    if (monthInput) {
      if (!monthInput.value) {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        monthInput.value = `${now.getFullYear()}-${mm}`;
      }
      _currentPeriod = monthInput.value;
      monthInput.addEventListener('change', function() {
        _currentPeriod = monthInput.value;
        loadPayslipList(_currentPeriod);
      });
    }

    const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', function() {
        if (!confirm('Send payslips for ' + (_currentPeriod || 'selected period') + ' to all employees?')) return;
        sendAllPayslips(_currentPeriod);
      });
    }

    // global click to close portal
    document.addEventListener('click', function(e) {
      if (_actionPortalOpen) closeActionDropdown();
    });

    loadPayslipList(_currentPeriod);
  }

  async function loadPayslipList(period) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="3" style="padding:14px; text-align:center; color:#666;">Loading...</td></tr>`;

    try {
      let employees = [];
      if (typeof API !== 'undefined' && API && typeof API.getEmployees === 'function') {
        const resp = await API.getEmployees({ useCache: true }).catch(() => []);
        // normalize resp shape
        employees = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp.data ? resp.data : []);
      } else {
        // fallback demo
        employees = [
          { staff: 'EMP001', name: 'Alice Doe' },
          { staff: 'EMP002', name: 'Bob Smith' },
          { staff: 'EMP003', name: 'Carol Jones' }
        ];
      }

      if (!employees || employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:14px; text-align:center; color:#666;">No employees found</td></tr>`;
        return;
      }

      const rows = employees.map(emp => {
        const staffNumber = emp['Staff Number'] || emp.staff || emp.staffNumber || '';
        const fullName = emp['Full Name'] || emp.name || emp.fullName || '';
        return `<tr data-staff="${escapeHtml(staffNumber)}">
          <td>${escapeHtml(staffNumber)}</td>
          <td>${escapeHtml(fullName)}</td>
          <td style="text-align:right;">
            <button class="action-btn" onclick="openPayslipActionDropdown(event, '${escapeJs(staffNumber)}')">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </td>
        </tr>`;
      }).join('');

      tbody.innerHTML = rows;
    } catch (err) {
      console.error('Error loading payslip list', err);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:14px; text-align:center; color:#c00;">Failed to load employees</td></tr>`;
    }
  }

  // expose the action dropdown function globally so inline onclick can call it
  window.openPayslipActionDropdown = function(event, staffNumber) {
    event.stopPropagation();
    closeActionDropdown();

    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const portal = document.getElementById('payslipActionPortal');
    if (!portal) return;

    portal.innerHTML = `
      <div style="background:white; border-radius:6px; box-shadow:0 8px 20px rgba(0,0,0,0.12); overflow:hidden; min-width:120px;">
        <button class="dropdown-item" style="display:block;width:100%;padding:8px 12px;border:none;background:none;text-align:left;cursor:pointer;" onclick="viewPayslip('${escapeJs(staffNumber)}')">View</button>
        <button class="dropdown-item" style="display:block;width:100%;padding:8px 12px;border:none;background:none;text-align:left;cursor:pointer;" onclick="sendPayslip('${escapeJs(staffNumber)}')">Send</button>
      </div>
    `;

    portal.style.display = 'block';
    portal.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    portal.style.left = (rect.left + window.scrollX - 10) + 'px';
    _actionPortalOpen = true;
  };

  function closeActionDropdown() {
    const portal = document.getElementById('payslipActionPortal');
    if (portal) {
      portal.innerHTML = '';
      portal.style.display = 'none';
    }
    _actionPortalOpen = false;
  }

  // view payslip in modal
  window.viewPayslip = async function(staffNumber) {
    closeActionDropdown();

    const period = _currentPeriod;
    const modal = document.getElementById('payslipModal');
    const modalArea = document.getElementById('modalPayrollTableArea');
    const modalEmpId = document.getElementById('modalEmpId');
    const modalName = document.getElementById('modalName');
    const modalPayPeriod = document.getElementById('modalPayPeriod');

    if (modalEmpId) modalEmpId.textContent = staffNumber || '-';
    if (modalName) {
      // try to fetch employee name
      let name = '';
      if (typeof API !== 'undefined' && API && typeof API.getEmployeeByStaffNumber === 'function') {
        try {
          const rec = await API.getEmployeeByStaffNumber(staffNumber);
          name = rec && (rec['Full Name'] || rec.name) ? (rec['Full Name'] || rec.name) : '';
        } catch (e) { name = ''; }
      }
      modalName.textContent = name || staffNumber || '-';
    }
    if (modalPayPeriod) modalPayPeriod.textContent = period || '-';

    // Attempt to fetch payroll record for staff+period
    let payrollRecord = null;
    if (typeof API !== 'undefined' && API && typeof API.getPayrollRunsByPeriod === 'function') {
      try {
        const runs = await API.getPayrollRunsByPeriod(period).catch(() => []);
        const records = Array.isArray(runs) ? runs : (runs && runs.records) ? runs.records : [];
        payrollRecord = records.find(r => {
          const staff = r['Staff Number'] || r.staff || r.staffNumber || r['staffNumber'];
          return staff === staffNumber;
        });
      } catch (e) {
        payrollRecord = null;
      }
    }

    // if we have a payroll record, render values; otherwise show placeholder content
    if (payrollRecord) {
      // build a simple table with key items (basic, allowances, paye, pension, net pay)
      const basic = formatCurrency(getFirstNumber(payrollRecord, ['Basic Salary','basicSalary']) || 0);
      const allowances = formatCurrency(getFirstNumber(payrollRecord, ['Total Allowances','Total Allowance','allowances']) || 0);
      const paye = formatCurrency(getFirstNumber(payrollRecord, ['PAYE','paye']) || 0);
      const empPension = formatCurrency(getFirstNumber(payrollRecord, ['Employee Pension (5.5%)','employeePension']) || 0);
      const empPf = formatCurrency(getFirstNumber(payrollRecord, ['Employee PF','employeePf']) || 0);
      const monthlyLoan = formatCurrency(getFirstNumber(payrollRecord, ['Monthly Loan','loanMonthly']) || 0);
      const netPay = formatCurrency(getFirstNumber(payrollRecord, ['Net Pay','netPay']) || 0);
      modalArea.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead><tr><th style="text-align:left; padding:8px 6px;">Description</th><th style="text-align:right; padding:8px 6px;">This Period (GHS)</th></tr></thead>
          <tbody>
            <tr><td style="padding:6px;">Basic Salary</td><td style="padding:6px; text-align:right;">${basic}</td></tr>
            <tr><td style="padding:6px;">Total Allowances</td><td style="padding:6px; text-align:right;">${allowances}</td></tr>
            <tr><td style="padding:6px;">PAYE</td><td style="padding:6px; text-align:right;">${paye}</td></tr>
            <tr><td style="padding:6px;">Employee Pension (5.5%)</td><td style="padding:6px; text-align:right;">${empPension}</td></tr>
            <tr><td style="padding:6px;">Employee PF</td><td style="padding:6px; text-align:right;">${empPf}</td></tr>
            <tr><td style="padding:6px;">Monthly Loan</td><td style="padding:6px; text-align:right;">${monthlyLoan}</td></tr>
            <tr style="font-weight:800; border-top:1px solid #ddd;"><td style="padding:6px;">Net Pay</td><td style="padding:6px; text-align:right;">${netPay}</td></tr>
          </tbody>
        </table>
      `;
    } else {
      modalArea.innerHTML = `<div style="padding:18px; color:#666;">Payslip data for ${escapeHtml(staffNumber)} in ${escapeHtml(period || '')} not found.</div>`;
    }

    // show modal
    modal.style.display = 'flex';

    // attach close/send handlers
    document.getElementById('modalCloseBtn').onclick = function() { modal.style.display = 'none'; };
    document.getElementById('modalSendBtn').onclick = function() { sendPayslip(staffNumber); };
  };

  // send single payslip
  window.sendPayslip = async function(staffNumber) {
    closeActionDropdown();
    const period = _currentPeriod;
    if (!period) {
      showToast('Please select a period first', 'warning');
      return;
    }
    try {
      if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
        showToast('Sending payslip to ' + staffNumber + '...', 'info');
        const res = await API.sendPayslip(staffNumber, period);
        if (res && res.success !== false) {
          showToast('Payslip sent to ' + staffNumber, 'success');
        } else {
          showToast('Failed to send payslip: ' + (res && res.error ? res.error : 'Unknown error'), 'error');
        }
      } else {
        // fallback: pretend sent
        showToast('Send feature not configured on server. (Simulated send)', 'info');
      }
    } catch (err) {
      console.error('sendPayslip error', err);
      showToast('Failed to send payslip', 'error');
    }
  };

  // send all
  async function sendAllPayslips(period) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr[data-staff]'));
    if (rows.length === 0) {
      showToast('No employees to send', 'warning');
      return;
    }
    for (const r of rows) {
      const staff = r.getAttribute('data-staff');
      // small delay to avoid flooding (optional)
      await new Promise(res => setTimeout(res, 150));
      await window.sendPayslip(staff);
    }
    showToast('Send process completed', 'success');
  }

  // helpers
  function showToast(msg, type) {
    type = type || 'info';
    // reuse global toast if present
    const g = document.getElementById('global-toast');
    if (g) {
      g.textContent = msg;
      g.className = type;
      g.style.display = 'block';
      clearTimeout(g._t);
      g._t = setTimeout(() => { g.style.display = 'none'; }, 3000);
    } else {
      alert(msg);
    }
  }

  function formatCurrency(n) {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  }

  function getFirstNumber(obj, keys) {
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && v !== '') {
        const n = parseFloat(String(v).replace(/,/g,''));
        if (!isNaN(n)) return n;
      }
      // try lower variants
      const lower = k.replace(/\s+/g,'').toLowerCase();
      if (obj[lower] !== undefined) {
        const n = parseFloat(String(obj[lower]).replace(/,/g,''));
        if (!isNaN(n)) return n;
      }
    }
    return null;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function(m) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
    });
  }

  function escapeJs(s) {
    return String(s || '').replace(/'/g, "\\'");
  }

  // expose init
  window.initPayslipModule = initPayslipModule;
})();
