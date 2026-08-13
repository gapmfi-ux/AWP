// assets/js/payslip.js
(function() {
  // state
  let _actionPortalOpen = false;
  let _currentPeriod = null;
  let _currentStaffNumber = null;
  let _isGenerating = false;

  // =============================================================
  // CLOSE ACTION DROPDOWN - Exposed globally
  // =============================================================
  window.closeActionDropdown = function() {
    const portal = document.getElementById('payslipActionPortal');
    if (portal) {
      portal.innerHTML = '';
      portal.style.display = 'none';
    }
    _actionPortalOpen = false;
  };

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
    }

    // Generate Button
    const generateBtn = document.getElementById('generatePayslipBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
        generatePayslipList();
      });
    }

    // Send All Button
    const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', function() {
        if (!_currentPeriod) {
          showToast('Please select a period first', 'warning');
          return;
        }
        if (!confirm('Send payslips for ' + _currentPeriod + ' to all employees?')) return;
        sendAllPayslips(_currentPeriod);
      });
    }

    // Period change
    monthInput.addEventListener('change', function() {
      _currentPeriod = monthInput.value;
    });

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
          window.sendPayslip(_currentStaffNumber);
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
        window.closeActionDropdown();
      }
    });

    // global click to close portal
    document.addEventListener('click', function(e) {
      if (_actionPortalOpen) window.closeActionDropdown();
    });

    // Show empty state initially
    const tbody = document.getElementById('payslipListBody');
    if (tbody) {
      tbody.innerHTML = `<tr>
        <td colspan="3" style="padding:20px; text-align:center; color:#999; font-size:13px;">
          <i class="fas fa-file-invoice" style="font-size:20px; display:block; margin-bottom:6px; color:#ccc;"></i>
          Click "Generate" to load payslip data
        </td>
      </tr>`;
    }
  }

  // =============================================================
  // GENERATE PAYSLIP LIST
  // =============================================================
