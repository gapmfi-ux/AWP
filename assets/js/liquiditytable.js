// Liquidity Table - Core computation and population logic
(function() {
    'use strict';

    // ---------- HEADINGS (matches server-side DailyLiquidity.gs) ----------
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

    // Mapping from heading label to table row index
    const HEADING_TO_ROW_MAP = {
        // TOTAL DEPOSITS LIABILITY (row 0)
        'Savings Account': 0,
        'Savings Trust Account': 0,
        'Susu Account': 0,
        'Susu Trust Account': 0,
        'GAP Kiddie Account': 0,
        'Staff Salary Account': 0,
        'GAP Fixed Term Deposit': 0,
        'GAP Borrowings': 0,
        
        // Current & Call Account Balances (row 6)
        'CalBank': 6,
        'Unibank - Current Account': 6,
        'Fidelity Bank': 6,
        'Fidelity Bank - Call Account': 6,
        'CBG - Call Account': 6,
        'Ecobank': 6,
        'GCB': 6,
        
        // Placement with Other Banks (row 7)
        'CBG - Fixed Deposit': 7,
        'Dalex Finance': 7,
        
        // Cash in hand (row 9)
        'Head Office Vault': 9,
        
        // Gov. Securities (row 10)
        'GOG Treasury Bills - CBG': 10,
        'GOG Treasury Bills - Fidelity': 10,
        'GOG Treasury Bills - Ecobank': 10,
        'GOG Treasury Bills- Cal Bank': 10,
        
        // TOTAL LOANS & ADVANCES (row 20)
        'Personal Loan': 20,
        'Susu Loan': 20,
        'Micro Business Loan': 20,
        'Business Loan': 20,
        'Agents Loan': 20,
        "Agents' Spouses Loan": 20,
        'Church Loan': 20,
        'Church Guaranteed Loan': 20,
        'PCG Affiliate Loan': 20,
        'Staff Loan': 20,
        'Employee Loan': 20,
        'Group Loan': 20,
        'Controller Loans': 20,
        
        // NET WORTH (row 21)
        'Stated Capital': 21,
        'Unaudited Profit Or Loss': 21,
        'Income Surplus': 21,
        'Statutory Reserve': 21,
        'Regulatory Credit Risk Reserve': 21
    };

    // ---------- EMPTY TABLE STRUCTURE ----------
    function getEmptyRows() {
        return [
            { label: 'TOTAL DEPOSITS LIABILITY', values: ['', '', '', '', '', '', ''], bold: true, icon: 'arrow-up' },
            { isSection: true, label: 'LIQUIDITY REQUIREMENTS' },
            { label: 'Primary Reserve required (8%)', values: ['', '', '', '', '', '', ''] },
            { label: 'Secondary Reserve required (20%)', values: ['', '', '', '', '', '', ''] },
            { label: 'TOTAL RESERVE REQUIRED - TRR', values: ['', '', '', '', '', '', ''], bold: true },
            { isSection: true, label: 'LIQUID ASSETS' },
            { label: 'Current & Call Account Balances', values: ['', '', '', '', '', '', ''] },
            { label: 'Placement with Other Banks', values: ['', '', '', '', '', '', ''] },
            { label: 'Total Balance with Banks', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Cash in hand', values: ['', '', '', '', '', '', ''] },
            { label: 'Gov. Securities (Treasury bills, Bonds etc)', values: ['', '', '', '', '', '', ''] },
            { label: 'TOTAL LIQUID ASSETS - TLA', values: ['', '', '', '', '', '', ''], bold: true, totalRow: true },
            { label: 'SURPLUS/(DEFICIT) TLA - TRR =', values: ['', '', '', '', '', '', ''], bold: true, surplusRow: true },
            { label: 'Primary Reserve Held', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Surplus/(Deficit)*', values: ['', '', '', '', '', '', ''], positive: true, highlight: true, bold: true },
            { label: 'Surplus/Deficit (with borrowings)*', values: ['', '', '', '', '', '', ''], negative: true, highlight: true, bold: true },
            { label: 'Secondary Reserve Held', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Surplus/(Deficit)*', values: ['', '', '', '', '', '', ''], positive: true },
            { label: 'Primary Reserve %', values: ['', '', '', '', '', '', ''], bold: true, highlight: true, isPercentage: true },
            { label: 'Secondary Reserve %', values: ['', '', '', '', '', '', ''], bold: true, highlight: true, isPercentage: true },
            { label: 'TOTAL LOANS & ADVANCES', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'NET WORTH (last month close)', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Plant, Property & Equipment (PPE)', values: ['', '', '', '', '', '', ''] },
            { isSection: true, label: 'RATIOS' },
            { label: 'Total Liquid Assets/Deposits', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Cash in hand/Deposit', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Loans/Deposits', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Total Loans/Networth', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'PPE/Networth', values: ['', '', '', '', '', '', ''], bold: true }
        ];
    }

    // ---------- DATE HELPERS ----------
    function getWeekDatesFromEnding(weekEndingDate) {
        const endDate = new Date(weekEndingDate);
        endDate.setHours(0, 0, 0, 0);
        
        if (isNaN(endDate.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayOfWeek = today.getDay();
            const diffToWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
            const wednesday = new Date(today);
            wednesday.setDate(today.getDate() + diffToWednesday);
            return getWeekDatesFromEnding(wednesday);
        }
        
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
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return day + '-' + month + '-' + year;
    }

    function formatWeekEnding(date) {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return month + ' ' + day + ', ' + year;
    }

    function formatNumber(val) {
        if (val === null || val === undefined || val === '') return '';
        const num = parseFloat(val);
        if (isNaN(num)) return String(val);
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatPercentage(val) {
        if (val === null || val === undefined || val === '') return '';
        const num = parseFloat(val);
        if (isNaN(num)) return String(val);
        return num.toFixed(2) + '%';
    }

    function formatDateKey(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        d.setHours(0, 0, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function parseDateFromValue(dateValue) {
        if (dateValue instanceof Date) return dateValue;
        
        if (typeof dateValue === 'string') {
            // Try DD/MM/YYYY or DD-MM-YYYY
            let parts = dateValue.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
            if (parts) {
                const d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
                if (!isNaN(d.getTime())) return d;
            }
            
            // Try YYYY-MM-DD
            parts = dateValue.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
            if (parts) {
                const d = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
                if (!isNaN(d.getTime())) return d;
            }
            
            // Try standard Date parsing
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d;
        }
        
        return null;
    }

    function isEmptyValue(val) {
        return val === null || val === undefined || val === '' || val === '—';
    }

    // ---------- BUILD TABLE DATA FOR A SPECIFIC DATE ----------
    function buildTableDataForDate(rowValues, targetDate) {
        const tableData = getEmptyRows();

        if (!rowValues || rowValues.length < 2) {
            return tableData;
        }

        // Get the date from the row
        const dateValue = rowValues[0];
        const dateObj = parseDateFromValue(dateValue);
        
        // If no valid date, return empty table
        if (!dateObj) {
            console.warn('No valid date found in data:', dateValue);
            return tableData;
        }
        
        // Determine which column this date belongs to based on the week
        let colIndex = -1;
        if (targetDate) {
            const weekDates = getWeekDatesFromEnding(targetDate);
            const dateKey = formatDateKey(dateObj);
            
            weekDates.forEach((d, index) => {
                if (formatDateKey(d) === dateKey) {
                    colIndex = index;
                }
            });
        }
        
        // If date doesn't match any day in the week, return empty table
        if (colIndex === -1) {
            console.warn('Date does not match any day in the selected week:', dateValue, targetDate);
            return tableData;
        }
        
        // Map values to table rows - ONLY populate the matching column
        for (let i = 1; i < rowValues.length && i < HEADINGS.length; i++) {
            const heading = HEADINGS[i];
            const val = rowValues[i];
            
            if (heading && !isEmptyValue(val)) {
                const rowIndex = HEADING_TO_ROW_MAP[heading];
                if (rowIndex !== undefined && tableData[rowIndex]) {
                    // Only set the value for the matching column
                    const numVal = parseFloat(val) || 0;
                    if (numVal !== 0) {
                        tableData[rowIndex].values[colIndex] = numVal;
                    }
                }
            }
        }

        // Calculate all derived rows for the matching column only
        calculateDerivedRowsForColumn(tableData, colIndex);

        return tableData;
    }

    // ---------- CALCULATE DERIVED ROWS FOR A SPECIFIC COLUMN ----------
    function calculateDerivedRowsForColumn(tableData, colIndex) {
        const rows = tableData;
        
        // Get base values for the specific column
        const deposits = parseFloat(rows[0].values[colIndex]) || 0;
        const currentCall = parseFloat(rows[6].values[colIndex]) || 0;
        const placement = parseFloat(rows[7].values[colIndex]) || 0;
        const cash = parseFloat(rows[9].values[colIndex]) || 0;
        const govSec = parseFloat(rows[10].values[colIndex]) || 0;
        const totalLoans = parseFloat(rows[20].values[colIndex]) || 0;
        const netWorth = parseFloat(rows[21].values[colIndex]) || 0;
        const ppe = parseFloat(rows[22].values[colIndex]) || 0;

        // LIQUIDITY REQUIREMENTS
        const primaryRequired = deposits * 0.08;
        rows[2].values[colIndex] = primaryRequired;
        
        const secondaryRequired = deposits * 0.20;
        rows[3].values[colIndex] = secondaryRequired;
        
        rows[4].values[colIndex] = primaryRequired + secondaryRequired;

        // LIQUID ASSETS
        const totalBalance = currentCall + placement;
        rows[8].values[colIndex] = totalBalance;
        
        const tla = totalBalance + cash + govSec;
        rows[11].values[colIndex] = tla;
        
        rows[12].values[colIndex] = tla - rows[4].values[colIndex];

        // RESERVE HELD
        const primaryHeld = totalBalance + cash;
        rows[13].values[colIndex] = primaryHeld;
        rows[14].values[colIndex] = primaryHeld - primaryRequired;
        rows[15].values[colIndex] = primaryHeld - primaryRequired;
        
        rows[16].values[colIndex] = govSec;
        rows[17].values[colIndex] = govSec - secondaryRequired;

        // PERCENTAGES
        rows[18].values[colIndex] = deposits > 0 ? (primaryHeld / deposits) * 100 : 0;
        rows[19].values[colIndex] = deposits > 0 ? (govSec / deposits) * 100 : 0;

        // RATIOS
        rows[24].values[colIndex] = deposits > 0 ? tla / deposits : 0;
        rows[25].values[colIndex] = deposits > 0 ? cash / deposits : 0;
        rows[26].values[colIndex] = deposits > 0 ? totalLoans / deposits : 0;
        rows[27].values[colIndex] = netWorth > 0 ? totalLoans / netWorth : 0;
        rows[28].values[colIndex] = netWorth > 0 ? ppe / netWorth : 0;

        return rows;
    }

    // ---------- RENDER TABLE ----------
    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        let html = '';
        const rows = data || getEmptyRows();

        rows.forEach((item) => {
            if (item.isSection) {
                html += `<tr class="section-header"><td colspan="8"><i class="fas fa-${item.icon || 'folder-open'}"></i> ${item.label}</td></tr>`;
                return;
            }

            let rowClass = '';
            if (item.totalRow) rowClass = 'total-row';
            else if (item.surplusRow) rowClass = 'surplus-row';
            
            if (item.highlight) {
                rowClass += ' highlighted-row';
            }

            let labelHtml = item.label;
            if (item.icon) {
                labelHtml = `<i class="fas fa-${item.icon}" style="margin-right:4px;color:#2b6e4f;"></i> ${labelHtml}`;
            }
            if (item.bold) labelHtml = `<strong>${labelHtml}</strong>`;

            let valueCells = '';
            if (item.values && item.values.length === 7) {
                item.values.forEach((val) => {
                    let displayVal = '';
                    const isEmpty = isEmptyValue(val) || val === 0 || val === '0' || val === '0.00';
                    
                    if (!isEmpty && val !== undefined && val !== null && String(val).trim() !== '') {
                        if (item.isPercentage) {
                            displayVal = formatPercentage(val);
                        } else {
                            displayVal = formatNumber(val);
                        }
                    } else {
                        displayVal = '<span class="empty-cell">—</span>';
                    }
                    
                    let cls = 'numeric';
                    if (item.positive) cls += ' positive';
                    if (item.negative) cls += ' negative';
                    if (item.isPercentage) cls += ' percentage';
                    if (item.highlight) cls += ' highlighted';
                    
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

    // ---------- UPDATE COLUMN HEADERS ----------
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

    // ---------- SET DEFAULT DATE ----------
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

    // ---------- EXPOSE API ----------
    window.LiquidityTable = {
        getEmptyRows: getEmptyRows,
        buildTableDataForDate: buildTableDataForDate,
        calculateDerivedRowsForColumn: calculateDerivedRowsForColumn,
        renderTable: renderTable,
        formatNumber: formatNumber,
        formatPercentage: formatPercentage,
        getWeekDatesFromEnding: getWeekDatesFromEnding,
        updateColumnHeadersWithDates: updateColumnHeadersWithDates,
        updateWeekEnding: updateWeekEnding,
        formatDateHeader: formatDateHeader,
        formatWeekEnding: formatWeekEnding,
        setDefaultDate: setDefaultDate,
        formatDateKey: formatDateKey,
        parseDateFromValue: parseDateFromValue,
        isEmptyValue: isEmptyValue,
        HEADINGS: HEADINGS,
        HEADING_TO_ROW_MAP: HEADING_TO_ROW_MAP
    };

})();
