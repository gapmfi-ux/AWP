// Updated payslip.js - client-side flows wired to Drive-backed generation & send

(function() {
  let _actionPortalOpen = false;
  let _currentPeriod = null;
  let _currentStaffNumber = null;
  let _isGenerating = false;

  async function initPayslipModule() {
    const monthInput = document.getElementById('payslipPeriod');
    if (monthInput) {
      if (!monthInput.value) {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        monthInput.value = `${now.getFullYear()}-${mm}`;
      }
      _currentPeriod = monthInput.value;
      monthInput.addEventListener('change', () => { _currentPeriod = monthInput.value; });
    }

    const generateBtn = document.getElementById('generatePayslipBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', generatePayslipList);
    }

    const sendAllBtn = document.getElementById('sendAllPayslipsBtn');
    if (sendAllBtn) {
      sendAllBtn.addEventListener('click', async function() {
        if (!_currentPeriod) { showToast('Please select a period first', 'warning'); return; }
        if (!confirm('Send payslips for ' + _currentPeriod + ' to all visible employees?')) return;
        await sendAllPayslips(_currentPeriod);
      });
    }

    document.getElementById('payslipSearchInput')?.addEventListener('input', filterPayslipList);

    // initial empty state
    renderEmptyList();
  }

  function renderEmptyList() {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#999;">
      <i class="fas fa-file-invoice" style="font-size:20px; display:block; margin-bottom:6px; color:#ccc;"></i>
      Click "Generate" to load payslip data
    </td></tr>`;
    updatePayslipCount(0);
  }

  async function generatePayslipList() {
    if (_isGenerating) return;
    _isGenerating = true;

    const genBtn = document.getElementById('generatePayslipBtn');
    const origHTML = genBtn ? genBtn.innerHTML : '';
    if (genBtn) { genBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; genBtn.disabled = true; }

    try {
      if (!_currentPeriod) { showToast('Please select a period first', 'warning'); renderEmptyList(); return; }
      showLoadingModal && showLoadingModal('Generating payslips (server-side). This may take a while...');
      // Call server to generate & save PDFs (overwrites existing files)
      let genResp;
      try {
        genResp = await API.generatePayslipsForPeriod(_currentPeriod).catch(err => { throw err; });
      } catch (err) {
        console.warn('generatePayslipsForPeriod failed:', err);
        // still attempt to load payroll runs (maybe already generated earlier)
      }

      // Load payroll runs to build table (server-side)
      let payrollResp;
      try {
        payrollResp = await API.getPayrollRunsByPeriod(_currentPeriod).catch(e => { throw e; });
      } catch (err) {
        console.error('getPayrollRunsByPeriod failed:', err);
        showToast('Failed to load payroll runs: ' + (err.message || err), 'error');
        renderEmptyList();
        return;
      }

      const runs = Array.isArray(payrollResp) ? payrollResp : (payrollResp && payrollResp.records) ? payrollResp.records : [];
      if (!runs || runs.length === 0) {
        renderEmptyList();
        showToast('No payroll records found for ' + _currentPeriod, 'info');
        return;
      }

      // Build rows
      const rows = runs.map(r => {
        const staff = (r['Staff Number'] || r.staffNumber || r.staff || '').toString();
        const name = (r['Full Name'] || r.fullName || r.name || staff).toString();
        return `<tr data-staff="${escapeHtml(staff)}">
          <td style="padding:6px 14px; font-size:13px; color:#333;">${escapeHtml(staff)}</td>
          <td style="padding:6px 14px; font-size:13px; color:#333;">${escapeHtml(name)}</td>
          <td style="padding:6px 14px; text-align:center;">
            <button class="action-btn" onclick="window.viewPayslip('${escapeJs(staff)}')" title="View Payslip"><i class="fas fa-eye"></i></button>
            <button class="action-btn" onclick="window.sendPayslip('${escapeJs(staff)}')" title="Send Payslip"><i class="fas fa-envelope"></i></button>
          </td>
        </tr>`;
      }).join('');

      const tbody = document.getElementById('payslipListBody');
      if (tbody) tbody.innerHTML = rows;
      // apply current filter
      filterPayslipList();

      // show summary from generation if available
      if (genResp && genResp.success) {
        const successCount = Array.isArray(genResp.results) ? genResp.results.filter(x=>x.success).length : 0;
        const failCount = Array.isArray(genResp.results) ? genResp.results.filter(x=>!x.success).length : 0;
        showToast(`Generation complete: ${successCount} OK, ${failCount} failed`, 'success');
      } else {
        showToast('Payslip list loaded', 'success');
      }

    } catch (err) {
      console.error('generatePayslipList error:', err);
      showToast('Failed: ' + (err.message || err), 'error');
      renderEmptyList();
    } finally {
      _isGenerating = false;
      if (genBtn) { genBtn.innerHTML = origHTML; genBtn.disabled = false; }
      hideLoadingModal && hideLoadingModal();
    }
  }

  function filterPayslipList() {
    const input = document.getElementById('payslipSearchInput');
    const searchTerm = input ? input.value.toLowerCase().trim() : '';
    const rows = document.querySelectorAll('#payslipListBody tr[data-staff]');
    let visible = 0;
    rows.forEach(row => {
      const staff = (row.getAttribute('data-staff') || '').toLowerCase();
      const nameCell = row.querySelector('td:nth-child(2)');
      const name = nameCell ? nameCell.textContent.toLowerCase() : '';
      const ok = !searchTerm || staff.includes(searchTerm) || name.includes(searchTerm);
      row.style.display = ok ? '' : 'none';
      if (ok) visible++;
    });
    updatePayslipCount(visible);
  }

  function updatePayslipCount(count) {
    const el = document.getElementById('payslipCount');
    if (el) el.textContent = count + ' employee' + (count !== 1 ? 's' : '');
  }

  async function viewPayslip(staffNumber) {
    window.closeActionDropdown && window.closeActionDropdown();
    _currentStaffNumber = staffNumber;
    if (!_currentPeriod) { showToast('Please select a period first', 'warning'); return; }

    try {
      showLoadingModal && showLoadingModal('Preparing payslip...');
      // Try to fetch existing saved file record
      let fileRec = null;
      try {
        fileRec = await API.getPayslipFileRecord(staffNumber, _currentPeriod).catch(()=>null);
      } catch (e) {
        console.warn('getPayslipFileRecord failed', e);
        fileRec = null;
      }

      if (fileRec && fileRec.fileUrl) {
        // Prefer opening the Drive URL (requires sharing or same-domain access)
        window.open(fileRec.fileUrl, '_blank');
        return;
      }

      // Fallback: generate PDF on-demand via server + open as data URL
      const payslipDataResp = await API.getPayslipData(staffNumber, _currentPeriod).catch(()=>null);
      if (!payslipDataResp || payslipDataResp.success === false) {
        showToast('Payslip data not available', 'error');
        return;
      }
      const html = payslipDataResp.html;
      const pdfResp = await API.generatePayslipPDF({ staffNumber: staffNumber, period: _currentPeriod, htmlContent: html }, { timeout: 90000 }).catch(()=>null);
      if (!pdfResp || !pdfResp.success || !pdfResp.pdfBase64) {
        showToast('Failed to generate PDF for viewing', 'error');
        return;
      }

      const byteCharacters = atob(pdfResp.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    } catch (err) {
      console.error('viewPayslip error:', err);
      showToast('Failed to view payslip: ' + (err.message || err), 'error');
    } finally {
      hideLoadingModal && hideLoadingModal();
    }
  }

  async function sendPayslip(staffNumber) {
    window.closeActionDropdown && window.closeActionDropdown();
    if (!_currentPeriod) { showToast('Please select a period first', 'warning'); return; }
    if (!confirm('Send payslip to ' + staffNumber + ' for ' + _currentPeriod + '?')) return;

    try {
      showLoadingModal && showLoadingModal('Sending payslip...');
      const resp = await API.sendPayslipUsingFile(staffNumber, _currentPeriod).catch(e => { throw e; });
      if (resp && resp.success) {
        showToast('Payslip sent to ' + (resp.to || staffNumber), 'success');
      } else {
        showToast('Failed to send payslip: ' + (resp && resp.error ? resp.error : 'Unknown'), 'error');
      }
    } catch (err) {
      console.error('sendPayslip error:', err);
      showToast('Failed to send payslip: ' + (err.message || err), 'error');
    } finally {
      hideLoadingModal && hideLoadingModal();
    }
  }

  async function sendAllPayslips(period) {
    const tbody = document.getElementById('payslipListBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr[data-staff]')).filter(r => r.style.display !== 'none');
    if (rows.length === 0) { showToast('No employees to send (check filter)', 'warning'); return; }
    if (!confirm(`Send payslips to ${rows.length} employees for ${period}?`)) return;

    const overlay = document.getElementById('sendAllLoadingOverlay');
    const progressEl = document.getElementById('sendAllProgress');
    if (overlay) overlay.className = 'active';
    if (progressEl) progressEl.textContent = 'Starting...';

    let success = 0, fail = 0;
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const staff = rows[i].getAttribute('data-staff');
      const name = rows[i].querySelector('td:nth-child(2)')?.textContent || staff;
      if (progressEl) progressEl.textContent = `Sending ${i+1}/${rows.length}: ${name}`;
      try {
        const r = await API.sendPayslipUsingFile(staff, period).catch(e => { throw e; });
        if (r && r.success) success++; else { fail++; failed.push(staff + ' (' + (r && r.error ? r.error : 'send failed') + ')'); }
      } catch (err) {
        fail++; failed.push(staff + ' (' + (err.message || err) + ')');
      }
      // small throttle to avoid quota bursts
      await new Promise(res => setTimeout(res, 300));
    }

    if (overlay) overlay.className = '';
    let msg = `Sent: ${success}, Failed: ${fail}`;
    if (failed.length && failed.length <= 6) msg += '\nFailed: ' + failed.join(', ');
    showToast(msg, success > 0 ? 'success' : 'error');
  }

  // helpers
  function showToast(msg, type) {
    const g = document.getElementById('global-toast');
    if (g) {
      g.textContent = msg;
      g.className = type || 'info';
      g.style.display = 'block';
      clearTimeout(g._t);
      g._t = setTimeout(()=>{ g.style.display = 'none'; }, 4000);
    } else {
      console.log('[toast]', type, msg);
    }
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function escapeJs(s) { return String(s||'').replace(/'/g, "\\'"); }

  // Expose functions globally (used by inline onclicks)
  window.initPayslipModule = initPayslipModule;
  window.generatePayslipList = generatePayslipList;
  window.viewPayslip = viewPayslip;
  window.sendPayslip = sendPayslip;
  window.sendAllPayslips = sendAllPayslips;
  window.filterPayslipList = filterPayslipList;

  // auto init
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPayslipModule);
  else initPayslipModule();
})();