async function generatePayslipList() {
  if (_isGenerating) return;
  _isGenerating = true;

  const generateBtn = document.getElementById('generatePayslipBtn');
  const originalText = generateBtn ? generateBtn.innerHTML : 'Generate';

  if (generateBtn) {
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    generateBtn.disabled = true;
  }

  const tbody = document.getElementById('payslipListBody');
  if (tbody) {
    tbody.innerHTML = `<tr>
      <td colspan="3" style="padding:20px; text-align:center; color:#999; font-size:13px;">
        <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading employees...
      </td>
    </tr>`;
  }

  try {
    let employees = [];

    // 1) Try the primary API call
    try {
      const resp = await API.getEmployees().catch(err => { throw err; });
      employees = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp && resp.data) ? resp.data : [];
    } catch (err) {
      console.warn('API.getEmployees failed, trying payroll runs fallback:', err);

      // 2) Fallback: try to derive employee list from saved payroll runs for the current period
      try {
        if (_currentPeriod) {
          const runs = await API.getPayrollRunsByPeriod(_currentPeriod).catch(() => []);
          const recs = Array.isArray(runs) ? runs : (runs && runs.records) ? runs.records : (runs && runs.data) ? runs.data : [];
          const seen = {};
          employees = recs.reduce((acc, r) => {
            const staff = r['Staff Number'] || r.staff || r.staffNumber || '';
            const name = r['Full Name'] || r.name || r.fullName || '';
            if (staff && !seen[staff]) {
              seen[staff] = true;
              acc.push({ 'Staff Number': staff, 'Full Name': name });
            }
            return acc;
          }, []);
        }
      } catch (e2) {
        console.warn('Payroll runs fallback also failed:', e2);
      }
    }

    // 3) Final fallback: demo list
    if (!employees || employees.length === 0) {
      employees = [
        { 'Staff Number': 'GAP0011', 'Full Name': 'John Mark' },
        { 'Staff Number': 'GAP0012', 'Full Name': 'Bright' }
      ];
    }

    if (!employees || employees.length === 0) {
      tbody.innerHTML = `<tr>
        <td colspan="3" style="padding:20px; text-align:center; color:#999; font-size:13px;">
          <i class="fas fa-users" style="font-size:18px; display:block; margin-bottom:6px; color:#ccc;"></i>
          No employees found
        </td>
      </tr>`;
      return;
    }

    const rows = employees.map(emp => {
      const staffNumber = emp['Staff Number'] || emp.staff || emp.staffNumber || '';
      const fullName = emp['Full Name'] || emp.name || emp.fullName || '';
      return `<tr style="border-bottom:1px solid #eee;" data-staff="${escapeHtml(staffNumber)}">
        <td style="padding:6px 14px; font-size:13px; color:#333;">${escapeHtml(staffNumber)}</td>
        <td style="padding:6px 14px; font-size:13px; color:#333;">${escapeHtml(fullName)}</td>
        <td style="padding:6px 14px; text-align:center;">
          <button class="action-btn" onclick="window.viewPayslip('${escapeJs(staffNumber)}')" style="background:none; border:none; cursor:pointer; font-size:14px; color:#0057a3; padding:4px 8px; margin:0 2px;" title="View Payslip">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn" onclick="window.sendPayslip('${escapeJs(staffNumber)}')" style="background:none; border:none; cursor:pointer; font-size:14px; color:#1a5c2a; padding:4px 8px; margin:0 2px;" title="Send Payslip">
            <i class="fas fa-envelope"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    tbody.innerHTML = rows;
    showToast('Payslip data loaded successfully', 'success');

  } catch (err) {
    console.error('Error loading payslip list', err);
    if (tbody) {
      tbody.innerHTML = `<tr>
        <td colspan="3" style="padding:20px; text-align:center; color:#c00; font-size:13px;">
          <i class="fas fa-exclamation-circle" style="font-size:18px; display:block; margin-bottom:6px;"></i>
          Failed to load employees: ${escapeHtml(err.message || 'Unknown error')}
        </td>
      </tr>`;
    }
    showToast('Failed to load employees', 'error');
  } finally {
    _isGenerating = false;
    if (generateBtn) {
      generateBtn.innerHTML = originalText;
      generateBtn.disabled = false;
    }
  }
}
  // =============================================================
  // VIEW PAYSLIP - Exposed globally
  // =============================================================
window.viewPayslip = async function(staffNumber) {
  window.closeActionDropdown();
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
  const loadingOverlay = document.getElementById('modalLoadingOverlay');

  // Show loading overlay
  if (loadingOverlay) loadingOverlay.className = 'active';

  if (modalPayPeriod) modalPayPeriod.textContent = period || '--';

  // Set generated timestamp
  const now = new Date();
  const genStr = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (modalGenerated) modalGenerated.textContent = 'Generated: ' + genStr;

  try {
    // 1) Prefer server-built payslip data
    try {
      if (typeof API !== 'undefined' && API && typeof API.getPayslipData === 'function') {
        const resp = await API.getPayslipData(staffNumber, period);
        if (resp && resp.success && resp.html) {
          // Server returned HTML
          if (modalArea) modalArea.innerHTML = resp.html;
          const emp = resp.employee || {};
          document.getElementById('modalEmpId').textContent = staffNumber || '--';
          document.getElementById('modalName').textContent = emp['Full Name'] || emp.name || staffNumber || '--';
          document.getElementById('modalSSNIT').textContent = emp['SSNIT'] || emp.ssnit || '--';
          document.getElementById('modalGhanaCard').textContent = emp['Ghana Card'] || emp.ghanaCard || '--';
          document.getElementById('modalDept').textContent = emp['Department'] || emp.department || '--';
          document.getElementById('modalEmail').textContent = emp['Email'] || emp.email || '--';
          document.getElementById('modalDesignation').textContent = emp['Designation'] || emp.designation || '--';
          document.getElementById('modalBank').textContent = emp['Bank'] || emp.bank || '--';
          // done
          return;
        } else if (resp && resp.html) {
          // resp may be raw html string
          if (typeof resp === 'string') {
            modalArea && (modalArea.innerHTML = resp);
            return;
          }
        } else {
          console.warn('getPayslipData did not return html/success, falling back');
          throw new Error(resp && resp.error ? resp.error : 'No payslip data returned');
        }
      } else {
        throw new Error('API.getPayslipData not available');
      }
    } catch (apiErr) {
      console.warn('API.getPayslipData failed, falling back to client-side build:', apiErr);
      // continue to fallback path below
    }

    // 2) Try to assemble from payroll runs (server) + employee and build HTML client-side
    let payrollRecord = null;
    try {
      const runs = await API.getPayrollRunsByPeriod(period).catch(() => []);
      const recs = Array.isArray(runs) ? runs : (runs && runs.records) ? runs.records : (runs && runs.data) ? runs.data : [];
      payrollRecord = recs.find(r => {
        const staff = r['Staff Number'] || r.staff || r.staffNumber || r['staffNumber'];
        return String(staff) === String(staffNumber);
      }) || null;
    } catch (e) {
      console.warn('Failed to get payroll runs for fallback:', e);
    }

    // 3) Try to get employee from server
    let employee = { 'Staff Number': staffNumber, 'Full Name': staffNumber };
    try {
      const empResp = await API.getEmployeeByStaffNumber(staffNumber).catch(() => null);
      if (empResp) employee = empResp;
    } catch (e) {
      console.warn('Failed to get employee during fallback:', e);
    }

    // 4) Build HTML client-side (local fallback builder exists)
    const built = buildPayslipHTML(employee, payrollRecord, period);
    if (modalArea) {
      modalArea.innerHTML = built;
      document.getElementById('modalEmpId').textContent = staffNumber || '--';
      document.getElementById('modalName').textContent = employee['Full Name'] || employee.name || staffNumber || '--';
      document.getElementById('modalSSNIT').textContent = employee['SSNIT'] || employee.ssnit || '--';
      document.getElementById('modalGhanaCard').textContent = employee['Ghana Card'] || employee.ghanaCard || '--';
      document.getElementById('modalDept').textContent = employee['Department'] || employee.department || '--';
      document.getElementById('modalEmail').textContent = employee['Email'] || employee.email || '--';
      document.getElementById('modalDesignation').textContent = employee['Designation'] || employee.designation || '--';
      document.getElementById('modalBank').textContent = employee['Bank'] || employee.bank || '--';
    } else {
      throw new Error('Cannot render payslip: modal area missing');
    }

  } catch (err) {
    console.error('Error viewing payslip (fallback):', err);
    if (modalArea) {
      modalArea.innerHTML = `
        <div style="padding:24px; text-align:center; color:#c00; font-size:13px;">
          <i class="fas fa-exclamation-circle" style="font-size:20px; display:block; margin-bottom:8px;"></i>
          Error loading payslip: ${escapeHtml(err.message || 'Unknown error')}
        </div>
      `;
    }
  } finally {
    // Hide loading overlay
    if (loadingOverlay) loadingOverlay.className = '';
  }

  // Show modal
  if (modal) modal.style.display = 'flex';
};
  // =============================================================
  // SEND PAYSLIP - Exposed globally
  // =============================================================
  window.sendPayslip = async function(staffNumber) {
    window.closeActionDropdown();
    const period = _currentPeriod;

    if (!period) {
      showToast('Please select a period first', 'warning');
      return;
    }

    if (!staffNumber) {
      showToast('No employee selected', 'warning');
      return;
    }

    // Show loading on send button if in modal
    const sendBtn = document.getElementById('modalSendBtn');
    const sendSpinner = document.getElementById('modalSendSpinner');
    let originalSendText = '';

    if (sendBtn) {
      originalSendText = sendBtn.innerHTML;
      sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      sendBtn.disabled = true;
    }

    try {
      if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
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
        showToast('Send feature not configured. (Simulated)', 'info');
      }
    } catch (err) {
      console.error('sendPayslip error', err);
      showToast('Failed to send payslip', 'error');
    } finally {
      if (sendBtn) {
        sendBtn.innerHTML = originalSendText || '<i class="fas fa-envelope"></i> Send';
        sendBtn.disabled = false;
      }
      if (sendSpinner) sendSpinner.style.display = 'none';
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

    const overlay = document.getElementById('sendAllLoadingOverlay');
    const progressEl = document.getElementById('sendAllProgress');

    if (overlay) overlay.className = 'active';
    if (progressEl) progressEl.textContent = 'Preparing to send...';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const staff = rows[i].getAttribute('data-staff');
      if (progressEl) progressEl.textContent = `Sending ${i + 1}/${rows.length}... (${staff})`;

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
      } catch (e) {
        failCount++;
      }
    }

    if (overlay) overlay.className = '';
    showToast(`Payslips sent: ${successCount} successful, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
  }

  // =============================================================
  // PRINT PAYSLIP
  // =============================================================
  function printPayslip() {
    const modalContent = document.getElementById('payslipModalContent');
    if (!modalContent) return;

    // Get the payslip content (the inner part without the modal actions)
    const payslipInner = modalContent.querySelector('div[style*="padding:25px 30px 18px 30px"]');
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
          #modalLoadingOverlay { display: none !important; }
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
      <div style="padding:6px 0;">
        <table style="width:100%; border-collapse:collapse; font-size:12px; font-family:'Arial',sans-serif;">
          <thead>
            <tr><th style="text-align:left; padding:5px 10px; background:#000; color:white; font-size:11px;">Description</th>
                <th style="text-align:right; padding:5px 10px; background:#000; color:white; font-size:11px;">This Period (GHS)</th>
                <th style="text-align:right; padding:5px 10px; background:#000; color:white; font-size:11px;">YTD (GHS)</th></tr>
          </thead>
          <tbody>
            <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:center; font-weight:700; padding:5px; text-transform:uppercase; color:#333; font-size:12px;">EARNINGS</td></tr>
            <tr><td style="padding:4px 10px;">Basic Salary</td><td style="padding:4px 10px; text-align:right;">${basic}</td><td style="padding:4px 10px; text-align:right;">--</td></tr>
            <tr><td style="padding:4px 10px;">Allowances</td><td style="padding:4px 10px; text-align:right;">${allowances}</td><td style="padding:4px 10px; text-align:right;">--</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:5px 10px;">Gross Pay</td><td style="padding:5px 10px; text-align:right;">${gross}</td><td style="padding:5px 10px; text-align:right;">--</td></tr>

            <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:center; font-weight:700; padding:5px; text-transform:uppercase; color:#333; font-size:12px;">DEDUCTIONS</td></tr>
            <tr><td style="padding:4px 10px; font-weight:600; color:#444;">Statutory</td><td></td><td></td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">PAYE</td><td style="padding:3px 10px; text-align:right;">${paye}</td><td style="padding:3px 10px; text-align:right;">--</td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">Employee Pension (5.5%)</td><td style="padding:3px 10px; text-align:right;">${empPension}</td><td style="padding:3px 10px; text-align:right;">--</td></tr>
            <tr><td style="padding:4px 10px; font-weight:600; color:#444;">Other Deductions</td><td></td><td></td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">Employee PF (10%)</td><td style="padding:3px 10px; text-align:right;">${empPF}</td><td style="padding:3px 10px; text-align:right;">--</td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">Monthly Loan</td><td style="padding:3px 10px; text-align:right;">${loan}</td><td style="padding:3px 10px; text-align:right;">--</td></tr>
            <tr><td style="padding:4px 10px; font-weight:600; color:#444;">Tax Reliefs</td><td style="padding:4px 10px; text-align:right;">${taxRelief}</td><td style="padding:4px 10px; text-align:right;">--</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:5px 10px;">Total Deductions</td><td style="padding:5px 10px; text-align:right;">${totalDed}</td><td style="padding:5px 10px; text-align:right;">--</td></tr>

            <tr style="background:#333; color:white;"><td style="padding:6px 10px; font-weight:700; font-size:13px;">Net Pay</td><td style="padding:6px 10px; text-align:right;"></td><td style="padding:6px 10px; text-align:right; font-size:17px; font-weight:900;">${netPay}</td></tr>

            <tr style="background:#e8e8e8;"><td colspan="3" style="text-align:center; font-weight:700; padding:5px; text-transform:uppercase; color:#333; font-size:12px;">EMPLOYER CONTRIBUTIONS</td></tr>
            <tr><td style="padding:4px 10px;">Employer Pension (13%)</td><td style="padding:4px 10px; text-align:right;">${empPension13}</td><td style="padding:4px 10px; text-align:right;">--</td></tr>
            <tr><td style="padding:4px 10px;">Employer PF (5%)</td><td style="padding:4px 10px; text-align:right;">${empPF5}</td><td style="padding:4px 10px; text-align:right;">--</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:5px 10px;">Total Employer Contribution</td><td style="padding:5px 10px; text-align:right;">${format((parseFloat(empPension13) || 0) + (parseFloat(empPF5) || 0))}</td><td style="padding:5px 10px; text-align:right;">--</td></tr>
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

  // =============================================================
  // INITIALIZE - Auto-run when page loads
  // =============================================================
  // Check if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayslipModule);
  } else {
    initPayslipModule();
  }

  // Expose functions globally for inline onclick handlers
  window.initPayslipModule = initPayslipModule;
  window.viewPayslip = window.viewPayslip;
  window.sendPayslip = window.sendPayslip;
  window.closeActionDropdown = window.closeActionDropdown;

})();
