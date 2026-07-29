/* LiquidityTable front-end module
 *
 * Responsibilities:
 *  - populate the week-ending selector with dates found in the Daily Liquidity sheet (via API.getAvailableWeekEndings())
 *  - observe the uploadSuccessModal and automatically call API.importLiquidityFromTrialBalance for the selected upload date
 *  - after import completes (or when user chooses a date), load the appended row (API.getLiquidityRow) and write values into the Daily Liquidity table UI
 *
 * This file is intentionally self-contained. Include it after dailyliquidity.js in index.html.
 */
(function(window, document) {
  'use strict';

  const HEADINGS = [
    'Date',
    'Head Office Vault',
    'Personal Loan',
    'Susu Loan',
    'Micro Business Loan',
    'Business Loan',
    'Agents Loan',
    "Agents' Spouses Loan",
    'Church Loan',
    'Church Guaranteed Loan',
    'PCG Affiliate Loan',
    'Staff Loan',
    'Employee Loan',
    'Group Loan',
    'Controller Loans',
    'CalBank',
    'Unibank - Current Account',
    'Fidelity Bank',
    'Fidelity Bank - Call Account',
    'CBG - Call Account',
    'Ecobank',
    'GCB',
    'CBG - Fixed Deposit',
    'GOG Treasury Bills - CBG',
    'GOG Treasury Bills - Fidelity',
    'GOG Treasury Bills - Ecobank',
    'GOG Treasury Bills- Cal Bank',
    'Dalex Finance',
    'Savings Account',
    'Savings Trust Account',
    'Susu Account',
    'Susu Trust Account',
    'GAP Kiddie Account',
    'Staff Salary Account',
    'GAP Fixed Term Deposit',
    'GAP Borrowings',
    'Stated Capital',
    'Unaudited Profit Or Loss',
    'Income Surplus',
    'Statutory Reserve',
    'Regulatory Credit Risk Reserve'
  ];

  // basic normalizer to match heading -> table labels
  function normalizeKey(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replace(/\u2019/g, "'")
      .toLowerCase()
      .replace(/[^\w'\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // update week-ending select with dates fetched from server
  async function populateWeekEndingSelector() {
    try {
      const res = await API.getAvailableWeekEndings();
      if (!res || res.success === false) {
        console.warn('Could not load available week endings', res);
        return;
      }
      const dates = res.dates || [];
      const datePicker = document.getElementById('weekEndingDate');
      if (!datePicker) return;

      // prefer the latest available date if any; otherwise keep existing
      if (dates.length) {
        // set to latest
        datePicker.value = dates[0].date;
        // also set footer display
        const footer = document.getElementById('footerWeekEnding');
        if (footer) footer.textContent = dates[0].display;
      }
    } catch (err) {
      console.error('populateWeekEndingSelector error', err);
    }
  }

  // map a sheet row's values (aligned to HEADINGS) into the UI table
  function applyRowValuesToTable(rowValues) {
    try {
      if (!rowValues || !rowValues.length) return { success: false, error: 'No values' };
      // rowValues[0] = date, rowValues[1..] correspond to HEADINGS[1..]
      const tbody = document.getElementById('tableBody');
      if (!tbody) return { success: false, error: 'tableBody not found' };

      // build map of normalized label -> row element
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const labelToRow = new Map();
      rows.forEach(r => {
        if (r.classList.contains('section-header')) return;
        const labelCell = r.querySelector('.row-label');
        if (!labelCell) return;
        const text = (labelCell.textContent || labelCell.innerText || '').replace(/[\u2013\u2014–—]/g, ' ').trim();
        labelToRow.set(normalizeKey(text), r);
      });

      // For each heading index, pick its value and set to the last column (Wed). If you prefer different column mapping change this.
      for (let hi = 1; hi < HEADINGS.length && hi < rowValues.length; hi++) {
        const heading = HEADINGS[hi];
        const norm = normalizeKey(heading);
        const value = rowValues[hi];

        // find matching row in DOM
        const rowEl = labelToRow.get(norm);
        if (!rowEl) {
          // not found, skip
          continue;
        }

        // find the value TDs inside this row (first td is label)
        const cells = rowEl.querySelectorAll('td');
        if (!cells || cells.length < 2) continue;
        // value columns are cells[1]..cells[7] - we'll update the last one (Wed) as the week-ending snapshot
        const targetCell = cells[cells.length - 1];
        if (!targetCell) continue;

        // format numeric values nicely if possible
        let out = '';
        if (value === null || value === undefined || value === '') {
          out = '<span class="empty-cell">—</span>';
        } else if (!isNaN(Number(value))) {
          const num = Number(value);
          out = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
          out = String(value);
        }
        targetCell.innerHTML = out;
      }

      return { success: true };
    } catch (err) {
      console.error('applyRowValuesToTable error', err);
      return { success: false, error: err.toString() };
    }
  }

  // fetch a stored Daily Liquidity row for a date and apply to the table
  async function refreshTableForDate(weekEnding) {
    try {
      if (!weekEnding) {
        const dp = document.getElementById('weekEndingDate');
        weekEnding = dp ? dp.value : '';
      }
      if (!weekEnding) return;

      const resp = await API.request('getLiquidityRow', { weekEnding }, { showLoading: false }).catch(() => null);
      // API wrapper may already have convenience function: API.getLiquidityRow
      let data;
      if (window.API && typeof API.getLiquidityRow === 'function') {
        data = await API.getLiquidityRow(weekEnding, { showLoading: false });
      } else {
        data = resp;
      }

      if (!data || data.success === false) {
        console.warn('No stored liquidity row for', weekEnding, data && data.error);
        return { success: false, error: data && data.error };
      }

      // data.values is the row array
      return applyRowValuesToTable(data.values);
    } catch (err) {
      console.error('refreshTableForDate error', err);
      return { success: false, error: err.toString() };
    }
  }

  // When uploadSuccessModal becomes visible, trigger server import for the date selected in the upload modal
  // We don't change the upload handler; we simply call the existing server-side import function
  async function triggerImportForUploadModal() {
    try {
      // check uploadWeekEnding (upload modal's date) first, fallback to page selector
      const uploadWeekInput = document.getElementById('uploadWeekEnding');
      const pageWeekInput = document.getElementById('weekEndingDate');
      const week = uploadWeekInput && uploadWeekInput.value ? uploadWeekInput.value : (pageWeekInput ? pageWeekInput.value : '');

      if (!week) {
        showToast('No week-ending date selected for automatic import', 'warning');
        return;
      }

      showToast('Triggering import for ' + week + ' ...', 'info');

      // API.importLiquidityFromTrialBalance already exists on the server (DailyLiquidity.gs)
      const imp = await API.importLiquidityFromTrialBalance(week, { showLoading: true }).catch(err => {
        console.error('import error', err);
        return { success: false, error: err.message || err.toString() };
      });

      if (!imp || imp.success === false) {
        showToast('Import failed: ' + (imp && imp.error ? imp.error : 'Unknown'), 'error');
        return;
      }

      // After import, the server appends the new row — load it and populate the table
      await refreshTableForDate(week);
      showToast('Imported liquidity and updated table for ' + week, 'success');

    } catch (err) {
      console.error('triggerImportForUploadModal error', err);
      showToast('Automatic import failed: ' + err.message, 'error');
    }
  }

  // watch for upload success modal using MutationObserver
  function observeUploadSuccessModal() {
    const modal = document.getElementById('uploadSuccessModal');
    if (!modal) return;

    let lastVisible = false;
    const observer = new MutationObserver(function(mutations) {
      try {
        const isVisible = (modal.style && (modal.style.display === 'block' || modal.style.display === 'flex'));
        if (isVisible && !lastVisible) {
          // modal just opened -> trigger import automatically
          lastVisible = true;
          // small delay to give the modal a moment to show and for form's date to be set
          setTimeout(() => triggerImportForUploadModal(), 500);
        } else if (!isVisible && lastVisible) {
          lastVisible = false;
        }
      } catch (e) {
        console.error('modal observer error', e);
      }
    });

    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
  }

  // small helper to reuse dailyliquidity's toast if present, otherwise fallback
  function showToast(msg, type) {
    if (window.showToast) {
      try { window.showToast(msg, type); return; } catch (e) {}
    }
    // fallback minimal toast
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '20px';
    el.style.bottom = '20px';
    el.style.padding = '10px 14px';
    el.style.background = (type === 'error' ? '#fee2e2' : (type === 'success' ? '#d1fae5' : '#dbeafe'));
    el.style.color = (type === 'error' ? '#991b1b' : (type === 'success' ? '#065f46' : '#1e40af'));
    el.style.borderLeft = '4px solid rgba(0,0,0,0.08)';
    el.style.zIndex = 99999;
    el.style.borderRadius = '6px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // initialization
  async function init() {
    document.addEventListener('DOMContentLoaded', function() {
      // populate selector (if present)
      populateWeekEndingSelector().catch(e => console.warn(e));
      observeUploadSuccessModal();
      // also attach change handler so when user picks a date we load saved values
      const datePicker = document.getElementById('weekEndingDate');
      if (datePicker) {
        datePicker.addEventListener('change', function() {
          refreshTableForDate(this.value);
        });
      }
    });

    // Also expose API for manual refresh
    window.LiquidityTable = {
      refreshTableForDate,
      applyRowValuesToTable,
      triggerImportForUploadModal
    };
  }

  init();

})(window, document);
