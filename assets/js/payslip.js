// assets/js/payslip.js
(function() {
  // state
  let _actionPortalOpen = false;
  let _currentPeriod = null;
  let _currentStaffNumber = null;

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

    // Modal close handlers
    const modal = document.getElementById('payslipModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
      });
    }

    // Print button
    const printBtn = document.getElementById('modalPrintBtn');
    if (printBtn) {
      printBtn.addEventListener('click', function() {
        printPayslip();
      });
    }

    // Send button in modal
    const sendBtn = document.getElementById('modalSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        if (_currentStaffNumber) {
          sendPayslip(_currentStaffNumber);
        }
      });
    }

    // Close modal on overlay click
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (modal) modal.style.display = 'none';
        closeActionDropdown();
      }
    });

    // global click to close portal
    document.addEventListener('click', function(e) {
      if (_actionPortalOpen) closeActionDropdown();
    });

    loadPayslipList(_currentPeriod);
  }

  // =============================================================
  // LOAD PAYSLIP LIST
  // =============================================================
  async function loadPayslipList(period) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;

    try {
      let employees = [];
      if (typeof API !== 'undefined' && API && typeof API.getEmployees === 'function') {
        const resp = await API.getEmployees({ useCache: false }).catch(() => []);
        employees = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp.data ? resp.data : []);
      } else {
        // fallback demo
        employees = [
          { 'Staff Number': 'EMP001', 'Full Name': 'Alice Doe' },
          { 'Staff Number': 'EMP002', 'Full Name': 'Bob Smith' },
          { 'Staff Number': 'EMP003', 'Full Name': 'Carol Jones' }
        ];
      }

      if (!employees || employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#999;">No employees found</td></tr>`;
        return;
      }

      const rows = employees.map(emp => {
        const staffNumber = emp['Staff Number'] || emp.staff || emp.staffNumber || '';
        const fullName = emp['Full Name'] || emp.name || emp.fullName || '';
        return `<tr data-staff="${escapeHtml(staffNumber)}">
          <td style="padding:10px 16px;">${escapeHtml(staffNumber)}</td>
          <td style="padding:10px 16px;">${escapeHtml(fullName)}</td>
          <td style="padding:10px 16px; text-align:right;">
            <button class="action-btn" onclick="openPayslipActionDropdown(event, '${escapeJs(staffNumber)}')" style="background:none; border:none; cursor:pointer; font-size:16px; color:#666; padding:4px 8px;">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </td>
        </tr>`;
      }).join('');

      tbody.innerHTML = rows;
    } catch (err) {
      console.error('Error loading payslip list', err);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#c00;">Failed to load employees</td></tr>`;
    }
  }

  // =============================================================
  // ACTION DROPDOWN
  // =============================================================
  window.openPayslipActionDropdown = function(event, staffNumber) {
    event.stopPropagation();
    closeActionDropdown();

    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const portal = document.getElementById('payslipActionPortal');
    if (!portal) return;

    portal.innerHTML = `
      <div style="background:white; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.15); overflow:hidden; min-width:140px; border:1px solid #e0e0e0;">
        <button class="dropdown-item" onclick="viewPayslip('${escapeJs(staffNumber)}')" style="display:block;width:100%;padding:10px 16px;border:none;background:none;text-align:left;cursor:pointer;font-size:13px;font-weight:500;color:#333;border-bottom:1px solid #f0f0f0;">
          <i class="fas fa-eye" style="margin-right:8px;color:#555;"></i> View
        </button>
        <button class="dropdown-item" onclick="sendPayslip('${escapeJs(staffNumber)}')" style="display:block;width:100%;padding:10px 16px;border:none;background:none;text-align:left;cursor:pointer;font-size:13px;font-weight:500;color:#333;">
          <i class="fas fa-envelope" style="margin-right:8px;color:#1a5c2a;"></i> Send
        </button>
      </div>
    `;

    portal.style.display = 'block';
    portal.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    portal.style.left = (rect.left + window.scrollX - 20) + 'px';
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

  // =============================================================
  // VIEW PAYSLIP
  // =============================================================
  window.viewPayslip = async function(staffNumber) {
    closeActionDropdown();
    _currentStaffNumber = staffNumber;

    const period = _currentPeriod;
    if (!period) {
      showToast('Please select a period first', 'warning');
      return;
    }

    const modal = document.getElementById('payslipModal');
    const modalArea = document.getElementById('modalPayrollTableArea');
    const modalPayPeriod = document.getElementById('modalPayPeriod');
    const modalGenerated = document.getElementById('modalGenerated');

    // Show loading
    if (modalArea) {
      modalArea.innerHTML = '<div style="padding:30px; text-align:center; color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading payslip...</div>';
    }
    if (modalPayPeriod) modalPayPeriod.textContent = period || '--';

    // Set generated timestamp
    const now = new Date();
    const genStr = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (modalGenerated) modalGenerated.textContent = 'Generated: ' + genStr;

    try {
      // Fetch payslip data from backend
      let payslipData = null;
      if (typeof API !== 'undefined' && API && typeof API.getPayslipData === 'function') {
        const resp = await API.getPayslipData(staffNumber, period);
        if (resp && resp.success) {
          payslipData = resp;
        } else {
          throw new Error(resp && resp.error ? resp.error : 'Failed to fetch payslip data');
        }
      } else {
        // Fallback: use local data
        payslipData = await getLocalPayslipData(staffNumber, period);
      }

      if (payslipData && payslipData.html) {
        // Render the full payslip HTML
        if (modalArea) {
          modalArea.innerHTML = payslipData.html;
        }

        // Update employee details in the modal header
        const emp = payslipData.employee || {};
        document.getElementById('modalEmpId').textContent = staffNumber || '--';
        document.getElementById('modalName').textContent = emp['Full Name'] || emp.name || staffNumber || '--';
        document.getElementById('modalSSNIT').textContent = emp['SSNIT'] || emp.ssnit || '--';
        document.getElementById('modalGhanaCard').textContent = emp['Ghana Card'] || emp.ghanaCard || '--';
        document.getElementById('modalDept').textContent = emp['Department'] || emp.department || '--';
        document.getElementById('modalEmail').textContent = emp['Email'] || emp.email || '--';
        document.getElementById('modalDesignation').textContent = emp['Designation'] || emp.designation || '--';
        document.getElementById('modalBank').textContent = emp['Bank'] || emp.bank || '--';

      } else {
        if (modalArea) {
          modalArea.innerHTML = `
            <div style="padding:30px; text-align:center; color:#c00;">
              <i class="fas fa-exclamation-circle" style="font-size:24px; display:block; margin-bottom:10px;"></i>
              Payslip data not found for ${escapeHtml(staffNumber)} in ${escapeHtml(period)}
            </div>
          `;
        }
      }

    } catch (err) {
      console.error('Error viewing payslip:', err);
      if (modalArea) {
        modalArea.innerHTML = `
          <div style="padding:30px; text-align:center; color:#c00;">
            <i class="fas fa-exclamation-circle" style="font-size:24px; display:block; margin-bottom:10px;"></i>
            Error loading payslip: ${escapeHtml(err.message || 'Unknown error')}
          </div>
        `;
      }
    }

    // Show modal
    if (modal) modal.style.display = 'flex';
  };

  // =============================================================
  // SEND PAYSLIP
  // =============================================================
  window.sendPayslip = async function(staffNumber) {
    closeActionDropdown();
    const period = _currentPeriod;

    if (!period) {
      showToast('Please select a period first', 'warning');
      return;
    }

    if (!staffNumber) {
      showToast('No employee selected', 'warning');
      return;
    }

    try {
      if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
        showToast('Sending payslip to ' + staffNumber + '...', 'info');
        const res = await API.sendPayslip(staffNumber, period);
        if (res && res.success !== false) {
          showToast('Payslip sent to ' + staffNumber, 'success');
          // Close modal if open
          const modal = document.getElementById('payslipModal');
          if (modal) modal.style.display = 'none';
        } else {
          showToast('Failed to send payslip: ' + (res && res.error ? res.error : 'Unknown error'), 'error');
        }
      } else {
        showToast('Send feature not configured on server. (Simulated send)', 'info');
      }
    } catch (err) {
      console.error('sendPayslip error', err);
      showToast('Failed to send payslip', 'error');
    }
  };

  // =============================================================
  // SEND ALL PAYSLIPS
  // =============================================================
  async function sendAllPayslips(period) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr[data-staff]'));
    if (rows.length === 0) {
      showToast('No employees to send', 'warning');
      return;
    }

    showToast('Sending payslips... This may take a moment.', 'info');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const staff = rows[i].getAttribute('data-staff');
      try {
        if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
          const res = await API.sendPayslip(staff, period);
          if (res && res.success !== false) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          // Simulate
          successCount++;
        }
        // Update progress every 5
        if (i % 5 === 0 || i === rows.length - 1) {
          showToast(`Sending payslips... ${i + 1}/${rows.length}`, 'info');
        }
      } catch (e) {
        failCount++;
      }
    }

    showToast(`Payslips sent: ${successCount} successful, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
  }

  // =============================================================
  // PRINT PAYSLIP
  // =============================================================
  function printPayslip() {
    const modalContent = document.getElementById('payslipModalContent');
    if (!modalContent) return;

    // Get the payslip content (the inner part without the modal actions)
    const payslipInner = modalContent.querySelector('div[style*="padding:30px 35px"]');
    if (!payslipInner) return;

    // Create print window
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('Please allow popups for printing', 'warning');
      return;
    }

    const styles = document.querySelector('style') ? document.querySelector('style').innerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip</title>
        <style>
          ${styles}
          body { background: white; padding: 0; margin: 0; }
          .payslip-print { max-width: 900px; margin: 0 auto; padding: 20px; }
          .modal-actions { display: none !important; }
        </style>
      </head>
      <body>
        <div class="payslip-print">
          ${payslipInner.innerHTML}
        </div>
        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  // =============================================================
  // LOCAL FALLBACK DATA
  // =============================================================
  async function getLocalPayslipData(staffNumber, period) {
    // Try to get from payroll runs
    let payrollData = null;
    if (typeof API !== 'undefined' && API && typeof API.getPayrollRunsByPeriod === 'function') {
      try {
        const runs = await API.getPayrollRunsByPeriod(period);
        const records = Array.isArray(runs) ? runs : (runs && runs.records) ? runs.records : [];
        payrollData = records.find(r => {
          const staff = r['Staff Number'] || r.staff || r.staffNumber || r['staffNumber'];
          return String(staff) === String(staffNumber);
        });
      } catch (e) {
        payrollData = null;
      }
    }

    // Build employee object
    let employee = { 'Staff Number': staffNumber, 'Full Name': staffNumber };
    if (typeof API !== 'undefined' && API && typeof API.getEmployeeByStaffNumber === 'function') {
      try {
        const emp = await API.getEmployeeByStaffNumber(staffNumber);
        if (emp) employee = emp;
      } catch (e) {}
    }

    // Build HTML from data
    const html = buildPayslipHTML(employee, payrollData, period);
    return { success: true, html: html, employee: employee, payroll: payrollData };
  }

  function buildPayslipHTML(employee, payroll, period) {
    const format = (n) => (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const basic = format(payroll?.['Basic Salary'] || 0);
    const allowances = format(payroll?.['Total Allowances'] || 0);
    const gross = format(payroll?.['Gross Salary'] || 0);
    const paye = format(payroll?.['PAYE'] || 0);
    const empPension = format(payroll?.['Employee Pension'] || 0);
    const empPF = format(payroll?.['Employee PF'] || 0);
    const taxRelief = format(payroll?.['Tax Relief'] || 0);
    const totalDed = format(payroll?.['Total Deduction'] || 0);
    const netPay = format(payroll?.['Net Pay'] || 0);
    const empPension13 = format(payroll?.['Employer Pension'] || 0);
    const empPF5 = format(payroll?.['Employer PF'] || 0);
    const loan = format(payroll?.['Monthly Loan'] || 0);

    return `
      <div style="padding:10px 0;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; font-family:'Arial',sans-serif;">
          <thead>
            <tr><th style="text-align:left; padding:8px 12px; background:#000; color:white;">Description</th>
                <th style="text-align:right; padding:8px 12px; background:#000; color:white;">This Period (GHS)</th>
                <th style="text-align:right; padding:8px 12px; background:#000; color:white;">YTD (GHS)</th></tr>
          </thead>
          <tbody>
            <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:center; font-weight:700; padding:8px; text-transform:uppercase; color:#333;">EARNINGS</td></tr>
            <tr><td style="padding:6px 12px;">Basic Salary</td><td style="padding:6px 12px; text-align:right;">${basic}</td><td style="padding:6px 12px; text-align:right;">--</td></tr>
            <tr><td style="padding:6px 12px;">Allowances</td><td style="padding:6px 12px; text-align:right;">${allowances}</td><td style="padding:6px 12px; text-align:right;">--</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:8px 12px;">Gross Pay</td><td style="padding:8px 12px; text-align:right;">${gross}</td><td style="padding:8px 12px; text-align:right;">--</td></tr>

            <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:center; font-weight:700; padding:8px; text-transform:uppercase; color:#333;">DEDUCTIONS</td></tr>
            <tr><td style="padding:6px 12px; font-weight:600; color:#444;">Statutory</td><td></td><td></td></tr>
            <tr style="padding-left:20px;"><td style="padding:4px 12px 4px 30px;">PAYE</td><td style="padding:4px 12px; text-align:right;">${paye}</td><td style="padding:4px 12px; text-align:right;">--</td></tr>
            <tr style="padding-left:20px;"><td style="padding:4px 12px 4px 30px;">Employee Pension (5.5%)</td><td style="padding:4px 12px; text-align:right;">${empPension}</td><td style="padding:4px 12px; text-align:right;">--</td></tr>
            <tr><td style="padding:6px 12px; font-weight:600; color:#444;">Other Deductions</td><td></td><td></td></tr>
            <tr style="padding-left:20px;"><td style="padding:4px 12px 4px 30px;">Employee PF (10%)</td><td style="padding:4px 12px; text-align:right;">${empPF}</td><td style="padding:4px 12px; text-align:right;">--</td></tr>
            <tr style="padding-left:20px;"><td style="padding:4px 12px 4px 30px;">Monthly Loan Deduction</td><td style="padding:4px 12px; text-align:right;">${loan}</td><td style="padding:4px 12px; text-align:right;">--</td></tr>
            <tr><td style="padding:6px 12px; font-weight:600; color:#444;">Tax Reliefs</td><td style="padding:6px 12px; text-align:right;">${taxRelief}</td><td style="padding:6px 12px; text-align:right;">--</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:8px 12px;">Total Deductions</td><td style="padding:8px 12px; text-align:right;">${totalDed}</td><td style="padding:8px 12px; text-align:right;">--</td></tr>

            <tr style="background:#333; color:white;"><td style="padding:10px 12px; font-weight:700;">Net Pay (Take Home)</td><td style="padding:10px 12px; text-align:right;"></td><td style="padding:10px 12px; text-align:right; font-size:18px; font-weight:900;">${netPay}</td></tr>

            <tr style="background:#e8e8e8;"><td colspan="3" style="text-align:center; font-weight:700; padding:8px; text-transform:uppercase; color:#333;">EMPLOYER CONTRIBUTIONS</td></tr>
            <tr><td style="padding:6px 12px;">Employer Pension (13%)</td><td style="padding:6px 12px; text-align:right;">${empPension13}</td><td style="padding:6px 12px; text-align:right;">--</td></tr>
            <tr><td style="padding:6px 12px;">Employer PF (5%)</td><td style="padding:6px 12px; text-align:right;">${empPF5}</td><td style="padding:6px 12px; text-align:right;">--</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:8px 12px;">Total Employer Contribution</td><td style="padding:8px 12px; text-align:right;">${format((parseFloat(empPension13) || 0) + (parseFloat(empPF5) || 0))}</td><td style="padding:8px 12px; text-align:right;">--</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // =============================================================
  // HELPERS
  // =============================================================
  function showToast(msg, type) {
    type = type || 'info';
    const g = document.getElementById('global-toast');
    if (g) {
      g.textContent = msg;
      g.className = type;
      g.style.display = 'block';
      clearTimeout(g._t);
      g._t = setTimeout(() => { g.style.display = 'none'; }, 4000);
    } else {
      alert(msg);
    }
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function(m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function escapeJs(s) {
    return String(s || '').replace(/'/g, "\\'");
  }

  // Expose init
  window.initPayslipModule = initPayslipModule;
})();
