(function () {
  'use strict';

  // Default HEADINGS (keeps parity with server code)
  const DEFAULT_HEADINGS = [
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

  // Helpers - date normalization / keys
  function toDate(d) {
    if (!d) return null;
    if (d instanceof Date) {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd;
    }
    // Try parsing strings like 'yyyy-MM-dd' or other formats
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  function fmtDateKey(d) {
    // returns 'yyyy-MM-dd'
    const date = toDate(d);
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function normalizeDateInput(d) {
    const date = toDate(d) || new Date();
    if (!date) return new Date();
    return date;
  }

  // week computation (preserve original Wednesday-centered logic)
  function getWeekDatesFromEnding(weekEndingDate) {
    const endDate = normalizeDateInput(weekEndingDate);
    const dayOfWeek = endDate.getDay();
    const diffToWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
    const wednesday = new Date(endDate);
    wednesday.setDate(endDate.getDate() + diffToWednesday);
    wednesday.setHours(0, 0, 0, 0);

    const weekDates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(wednesday);
      date.setDate(wednesday.getDate() - i);
      date.setHours(0, 0, 0, 0);
      weekDates.push(date);
    }
    return weekDates;
  }

  function formatDateHeader(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()] + ' ' + date.getDate();
  }

  function formatWeekEnding(date) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return month + ' ' + day + ', ' + year;
  }

  // DOM header updater (IDs: col1..col7, #weekEndingDate, #weekEndingDisplay, #footerWeekEnding)
  function updateColumnHeadersWithDates(weekEndingDate) {
    const weekDates = getWeekDatesFromEnding(weekEndingDate);
    const dayNames = weekDates.map(d => formatDateHeader(d));
    for (let i = 1; i <= 7; i++) {
      const col = document.getElementById('col' + i);
      if (col) col.textContent = dayNames[i - 1];
    }

    const lastDay = weekDates[weekDates.length - 1];
    const weekEnding = formatWeekEnding(lastDay);
    updateWeekEnding(weekEnding);

    const datePicker = document.getElementById('weekEndingDate');
    if (datePicker) {
      const year = lastDay.getFullYear();
      const month = String(lastDay.getMonth() + 1).padStart(2, '0');
      const day = String(lastDay.getDate()).padStart(2, '0');
      datePicker.value = year + '-' + month + '-' + day;
    }
    return { weekDates, dayNames, weekEnding };
  }

  function updateWeekEnding(weekEnding) {
    const displays = document.querySelectorAll('#weekEndingDisplay, #footerWeekEnding');
    displays.forEach(el => {
      if (el) el.textContent = weekEnding;
    });
  }

  // Render function (kept simple and DOM-dependent)
  function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    let html = '';

    if (!data || data.length === 0) {
      data = [{ isSection: true, label: 'No data available' }];
    }

    data.forEach(item => {
      if (item.isSection) {
        html += `<tr class="section-header"><td colspan="8"><i class="fas fa-${item.icon || 'folder-open'}"></i> ${item.label}</td></tr>`;
        return;
      }

      let rowClass = '';
      if (item.totalRow) rowClass = 'total-row';
      else if (item.surplusRow) rowClass = 'surplus-row';

      let labelHtml = item.label || '';
      if (item.icon) {
        labelHtml = `<i class="fas fa-${item.icon}" style="margin-right:4px;color:#2b6e4f;"></i> ${labelHtml}`;
      }
      if (item.bold) labelHtml = `<strong>${labelHtml}</strong>`;

      let valueCells = '';
      if (item.values && item.values.length === 7) {
        item.values.forEach((val) => {
          const displayVal = (val !== undefined && val !== null && String(val).trim() !== '') ? val : '<span class="empty-cell">—</span>';
          let cls = 'numeric';
          if (item.positive) cls += ' positive';
          if (item.negative) cls += ' negative';
          valueCells += `<td class="${cls}">${displayVal}</td>`;
        });
      } else {
        valueCells = '<td colspan="7" class="text-muted">—</td>';
      }

      html += `<tr class="${rowClass}">
                <td class="row-label">${labelHtml}</td>
                ${valueCells}
            </tr>`;
    });

    tbody.innerHTML = html;
  }

  function setDefaultDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
    const wednesday = new Date(today);
    wednesday.setDate(today.getDate() + diffToWednesday);

    const datePicker = document.getElementById('weekEndingDate');
    if (datePicker) {
      const year = wednesday.getFullYear();
      const month = String(wednesday.getMonth() + 1).padStart(2, '0');
      const day = String(wednesday.getDate()).padStart(2, '0');
      datePicker.value = year + '-' + month + '-' + day;
    }

    return wednesday;
  }

  // Parse sheet rows (expected format: array of arrays, each row: [date, val1, val2, ...])
  function parseSheetRows(sheetRows) {
    // returns map: dateKey -> rowArray (values starting index 1 => heading1)
    const map = new Map();
    if (!Array.isArray(sheetRows)) return map;

    for (let r of sheetRows) {
      if (!r || r.length === 0) continue;
      // r[0] expected date (Date object or string)
      const key = fmtDateKey(r[0]);
      if (!key) continue;
      // store the row values array (keep r as-is)
      map.set(key, r);
    }
    return map;
  }

  // Core: populate table rows from Daily Liquidity sheet rows
  // sheetRows: array of arrays [date, val1, val2, ...] (dates may be Date objects or strings)
  // weekEnding: date or string (optional)
  // headings: array of headings (optional) - must be same order as sheet columns (sheet col 2 => headings[1])
  // returns { data, weekDates, populatedColumnsCount }
  function populateFromDailyLiquiditySheetRows(sheetRows, weekEnding, headings) {
    headings = headings || DEFAULT_HEADINGS;
    const weekDates = getWeekDatesFromEnding(weekEnding);
    const weekKeys = weekDates.map(d => fmtDateKey(d));
    const sheetMap = parseSheetRows(sheetRows);

    // determine which weekDates have data present (exact date match)
    const availableIndices = [];
    for (let i = 0; i < weekKeys.length; i++) {
      if (sheetMap.has(weekKeys[i])) availableIndices.push(i);
    }

    // find the highest index that has data; we will populate up to that index (so later columns stay blank)
    const maxAvailableIndex = availableIndices.length ? Math.max(...availableIndices) : -1;

    // Build table rows for each heading (skip the first heading which is 'Date')
    const tableRows = [];
    for (let hi = 1; hi < headings.length; hi++) {
      const headingLabel = headings[hi];
      // for each of 7 columns pick the value if available and if index <= maxAvailableIndex (so we leave later columns blank)
      const values = new Array(7).fill('');
      for (let col = 0; col < 7; col++) {
        // only populate columns where the sheet has that exact date and index <= maxAvailableIndex
        if (col <= maxAvailableIndex && sheetMap.has(weekKeys[col])) {
          const row = sheetMap.get(weekKeys[col]) || [];
          // sheet row layout: [date, valForHeading1, valForHeading2, ...] so heading hi maps to row[hi]
          const val = (row.length > hi) ? row[hi] : '';
          values[col] = (val === null || val === undefined) ? '' : val;
        } else {
          values[col] = ''; // leave blank
        }
      }
      tableRows.push({
        label: headingLabel,
        values: values
      });
    }

    // Optionally add section/summary rows; caller can post-process tableRows and merge with EMPTY_ROWS
    // Here we call renderTable directly to overwrite current table
    renderTable(tableRows);

    return {
      success: true,
      data: tableRows,
      weekDates: weekDates,
      maxAvailableIndex: maxAvailableIndex,
      populatedColumns: maxAvailableIndex + 1
    };
  }

  // Export API
  window.LiquidityTable = {
    // date / header helpers
    getWeekDatesFromEnding: getWeekDatesFromEnding,
    updateColumnHeadersWithDates: updateColumnHeadersWithDates,
    updateWeekEnding: updateWeekEnding,
    formatDateHeader: formatDateHeader,
    formatWeekEnding: formatWeekEnding,
    setDefaultDate: setDefaultDate,

    // render / population
    renderTable: renderTable,
    parseSheetRows: parseSheetRows,
    populateFromDailyLiquiditySheetRows: populateFromDailyLiquiditySheetRows,

    // default headings exposed
    DEFAULT_HEADINGS: DEFAULT_HEADINGS
  };

})();
