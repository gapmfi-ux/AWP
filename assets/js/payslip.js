// assets/js/payslip.js - Complete updated file with fixed YTD calculation

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
  // GENERATE PAYSLIP LIST - Load from Payroll Runs sheet
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
          <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading payroll data for ${_currentPeriod || 'selected period'}...
        </td>
      </tr>`;
    }

    try {
      const period = _currentPeriod;
      if (!period) {
        showToast('Please select a period first', 'warning');
        tbody.innerHTML = `<tr>
          <td colspan="3" style="padding:20px; text-align:center; color:#c00; font-size:13px;">
            <i class="fas fa-exclamation-circle" style="font-size:18px; display:block; margin-bottom:6px;"></i>
            Please select a period first
          </td>
        </tr>`;
        return;
      }

      // Load payroll runs for the selected period from Payroll Runs sheet
      let payrollRuns = [];
      try {
        const resp = await API.getPayrollRunsByPeriod(period).catch(err => { throw err; });
        payrollRuns = Array.isArray(resp) ? resp : (resp && resp.records) ? resp.records : (resp && resp.data) ? resp.data : [];
      } catch (err) {
        console.warn('API.getPayrollRunsByPeriod failed:', err);
        payrollRuns = [];
      }

      // If no payroll runs found, show empty state
      if (!payrollRuns || payrollRuns.length === 0) {
        tbody.innerHTML = `<tr>
          <td colspan="3" style="padding:20px; text-align:center; color:#999; font-size:13px;">
            <i class="fas fa-info-circle" style="font-size:18px; display:block; margin-bottom:6px; color:#ccc;"></i>
            No payroll records found for ${period}
            <br><span style="font-size:11px; color:#aaa;">Run payroll for this period first</span>
          </td>
        </tr>`;
        return;
      }

      // Extract unique employees from payroll runs (Staff Number + Full Name)
      const employeeMap = new Map();
      payrollRuns.forEach(record => {
        const staffNumber = record['Staff Number'] || record.staffNumber || record.staff || '';
        const fullName = record['Full Name'] || record.fullName || record.name || '';
        if (staffNumber && !employeeMap.has(staffNumber)) {
          employeeMap.set(staffNumber, {
            staffNumber: staffNumber,
            fullName: fullName,
            payrollRecord: record
          });
        }
      });

      // Convert map to array and sort by name
      const employees = Array.from(employeeMap.values()).sort((a, b) => 
        (a.fullName || '').localeCompare(b.fullName || '')
      );

      if (employees.length === 0) {
        tbody.innerHTML = `<tr>
          <td colspan="3" style="padding:20px; text-align:center; color:#999; font-size:13px;">
            <i class="fas fa-users" style="font-size:18px; display:block; margin-bottom:6px; color:#ccc;"></i>
            No employees found in payroll for ${period}
          </td>
        </tr>`;
        return;
      }

      // Render the employee list
      const rows = employees.map(emp => {
        const staffNumber = emp.staffNumber;
        const fullName = emp.fullName || staffNumber;
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
      showToast(`Loaded ${employees.length} employees for ${period}`, 'success');

    } catch (err) {
      console.error('Error loading payslip list', err);
      if (tbody) {
        tbody.innerHTML = `<tr>
          <td colspan="3" style="padding:20px; text-align:center; color:#c00; font-size:13px;">
            <i class="fas fa-exclamation-circle" style="font-size:18px; display:block; margin-bottom:6px;"></i>
            Failed to load payroll data: ${escapeHtml(err.message || 'Unknown error')}
          </td>
        </tr>`;
      }
      showToast('Failed to load payroll data', 'error');
    } finally {
      _isGenerating = false;
      if (generateBtn) {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
      }
    }
  }

async function getYTDTotals(staffNumber, currentPeriod) {
  try {
    if (!staffNumber || !currentPeriod) return null;

    // Normalize currentPeriod to { year, month } numbers (month: 1-12)
    function parsePeriodToYMD(p) {
      if (!p) return null;
      p = String(p).trim();

      // YYYY-MM or YYYY/MM or YYYYMM
      let m = p.match(/^(\d{4})[-\/]?(\d{1,2})$/);
      if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };

      // MM/YYYY or M/YYYY or MM-YYYY
      m = p.match(/^(\d{1,2})[\/\-](\d{4})$/);
      if (m) return { year: parseInt(m[2], 10), month: parseInt(m[1], 10) };

      // MonthName YYYY (e.g. Aug 2026, August 2026)
      m = p.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const monNames = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
        const key = m[1].toLowerCase().slice(0,3);
        if (monNames[key]) return { year: parseInt(m[2],10), month: monNames[key] };
      }

      // Try Date parsing fallback
      const d = new Date(p);
      if (!isNaN(d.getTime())) {
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      }

      return null;
    }

    const target = parsePeriodToYMD(currentPeriod);
    if (!target) return null;
    const targetKey = target.year * 100 + target.month; // e.g. 202608

    // Fetch all payroll runs for this staff
    const runsResp = await API.getPayrollRunsByStaff(staffNumber).catch(() => []);
    const runs = Array.isArray(runsResp) ? runsResp : (runsResp && runsResp.records) ? runsResp.records : (runsResp && runsResp.data) ? runsResp.data : [];
    if (!runs || runs.length === 0) return null;

    // Helper to normalize a run's pay period into numeric key YYYYMM
    function runPeriodKey(r) {
      const raw = r['Pay Period'] || r.payPeriod || r['period'] || r['PayPeriod'] || '';
      const parsed = parsePeriodToYMD(raw);
      if (!parsed) return null;
      return parsed.year * 100 + parsed.month;
    }

    // Include all runs with period key <= targetKey (this ensures current/selected month is included)
    const includedRuns = runs
      .map(r => ({ rec: r, key: runPeriodKey(r) }))
      .filter(x => x.key !== null && x.key <= targetKey)
      .sort((a,b) => a.key - b.key) // earliest -> latest
      .map(x => x.rec);

    if (includedRuns.length === 0) return null;

    // YTD accumulator
    const ytd = {
      basicSalary: 0,
      totalAllowances: 0,
      grossSalary: 0,
      employeePension: 0,
      employeePF: 0,
      taxRelief: 0,
      taxableIncome: 0,
      paye: 0,
      totalDeduction: 0,
      netPay: 0,
      employerPension: 0,
      employerPF: 0,
      monthlyLoan: 0
    };

    // Helper to get numeric value with multiple field name fallbacks
    const getNumeric = (record, fieldNames) => {
      for (const name of fieldNames) {
        if (record[name] !== undefined && record[name] !== null && record[name] !== '') {
          const val = parseFloat(String(record[name]).replace(/,/g, ''));
          if (!isNaN(val)) return val;
        }
      }
      return 0;
    };

    // Accumulate values from each included run
    includedRuns.forEach((r) => {
      ytd.basicSalary += getNumeric(r, ['Basic Salary', 'basicSalary', 'basic_salary']);
      ytd.totalAllowances += getNumeric(r, ['Total Allowances', 'totalAllowances', 'Allowances', 'allowances']);
      ytd.grossSalary += getNumeric(r, ['Gross Salary', 'grossSalary', 'gross_salary']);
      ytd.employeePension += getNumeric(r, ['Employee Pension', 'employeePension', 'Employee Pension (5.5%)']);
      ytd.employeePF += getNumeric(r, ['Employee PF', 'employeePf', 'PF 10% Amount']);
      ytd.taxRelief += getNumeric(r, ['Tax Relief', 'taxRelief', 'tax_relief']);
      ytd.taxableIncome += getNumeric(r, ['Taxable Income', 'taxableIncome', 'Taxable Amount']);
      ytd.paye += getNumeric(r, ['PAYE', 'paye']);
      ytd.totalDeduction += getNumeric(r, ['Total Deduction', 'totalDeduction', 'total_deduction']);
      ytd.netPay += getNumeric(r, ['Net Pay', 'netPay', 'net_pay', 'Net Pay (GHS)']);
      ytd.employerPension += getNumeric(r, ['Employer Pension', 'employerPension', 'Employer 13% Amount']);
      ytd.employerPF += getNumeric(r, ['Employer PF', 'employerPf', 'Employer PF Amount']);
      ytd.monthlyLoan += getNumeric(r, ['Monthly Loan', 'loanMonthly', 'monthly_loan']);
    });

    // Round to 2 decimals (roundToTwo is available in payslip.js scope)
    Object.keys(ytd).forEach(k => {
      if (typeof roundToTwo === 'function') ytd[k] = roundToTwo(ytd[k]);
      else ytd[k] = Math.round((ytd[k] + Number.EPSILON) * 100) / 100;
    });

    return ytd;
  } catch (err) {
    console.warn('Error calculating YTD:', err);
    return null;
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

    // Show loading overlay
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
      // 1) Get payroll record for this staff and period from Payroll Runs
      let payrollRecord = null;
      try {
        const runsResp = await API.getPayrollRunsByPeriod(period).catch(() => []);
        const runs = Array.isArray(runsResp) ? runsResp : (runsResp && runsResp.records) ? runsResp.records : (runsResp && runsResp.data) ? runsResp.data : [];
        payrollRecord = runs.find(r => {
          const staff = r['Staff Number'] || r.staffNumber || r.staff || '';
          return String(staff).trim() === String(staffNumber).trim();
        }) || null;
      } catch (e) {
        console.warn('Failed to fetch payroll runs:', e);
      }

      // 2) Get employee details from Employees sheet
      let employee = { 'Staff Number': staffNumber, 'Full Name': staffNumber };
      try {
        const empResp = await API.getEmployeeByStaffNumber(staffNumber).catch(() => null);
        if (empResp) {
          employee = empResp;
        } else if (payrollRecord) {
          // Fallback: use data from payroll record
          employee['Full Name'] = payrollRecord['Full Name'] || payrollRecord.fullName || staffNumber;
          employee['Designation'] = payrollRecord['Designation'] || payrollRecord.designation || '';
        }
      } catch (e) {
        console.warn('Failed to fetch employee record:', e);
      }

      // 3) Get allowance details from Payroll Allowance Runs for this runId
      let allowances = [];
      let runId = payrollRecord ? (payrollRecord['Run ID'] || payrollRecord.runId || null) : null;
      
      if (runId) {
        try {
          const allowResp = await API.getPayrollAllowanceRunsByRunId(runId).catch(() => []);
          const allowData = Array.isArray(allowResp) ? allowResp : (allowResp && allowResp.records) ? allowResp.records : (allowResp && allowResp.data) ? allowResp.data : [];
          // Find allowances for this specific staff
          const staffAllow = allowData.find(item => {
            const staff = item.staffNumber || item['Staff Number'] || item.staff || '';
            return String(staff).trim() === String(staffNumber).trim();
          });
          if (staffAllow && staffAllow.allowances) {
            allowances = staffAllow.allowances;
          }
        } catch (e) {
          console.warn('Failed to fetch payroll allowance runs:', e);
        }
      }

      // 4) If no runId or no allowance run data, try to get from payroll record's Allowances field
      if (allowances.length === 0 && payrollRecord) {
        const rawAllowances = payrollRecord['Allowances'] || payrollRecord.allowances || payrollRecord['ALLOWANCES'];
        if (rawAllowances && typeof rawAllowances === 'string') {
          try {
            const parsed = JSON.parse(rawAllowances);
            if (Array.isArray(parsed) && parsed.length > 0) {
              allowances = parsed;
            }
          } catch (e) { /* ignore parse failure */ }
        }
      }

      // 5) Get YTD totals for this staff (includes current month)
      let ytdData = await getYTDTotals(staffNumber, period);

      // 6) Build payroll data for payslip display
      let payrollForView = null;
      
      if (payrollRecord) {
        // Map payroll record fields to expected names
        payrollForView = {
          'Basic Salary': parseFloat(payrollRecord['Basic Salary'] || payrollRecord.basicSalary || 0) || 0,
          'Total Allowances': parseFloat(payrollRecord['Total Allowances'] || payrollRecord.totalAllowances || 
                              (allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0))) || 0,
          'Gross Salary': parseFloat(payrollRecord['Gross Salary'] || payrollRecord.grossSalary || 0) || 0,
          'Employee Pension': parseFloat(payrollRecord['Employee Pension'] || payrollRecord.employeePension || 0) || 0,
          'Employee PF': parseFloat(payrollRecord['Employee PF'] || payrollRecord.employeePf || payrollRecord['PF 10% Amount'] || 0) || 0,
          'Tax Relief': parseFloat(payrollRecord['Tax Relief'] || payrollRecord.taxRelief || 0) || 0,
          'Taxable Income': parseFloat(payrollRecord['Taxable Income'] || payrollRecord.taxableIncome || payrollRecord['Taxable Amount'] || 0) || 0,
          'PAYE': parseFloat(payrollRecord['PAYE'] || payrollRecord.paye || 0) || 0,
          'Total Deduction': parseFloat(payrollRecord['Total Deduction'] || payrollRecord.totalDeduction || 0) || 0,
          'Net Pay': parseFloat(payrollRecord['Net Pay'] || payrollRecord.netPay || 0) || 0,
          'Employer Pension': parseFloat(payrollRecord['Employer Pension'] || payrollRecord.employerPension || payrollRecord['Employer 13% Amount'] || 0) || 0,
          'Employer PF': parseFloat(payrollRecord['Employer PF'] || payrollRecord.employerPf || payrollRecord['Employer PF Amount'] || 0) || 0,
          'Monthly Loan': parseFloat(payrollRecord['Monthly Loan'] || payrollRecord.loanMonthly || 0) || 0,
          'Allowances': allowances,
          'YTD': ytdData || null
        };
      } else {
        // Compute from employee data if no payroll record exists
        const basicSalary = parseFloat(employee['Basic Salary'] || employee.basicSalary || 0) || 0;
        const employeePFrate = parseFloat(employee['Employee PF Rate (%)'] || employee.employeePFrate || 0) || 0;
        const employerPFrate = parseFloat(employee['Employer PF Rate (%)'] || employee.employerPFrate || 0) || 0;
        const taxRelief = parseFloat(employee['Tax Relief'] || employee.taxRelief || 0) || 0;
        const loanMonthly = parseFloat(employee['Monthly Loan'] || employee.loanMonthly || 0) || 0;

        const calc = computePayrollRow({
          basicSalary: basicSalary,
          allowances: allowances,
          employeePFpct: employeePFrate || 5.5,
          employerPFpct: employerPFrate || 5,
          reliefAmount: taxRelief,
          loanMonthly: loanMonthly,
          pfChecked: (employeePFrate > 0)
        });

        payrollForView = {
          'Basic Salary': basicSalary,
          'Total Allowances': calc.totalAllowances,
          'Gross Salary': calc.grossSalary,
          'Employee Pension': calc.employeePension,
          'Employee PF': calc.employeePf,
          'Tax Relief': calc.taxRelief,
          'Taxable Income': calc.taxableAmount,
          'PAYE': calc.paye,
          'Total Deduction': calc.totalDeductionsBeforeTax,
          'Net Pay': calc.netPay,
          'Employer Pension': calc.employerPension,
          'Employer PF': calc.employerPf,
          'Monthly Loan': calc.loanMonthly,
          'Allowances': allowances,
          'YTD': ytdData || null
        };
      }

      // 7) Build payslip HTML with YTD data
      const built = buildPayslipHTML(employee, payrollForView, period);
      if (modalArea) {
        modalArea.innerHTML = built;
      }

      // Update header details
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
      if (modalArea) {
        modalArea.innerHTML = `
          <div style="padding:24px; text-align:center; color:#c00; font-size:13px;">
            <i class="fas fa-exclamation-circle" style="font-size:20px; display:block; margin-bottom:8px;"></i>
            Error loading payslip: ${escapeHtml(err.message || 'Unknown error')}
          </div>
        `;
      }
    } finally {
      // Hide overlays
      if (loadingOverlay) loadingOverlay.classList.remove('active');
      try { hideLoadingModal && hideLoadingModal(); } catch (e) {}
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
  // BUILD PAYSLIP HTML with YTD and proper alignment
  // =============================================================
  // In buildPayslipHTML - Updated YTD handling
function buildPayslipHTML(employee, payroll, period) {
  const format = (n) => {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Current period values
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

  // YTD values - if no YTD data, use current period values (for single month)
  const ytd = payroll?.YTD || null;
  
  // If no YTD data, use current period values as YTD (first/only month)
  const ytdBasic = ytd ? format(ytd.basicSalary) : basic;
  const ytdAllowances = ytd ? format(ytd.totalAllowances) : allowances;
  const ytdGross = ytd ? format(ytd.grossSalary) : gross;
  const ytdPaye = ytd ? format(ytd.paye) : paye;
  const ytdEmpPension = ytd ? format(ytd.employeePension) : empPension;
  const ytdEmpPF = ytd ? format(ytd.employeePF) : empPF;
  const ytdTaxRelief = ytd ? format(ytd.taxRelief) : taxRelief;
  const ytdTotalDed = ytd ? format(ytd.totalDeduction) : totalDed;
  const ytdNetPay = ytd ? format(ytd.netPay) : netPay;
  const ytdEmpPension13 = ytd ? format(ytd.employerPension) : empPension13;
  const ytdEmpPF5 = ytd ? format(ytd.employerPF) : empPF5;
  const ytdLoan = ytd ? format(ytd.monthlyLoan) : loan;
  const ytdTotalEmployer = ytd ? format((ytd.employerPension || 0) + (ytd.employerPF || 0)) : format((parseFloat(empPension13) || 0) + (parseFloat(empPF5) || 0));

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
            <tr><td style="padding:4px 10px;">Basic Salary</td><td style="padding:4px 10px; text-align:right;">${basic}</td><td style="padding:4px 10px; text-align:right;">${ytdBasic}</td></tr>
            <tr><td style="padding:4px 10px;">Allowances</td><td style="padding:4px 10px; text-align:right;">${allowances}</td><td style="padding:4px 10px; text-align:right;">${ytdAllowances}</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:5px 10px;">Gross Pay</td><td style="padding:5px 10px; text-align:right;">${gross}</td><td style="padding:5px 10px; text-align:right;">${ytdGross}</td></tr>

            <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:center; font-weight:700; padding:5px; text-transform:uppercase; color:#333; font-size:12px;">DEDUCTIONS</td></tr>
            <tr><td style="padding:4px 10px; font-weight:600; color:#444;">Statutory</td><td></td><td></td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">PAYE</td><td style="padding:3px 10px; text-align:right;">${paye}</td><td style="padding:3px 10px; text-align:right;">${ytdPaye}</td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">Employee Pension (5.5%)</td><td style="padding:3px 10px; text-align:right;">${empPension}</td><td style="padding:3px 10px; text-align:right;">${ytdEmpPension}</td></tr>
            <tr><td style="padding:4px 10px; font-weight:600; color:#444;">Other Deductions</td><td></td><td></td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">Employee PF (10%)</td><td style="padding:3px 10px; text-align:right;">${empPF}</td><td style="padding:3px 10px; text-align:right;">${ytdEmpPF}</td></tr>
            <tr><td style="padding:3px 10px 3px 28px;">Monthly Loan</td><td style="padding:3px 10px; text-align:right;">${loan}</td><td style="padding:3px 10px; text-align:right;">${ytdLoan}</td></tr>
            <tr><td style="padding:4px 10px; font-weight:600; color:#444;">Tax Reliefs</td><td style="padding:4px 10px; text-align:right;">${taxRelief}</td><td style="padding:4px 10px; text-align:right;">${ytdTaxRelief}</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:5px 10px;">Total Deductions</td><td style="padding:5px 10px; text-align:right;">${totalDed}</td><td style="padding:5px 10px; text-align:right;">${ytdTotalDed}</td></tr>

            <!-- NET PAY - aligned properly under both columns -->
            <tr style="background:#333; color:white;">
              <td style="padding:6px 10px; font-weight:700; font-size:13px; text-align:left;">Net Pay</td>
              <td style="padding:6px 10px; text-align:right; font-size:17px; font-weight:900;">${netPay}</td>
              <td style="padding:6px 10px; text-align:right; font-size:17px; font-weight:900;">${ytdNetPay}</td>
            </tr>

            <tr style="background:#e8e8e8;"><td colspan="3" style="text-align:center; font-weight:700; padding:5px; text-transform:uppercase; color:#333; font-size:12px;">EMPLOYER CONTRIBUTIONS</td></tr>
            <tr><td style="padding:4px 10px;">Employer Pension (13%)</td><td style="padding:4px 10px; text-align:right;">${empPension13}</td><td style="padding:4px 10px; text-align:right;">${ytdEmpPension13}</td></tr>
            <tr><td style="padding:4px 10px;">Employer PF (5%)</td><td style="padding:4px 10px; text-align:right;">${empPF5}</td><td style="padding:4px 10px; text-align:right;">${ytdEmpPF5}</td></tr>
            <tr style="font-weight:700; border-top:2px solid #000;"><td style="padding:5px 10px;">Total Employer Contribution</td><td style="padding:5px 10px; text-align:right;">${format((parseFloat(empPension13) || 0) + (parseFloat(empPF5) || 0))}</td><td style="padding:5px 10px; text-align:right;">${ytdTotalEmployer}</td></tr>
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
  // PAYROLL COMPUTE HELPERS (Client-side fallback)
  // =============================================================
  function roundToTwo(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function getTaxBrackets() {
    return [
      { bracket: 'First', amount: 490, rate: 0 },
      { bracket: 'Next', amount: 110, rate: 0.05 },
      { bracket: 'Next', amount: 130, rate: 0.10 },
      { bracket: 'Next', amount: 3166.67, rate: 0.175 },
      { bracket: 'Next', amount: 16000, rate: 0.25 },
      { bracket: 'Next', amount: 30520, rate: 0.30 },
      { bracket: 'Exceeding', amount: 50000, rate: 0.35 }
    ];
  }

  function calculatePAYE(taxableIncome) {
    const brackets = getTaxBrackets();
    let remainingIncome = taxableIncome;
    let totalTax = 0;

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      if (remainingIncome <= 0) break;
      if (i === brackets.length - 1) {
        totalTax += remainingIncome * bracket.rate;
        break;
      } else {
        const taxableInThisBracket = Math.min(remainingIncome, bracket.amount);
        totalTax += taxableInThisBracket * bracket.rate;
        remainingIncome -= taxableInThisBracket;
      }
    }

    return roundToTwo(totalTax);
  }

  function computePayrollRow(opts = {}) {
    const basicSalary = parseFloat(opts.basicSalary || 0) || 0;
    const allowances = Array.isArray(opts.allowances) ? opts.allowances : [];
    const employeePFpct = parseFloat(opts.employeePFpct || 5.5) || 0;
    const employerPFpct = parseFloat(opts.employerPFpct || 5) || 0;
    const reliefAmount = parseFloat(opts.reliefAmount || 0) || 0;
    const loanMonthly = parseFloat(opts.loanMonthly || 0) || 0;
    const pfChecked = !!opts.pfChecked;

    const totalAllowances = roundToTwo(allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0));
    const grossSalary = roundToTwo(basicSalary + totalAllowances);

    const employeePension = roundToTwo(grossSalary * 0.055);
    const employeePf = pfChecked ? roundToTwo(basicSalary * (employeePFpct / 100)) : 0;
    const taxRelief = roundToTwo(reliefAmount || 0);
    const totalDeductionsBeforeTax = roundToTwo(employeePension + employeePf + taxRelief);
    const taxableAmount = Math.max(0, roundToTwo(grossSalary - totalDeductionsBeforeTax));
    const paye = calculatePAYE(taxableAmount);
    const netPay = roundToTwo(taxableAmount - paye);
    const loanMonthlyAmount = roundToTwo(loanMonthly || 0);
    const takeHomePay = roundToTwo(netPay - loanMonthlyAmount);
    const employerPension = roundToTwo(grossSalary * 0.13);
    const employerPf = pfChecked ? roundToTwo(basicSalary * (employerPFpct / 100)) : 0;

    return {
      totalAllowances,
      grossSalary,
      employeePension,
      employeePf,
      taxRelief,
      totalDeductionsBeforeTax,
      taxableAmount,
      paye,
      netPay,
      loanMonthly: loanMonthlyAmount,
      takeHomePay,
      employerPension,
      employerPf
    };
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
