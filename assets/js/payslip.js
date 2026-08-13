// assets/js/payslip.js - Updated full file
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

  // =============================================================
  // INIT
  // =============================================================
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
      });
    }

    // Generate Button
    const generateBtn = document.getElementById('generatePayslipBtn');
    if (generateBtn) generateBtn.addEventListener('click', generatePayslipList);

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

    // Modal close handlers
    const modal = document.getElementById('payslipModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', function() { if (modal) modal.style.display = 'none'; });

    // Print button
    const printBtn = document.getElementById('modalPrintBtn');
    if (printBtn) printBtn.addEventListener('click', function() { printPayslip(); });

    // Send button in modal
    const sendBtn = document.getElementById('modalSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', function() {
      if (_currentStaffNumber) {
        window.sendPayslip(_currentStaffNumber);
      }
    });

    // Close modal on overlay click
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
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

    // Show initial empty state
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
  // GENERATE PAYSLIP LIST (no sample fallback)
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

      // Primary: load all employees from Employees sheet via API
      try {
        const resp = await API.getEmployees().catch(err => { throw err; });
        employees = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp && resp.data) ? resp.data : [];
      } catch (err) {
        console.warn('API.getEmployees failed:', err);

        // Fallback: try to derive employee list from payroll runs for selected period
        try {
          if (_currentPeriod && typeof API.getPayrollRunsByPeriod === 'function') {
            const runsResp = await API.getPayrollRunsByPeriod(_currentPeriod).catch(() => []);
            const runs = Array.isArray(runsResp) ? runsResp : (runsResp && runsResp.records) ? runsResp.records : (runsResp && runsResp.data) ? runsResp.data : [];
            const seen = {};
            employees = runs.reduce((acc, r) => {
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
          console.warn('Fallback payroll-run derivation failed:', e2);
          employees = [];
        }
      }

      // Filter to active employees only (if 'Status' exists)
      employees = (employees || []).filter(emp => {
        const status = (emp['Status'] || emp.status || '').toString().trim().toLowerCase();
        // treat empty status as active
        return !status || status === 'active';
      });

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
      showToast('Payslip list loaded', 'success');

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
  // VIEW PAYSLIP - full data from sheets + YTD
  // =============================================================
  window.viewPayslip = async function(staffNumber) {
    window.closeActionDropdown();
    _currentStaffNumber = staffNumber;

    const period = _currentPeriod;
    if (!period) {
      showToast('Please select a period first', 'warning');
      return;
    }

    // Show global loading modal and modal internal overlay
    try { showLoadingModal && showLoadingModal('Loading payslip...'); } catch (e) {}
    const modal = document.getElementById('payslipModal');
    const modalArea = document.getElementById('modalPayrollTableArea');
    const modalPayPeriod = document.getElementById('modalPayPeriod');
    const modalGenerated = document.getElementById('modalGenerated');
    const loadingOverlay = document.getElementById('modalLoadingOverlay');
    if (modalPayPeriod) modalPayPeriod.textContent = period || '--';
    const now = new Date();
    const genStr = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (modalGenerated) modalGenerated.textContent = 'Generated: ' + genStr;
    if (loadingOverlay) loadingOverlay.classList.add('active');

    try {
      // 1) Try server-built payslip first
      try {
        if (typeof API !== 'undefined' && API && typeof API.getPayslipData === 'function') {
          const resp = await API.getPayslipData(staffNumber, period);
          if (resp && resp.success && resp.html) {
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
            return;
          } else if (resp && typeof resp === 'string') {
            modalArea && (modalArea.innerHTML = resp);
            return;
          } else {
            console.warn('getPayslipData returned no HTML — building from sheets');
          }
        }
      } catch (apiErr) {
        console.warn('Server getPayslipData failed, falling back to sheets:', apiErr);
      }

      // 2) Fetch employee record from Employees sheet
      let employee = { 'Staff Number': staffNumber, 'Full Name': staffNumber };
      try {
        const empResp = await API.getEmployeeByStaffNumber(staffNumber).catch(() => null);
        if (empResp) employee = empResp;
      } catch (e) {
        console.warn('Failed to fetch employee record:', e);
      }

      // 3) Fetch payroll record for the selected period (Payroll Runs)
      let payrollRecord = null;
      try {
        if (typeof API.getPayrollRunsByPeriod === 'function') {
          const runsResp = await API.getPayrollRunsByPeriod(period).catch(() => []);
          const runs = Array.isArray(runsResp) ? runsResp : (runsResp && runsResp.records) ? runsResp.records : (runsResp && runsResp.data) ? runsResp.data : [];
          payrollRecord = runs.find(r => {
            const staff = r['Staff Number'] || r.staff || r.staffNumber || '';
            return String(staff) === String(staffNumber);
          }) || null;
        }

        if (!payrollRecord && typeof API.getPayrollRunsByStaff === 'function') {
          const byStaffResp = await API.getPayrollRunsByStaff(staffNumber).catch(() => []);
          const byStaff = Array.isArray(byStaffResp) ? byStaffResp : (byStaffResp && byStaffResp.records) ? byStaffResp.records : (byStaffResp && byStaffResp.data) ? byStaffResp.data : [];
          payrollRecord = byStaff.find(r => {
            const p = r['Pay Period'] || r.payPeriod || r['Period'] || r['PAY_PERIOD'] || '';
            return String(p) === String(period);
          }) || payrollRecord;
        }
      } catch (e) {
        console.warn('Failed to fetch payroll runs (period/staff):', e);
      }

      // 4) Fetch allowances (Allowances sheet)
      let allowances = [];
      try {
        const allowResp = await API.getAllowancesByStaff(staffNumber).catch(() => []);
        allowances = Array.isArray(allowResp) ? allowResp : (allowResp && allowResp.records) ? allowResp.records : (allowResp && allowResp.data) ? allowResp.data : [];
      } catch (e) {
        console.warn('Failed to fetch allowances:', e);
        allowances = [];
      }

      // 5) Compute YTD sums: fetch all payroll runs for this staff and sum runs in current year
      const ytd = {
        basicSalary: 0,
        totalAllowances: 0,
        grossSalary: 0,
        employeePension: 0,
        employeePf: 0,
        paye: 0,
        totalDeduction: 0,
        netPay: 0,
        employerPension: 0,
        employerPf: 0,
        loanMonthly: 0
      };
      try {
        if (typeof API.getPayrollRunsByStaff === 'function') {
          const allByStaffResp = await API.getPayrollRunsByStaff(staffNumber).catch(() => []);
          const allByStaff = Array.isArray(allByStaffResp) ? allByStaffResp : (allByStaffResp && allByStaffResp.records) ? allByStaffResp.records : (allByStaffResp && allByStaffResp.data) ? allByStaffResp.data : [];
          const currentYear = (new Date()).getFullYear();

          for (const r of allByStaff) {
            let yr = null;
            const p = String(r['Pay Period'] || r.payPeriod || r['Period'] || '');
            const m = (p || '').match(/^(\d{4})/);
            if (m) yr = parseInt(m[1], 10);
            if (!yr && r['Run Date']) {
              const d = new Date(r['Run Date']);
              if (!isNaN(d.getFullYear())) yr = d.getFullYear();
            }
            if (yr === currentYear) {
              const num = v => {
                if (v === undefined || v === null || v === '') return 0;
                const n = parseFloat(String(v).toString().replace(/,/g, ''));
                return isNaN(n) ? 0 : n;
              };
              ytd.basicSalary += num(r['Basic Salary'] || r.basicSalary || r.BASIC_SALARY);
              ytd.totalAllowances += num(r['Total Allowances'] || r.totalAllowances || r['TOTAL_ALLOWANCES'] || r.Allowances);
              ytd.grossSalary += num(r['Gross Salary'] || r.grossSalary || r.GROSS_SALARY);
              ytd.employeePension += num(r['Employee Pension'] || r.employeePension || r['Employee Pension (5.5%)']);
              ytd.employeePf += num(r['Employee PF'] || r.employeePf || r['PF 10% Amount'] || r['Employee PF Amount']);
              ytd.paye += num(r['PAYE'] || r.paye);
              ytd.totalDeduction += num(r['Total Deduction'] || r.totalDeduction || r.TOTAL_DEDUCTION);
              ytd.netPay += num(r['Net Pay'] || r.netPay);
              ytd.employerPension += num(r['Employer Pension'] || r.employerPension || r['Employer 13% Amount']);
              ytd.employerPf += num(r['Employer PF'] || r.employerPf || r['Employer PF Amount']);
              ytd.loanMonthly += num(r['Monthly Loan'] || r.loanMonthly || r.LOAN_MONTHLY);
            }
          }
          Object.keys(ytd).forEach(k => ytd[k] = Math.round((ytd[k] + Number.EPSILON) * 100) / 100);
        }
      } catch (e) {
        console.warn('Failed to compute YTD from payroll runs:', e);
      }

      // 6) Prepare payrollForView — use payrollRecord (no recalculation) if present; otherwise compute locally for preview
      let payrollForView = null;
      if (payrollRecord) {
        payrollForView = payrollRecord;
        try {
          const rawAllow = payrollForView['Allowances'] || payrollForView.allowances;
          if (rawAllow && typeof rawAllow === 'string') {
            const parsed = JSON.parse(rawAllow || '[]');
            if (Array.isArray(parsed)) payrollForView.Allowances = parsed;
          }
        } catch (e) { /* ignore */ }
      } else {
        const basicSalary = parseFloat(employee['Basic Salary'] || employee.basicSalary || 0) || 0;
        const employeePFrate = parseFloat(employee['Employee PF Rate (%)'] || employee.employeePFrate || employee['Employee PF Rate'] || 0) || 0;
        const employerPFrate = parseFloat(employee['Employer PF Rate (%)'] || employee.employerPfrate || employee['Employer PF Rate'] || 0) || 0;
        const taxRelief = parseFloat(employee['Tax Relief'] || employee.taxRelief || 0) || 0;
        const loanMonthly = parseFloat(employee['Monthly Loan'] || employee.loanMonthly || 0) || 0;

        const calc = (typeof computePayrollRow === 'function')
          ? computePayrollRow({
              basicSalary: basicSalary,
              allowances: allowances,
              employeePFpct: employeePFrate || 5.5,
              employerPFpct: employerPFrate || 5,
              reliefAmount: taxRelief,
              loanMonthly: loanMonthly,
              pfChecked: (employeePFrate > 0)
            })
          : {
              totalAllowances: 0, grossSalary: basicSalary, employeePension: 0, employeePf: 0,
              taxRelief: 0, taxableAmount: 0, paye: 0, totalDeductionsBeforeTax: 0, netPay: 0,
              loanMonthly: 0, takeHomePay: 0, employerPension: 0, employerPf: 0
            };

        payrollForView = {
          'Basic Salary': basicSalary,
          'Total Allowances': calc.totalAllowances,
          'Gross Salary': calc.grossSalary,
          'Employee Pension': calc.employeePension,
          'Employee PF': calc.employeePf,
          'Tax Relief': calc.taxRelief || 0,
          'Taxable Income': calc.taxableAmount || 0,
          'PAYE': calc.paye || 0,
          'Total Deduction': calc.totalDeductionsBeforeTax || 0,
          'Net Pay': calc.netPay || 0,
          'Employer Pension': calc.employerPension || 0,
          'Employer PF': calc.employerPf || 0,
          'Monthly Loan': calc.loanMonthly || 0,
          'Allowances': allowances
        };
      }

      // 7) Render using builder with ytd
      const built = buildPayslipHTML(employee, payrollForView, period, ytd);
      if (modalArea) modalArea.innerHTML = built;

      // Update header fields
      document.getElementById('modalEmpId').textContent = staffNumber || '--';
      document.getElementById('modalName').textContent = employee['Full Name'] || employee.name || staffNumber || '--';
      document.getElementById('modalSSNIT').textContent = employee['SSNIT'] || employee.ssnit || '--';
      document.getElementById('modalGhanaCard').textContent = employee['Ghana Card'] || employee.ghanaCard || '--';
      document.getElementById('modalDept').textContent = employee['Department'] || employee.department || '--';
      document.getElementById('modalEmail').textContent = employee['Email'] || employee.email || '--';
      document.getElementById('modalDesignation').textContent = employee['Designation'] || employee.designation || '--';
      document.getElementById('modalBank').textContent = employee['Bank'] || employee.bank || '--';

    } catch (err) {
      console.error('Error viewing payslip:', err);
      const modalArea = document.getElementById('modalPayrollTableArea');
      if (modalArea) {
        modalArea.innerHTML = `
          <div style="padding:24px; text-align:center; color:#c00; font-size:13px;">
            <i class="fas fa-exclamation-circle" style="font-size:20px; display:block; margin-bottom:8px;"></i>
            Error loading payslip: ${escapeHtml(err.message || 'Unknown error')}
          </div>
        `;
      }
    } finally {
      if (loadingOverlay) loadingOverlay.classList.remove('active');
      try { hideLoadingModal && hideLoadingModal(); } catch (e) {}
    }

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
    let originalSendHtml = '';
    if (sendBtn) {
      originalSendHtml = sendBtn.innerHTML;
      sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      sendBtn.disabled = true;
    }

    try {
      if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
        const res = await API.sendPayslip(staffNumber, period);
        if (res && res.success !== false) {
          showToast('Payslip sent to ' + staffNumber, 'success');
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
        sendBtn.innerHTML = originalSendHtml || '<i class="fas fa-envelope"></i> Send';
        sendBtn.disabled = false;
      }
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

    if (overlay) overlay.classList.add('active');
    if (progressEl) progressEl.textContent = 'Preparing to send...';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const staff = rows[i].getAttribute('data-staff');
      if (progressEl) progressEl.textContent = `Sending ${i + 1}/${rows.length}... (${staff})`;
      try {
        if (typeof API !== 'undefined' && API && typeof API.sendPayslip === 'function') {
          const res = await API.sendPayslip(staff, period);
          if (res && res.success !== false) successCount++; else failCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    if (overlay) overlay.classList.remove('active');
    showToast(`Payslips sent: ${successCount} successful, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
  }

  // =============================================================
  // PRINT PAYSLIP
  // =============================================================
  function printPayslip() {
    const modalContent = document.getElementById('payslipModalContent');
    if (!modalContent) return;

    // Find the main payslip container inside modal content
    const payslipInner = modalContent.querySelector('div.payslip, div[style*="padding:25px 30px 18px 30px"], #modalPayrollTableArea > div');
    // fallback: take modalPayrollTableArea content
    const modalArea = document.getElementById('modalPayrollTableArea');
    const contentEl = payslipInner || modalArea;

    if (!contentEl) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('Please allow popups for printing', 'warning');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(n => {
      if (n.tagName.toLowerCase() === 'style') return n.innerHTML;
      if (n.tagName.toLowerCase() === 'link') return ''; // external css not easily inlined
      return '';
    }).join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip</title>
        <style>
          ${styles}
          body { background: white; padding: 0; margin: 0; font-family: Arial, sans-serif; }
          .payslip-print { max-width: 900px; margin: 0 auto; padding: 20px; }
          #modalLoadingOverlay, .modal-actions { display: none !important; }
        </style>
      </head>
      <body>
        <div class="payslip-print">
          ${contentEl.innerHTML}
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 100); }
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // =============================================================
  // BUILD PAYSLIP HTML (with YTD column)
  // =============================================================
  function buildPayslipHTML(employee, payroll, period, ytd) {
    // ytd: optional object with numeric properties (basicSalary, totalAllowances, grossSalary, employeePension, employeePf, paye, totalDeduction, netPay, employerPension, employerPf, loanMonthly)
    try {
      const staffNumber = String(employee['Staff Number'] || employee.staff || employee.staffNumber || '-');
      const fullName = String(employee['Full Name'] || employee.name || '-');
      const department = String(employee['Department'] || employee.department || '-');
      const designation = String(employee['Designation'] || employee.designation || '-');
      const email = String(employee['Email'] || employee.email || '-');
      const ssnit = String(employee['SSNIT'] || employee.ssnit || '-');
      const ghanaCard = String(employee['Ghana Card'] || employee.ghanaCard || '-');
      const bank = String(employee['Bank'] || employee.bank || '-');

      const getNum = function(obj, candidates) {
        if (!obj) return 0;
        for (const k of candidates) {
          if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
            const n = parseFloat(String(obj[k]).toString().replace(/,/g, ''));
            return isNaN(n) ? 0 : n;
          }
        }
        return 0;
      };

      // This Period values: prefer payroll fields (do NOT recalc if present)
      const basicSalary = getNum(payroll, ['Basic Salary', 'basicSalary']);
      const allowances = getNum(payroll, ['Total Allowances', 'totalAllowances', 'Allowances']);
      const grossSalary = getNum(payroll, ['Gross Salary', 'grossSalary']);
      const employeePension = getNum(payroll, ['Employee Pension', 'employeePension', 'Employee Pension (5.5%)']);
      const employeePF = getNum(payroll, ['Employee PF', 'employeePf', 'PF 10% Amount']);
      const taxRelief = getNum(payroll, ['Tax Relief', 'taxRelief']);
      const taxableIncome = getNum(payroll, ['Taxable Income', 'taxableIncome']);
      const paye = getNum(payroll, ['PAYE', 'paye']);
      const totalDeduction = getNum(payroll, ['Total Deduction', 'totalDeduction']);
      const netPay = getNum(payroll, ['Net Pay', 'netPay']);
      const employerPension = getNum(payroll, ['Employer Pension', 'employerPension', 'Employer 13% Amount']);
      const employerPF = getNum(payroll, ['Employer PF', 'employerPf', 'Employer PF Amount']);
      const monthlyLoan = getNum(payroll, ['Monthly Loan', 'loanMonthly']);

      // YTD values
      const y = ytd || {};
      const y_basic = y.basicSalary || y['Basic Salary'] || 0;
      const y_allow = y.totalAllowances || y['Total Allowances'] || 0;
      const y_gross = y.grossSalary || y['Gross Salary'] || 0;
      const y_empPension = y.employeePension || y['Employee Pension'] || 0;
      const y_empPF = y.employeePf || y['Employee PF'] || 0;
      const y_paye = y.paye || y.PAYE || 0;
      const y_totalDed = y.totalDeduction || y['Total Deduction'] || 0;
      const y_net = y.netPay || y['Net Pay'] || 0;
      const y_employerPension = y.employerPension || y['Employer Pension'] || 0;
      const y_employerPf = y.employerPf || y['Employer PF'] || 0;
      const y_loan = y.loanMonthly || y['Monthly Loan'] || 0;

      const formatCurrency = function(n) {
        return (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const generated = (new Date()).toLocaleString();

      // Full HTML template. This mirrors the template you used previously but with YTD values inserted.
      return `
<!DOCTYPE html>
<html>
<head>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Arial','Segoe UI',sans-serif; background:#f5f5f5; padding:10px; }
.payslip { max-width:900px; margin:0 auto; background:white; border-radius:10px; padding:18px 20px 12px 20px; box-shadow:0 8px 30px rgba(0,0,0,0.12); }
.header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #000; padding-bottom:12px; margin-bottom:14px; }
.logo-box { width:80px; height:55px; background:#f0f0f0; border:2px dashed #888; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:1px; }
.title { text-align:center; font-family:'Arial Black','Arial',sans-serif; font-size:26px; font-weight:900; color:#000; letter-spacing:4px; }
.period-box { text-align:right; background:#e8e8e8; padding:6px 14px; border-radius:6px; border-left:4px solid #000; }
.period-label { font-size:10px; text-transform:uppercase; color:#666; font-weight:700; letter-spacing:0.5px; }
.period-value { font-size:16px; font-weight:800; color:#000; }
.details { background:#f0f0f0; border-radius:8px; padding:10px 14px; display:grid; grid-template-columns:1fr 1fr; gap:4px 18px; margin-bottom:12px; border:1px solid #d0d0d0; font-size:13px; }
.detail-item { display:flex; padding:3px 0; }
.detail-label { font-weight:700; color:#555; min-width:110px; }
.detail-value { color:#000; font-weight:500; }
.payroll-table { width:100%; border-collapse:collapse; font-size:13px; margin:0; }
.payroll-table th { background:#000; color:white; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; padding:8px 10px; text-align:left; }
.payroll-table th.last { text-align:right; }
.payroll-table td { padding:8px 10px; border-bottom:1px solid #eee; vertical-align:middle; }
.section-header td { background:#666; color:white; font-weight:900; font-size:13px; text-transform:uppercase; letter-spacing:2px; padding:8px 10px; text-align:center !important; border-bottom:3px solid #000; }
.row-label { color:#333; padding-left:12px; font-weight:500; }
.sub-row { color:#444; font-size:12px; }
.sub-row td:first-child { padding-left:28px; }
.total-row td { font-weight:700; border-top:2px solid #000; padding-top:8px; font-size:14px; color:#000; }
.net-pay-row td { background:#333; color:white; font-weight:900; font-size:15px; padding:10px; border:none; }
.net-pay-row td.last { font-size:18px; font-weight:900; text-align:right !important; }
.net-pay-row td.first { font-size:14px; text-transform:uppercase; letter-spacing:0.5px; text-align:left !important; }
.employer-section .section-header td { background:#555; }
.footer { margin-top:12px; padding-top:10px; border-top:2px solid #d0d0d0; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#888; }
.footer-brand { font-weight:600; color:#333; font-size:12px; }
.footer-note { font-style:italic; color:#999; }
.footer-gen { color:#aaa; }
@media print { body { background:white; padding:0; } .payslip { box-shadow:none; border-radius:0; } }
@media (max-width:700px) { .header { flex-direction:column; gap:12px; } .details { grid-template-columns:1fr; } .period-box { text-align:left; width:100%; } .payroll-table { font-size:12px; } .payroll-table td, .payroll-table th { padding:6px 8px; } }
</style>
</head>
<body>
<div class="payslip">
  <!-- HEADER -->
  <div class="header">
    <div class="logo-box">LOGO</div>
    <div class="title">PAYSLIP</div>
    <div class="period-box">
      <div class="period-label">Pay Period</div>
      <div class="period-value">${escapeHtml(period)}</div>
    </div>
  </div>

  <!-- EMPLOYEE DETAILS -->
  <div class="details">
    <div class="detail-item"><span class="detail-label">Employee ID:</span><span class="detail-value">${escapeHtml(staffNumber)}</span></div>
    <div class="detail-item"><span class="detail-label">SSNIT No.:</span><span class="detail-value">${escapeHtml(ssnit)}</span></div>
    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${escapeHtml(fullName)}</span></div>
    <div class="detail-item"><span class="detail-label">GH Card No.:</span><span class="detail-value">${escapeHtml(ghanaCard)}</span></div>
    <div class="detail-item"><span class="detail-label">Department:</span><span class="detail-value">${escapeHtml(department)}</span></div>
    <div class="detail-item"><span class="detail-label">Email:</span><span class="detail-value">${escapeHtml(email)}</span></div>
    <div class="detail-item"><span class="detail-label">Designation:</span><span class="detail-value">${escapeHtml(designation)}</span></div>
    <div class="detail-item"><span class="detail-label">Bank:</span><span class="detail-value">${escapeHtml(bank)}</span></div>
  </div>

  <!-- PAYROLL TABLE -->
  <table class="payroll-table">
    <thead>
      <tr>
        <th style="width:50%;">Description</th>
        <th style="width:25%;">This Period (GHS)</th>
        <th class="last" style="width:25%;">YTD (GHS)</th>
      </tr>
    </thead>
    <tbody>
      <!-- EARNINGS -->
      <tr class="section-header"><td colspan="3"><strong>EARNINGS</strong></td></tr>
      <tr><td class="row-label">Basic Salary</td><td>${formatCurrency(basicSalary)}</td><td class="last">${formatCurrency(y_basic)}</td></tr>
      <tr><td class="row-label">Allowances</td><td>${formatCurrency(allowances)}</td><td class="last">${formatCurrency(y_allow)}</td></tr>
      <tr class="total-row"><td>Gross Pay</td><td>${formatCurrency(grossSalary)}</td><td class="last">${formatCurrency(y_gross)}</td></tr>

      <!-- DEDUCTIONS -->
      <tr class="section-header"><td colspan="3"><strong>DEDUCTIONS</strong></td></tr>
      <tr><td class="row-label statutory-label">Statutory</td><td></td><td class="last"></td></tr>
      <tr class="sub-row"><td>PAYE</td><td>${formatCurrency(paye)}</td><td class="last">${formatCurrency(y_paye)}</td></tr>
      <tr class="sub-row"><td>Employee Pension (5.50%)</td><td>${formatCurrency(employeePension)}</td><td class="last">${formatCurrency(y_empPension)}</td></tr>
      <tr><td class="row-label statutory-label">Other Deductions</td><td></td><td class="last"></td></tr>
      <tr class="sub-row"><td>Employee PF (10.00%)</td><td>${formatCurrency(employeePF)}</td><td class="last">${formatCurrency(y_empPF)}</td></tr>
      <tr class="sub-row"><td>Monthly Loan Deduction</td><td>${formatCurrency(monthlyLoan)}</td><td class="last">${formatCurrency(y_loan)}</td></tr>
      <tr><td class="row-label statutory-label">Tax Reliefs</td><td>${formatCurrency(taxRelief)}</td><td class="last">--</td></tr>
      <tr class="total-row"><td>Total Deductions</td><td>${formatCurrency(totalDeduction)}</td><td class="last">${formatCurrency(y_totalDed)}</td></tr>

      <!-- NET PAY -->
      <tr class="net-pay-row"><td class="first">Net Pay (Take Home)</td><td></td><td class="last">${formatCurrency(y_net ? y_net : netPay)}</td></tr>

      <!-- EMPLOYER CONTRIBUTIONS -->
      <tr class="section-header employer-section"><td colspan="3"><strong>EMPLOYER CONTRIBUTIONS</strong></td></tr>
      <tr><td class="row-label">Employer Pension (13.00%)</td><td>${formatCurrency(employerPension)}</td><td class="last">${formatCurrency(y_employerPension)}</td></tr>
      <tr><td class="row-label">Employer PF (5.00%)</td><td>${formatCurrency(employerPF)}</td><td class="last">${formatCurrency(y_employerPf)}</td></tr>
      <tr class="total-row" style="border-bottom:none;"><td>Total Employer Contribution</td><td>${formatCurrency((parseFloat(employerPension)||0) + (parseFloat(employerPF)||0))}</td><td class="last">${formatCurrency((parseFloat(y_employerPension)||0) + (parseFloat(y_employerPf)||0))}</td></tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-brand">GAP MICROFINANCE LTD</div>
    <div class="footer-note">* This is a computer-generated payslip. No signature required.</div>
    <div class="footer-gen">Generated: ${escapeHtml(generated)}</div>
  </div>
</div>
</body>
</html>
      `;
    } catch (error) {
      console.error('Error in buildPayslipHTML:', error);
      return '<p>Error generating payslip HTML: ' + (error.message || error) + '</p>';
    }
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
      console.log(`[${type}] ${msg}`);
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
