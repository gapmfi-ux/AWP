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
        'Head Office Vault': 9,  // Cash in hand
        'Personal Loan': 20,     // TOTAL LOANS & ADVANCES (part of sum)
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
        'CalBank': 6,            // Current & Call Account Balances
        'Unibank - Current Account': 6,
        'Fidelity Bank': 6,
        'Fidelity Bank - Call Account': 6,
        'CBG - Call Account': 6,
        'Ecobank': 6,
        'GCB': 6,
        'CBG - Fixed Deposit': 7, // Placement with Other Banks
        'Dalex Finance': 7,
        'GOG Treasury Bills - CBG': 10, // Gov. Securities
        'GOG Treasury Bills - Fidelity': 10,
        'GOG Treasury Bills - Ecobank': 10,
        'GOG Treasury Bills- Cal Bank': 10,
        'Savings Account': 0,    // TOTAL DEPOSITS LIABILITY
        'Savings Trust Account': 0,
        'Susu Account': 0,
        'Susu Trust Account': 0,
        'GAP Kiddie Account': 0,
        'Staff Salary Account': 0,
        'GAP Fixed Term Deposit': 0,
        'GAP Borrowings': 0,
        'Stated Capital': 21,    // NET WORTH (last month close)
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
            { label: 'Surplus/(Deficit)*', values: ['', '', '', '', '', '', ''], positive: true },
            { label: 'Surplus/Deficit (with borrowings)*', values: ['', '', '', '', '', '', ''], negative: true },
            { label: 'Secondary Reserve Held', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Surplus/(Deficit)*', values: ['', '', '', '', '', '', ''], positive: true },
            { label: 'Primary Reserve %', values: ['', '', '', '', '', '', ''] },
            { label: 'Secondary Reserve %', values: ['', '', '', '', '', '', ''] },
            { label: 'TOTAL LOANS & ADVANCES', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'NET WORTH (last month close)', values: ['', '', '', '', '', '', ''], bold: true },
            { label: 'Plant, Property & Equipment', values: ['', '', '', '', '', '', ''] },
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

    function formatNumber(val) {
        if (val === null || val === undefined || val === '') return '';
        const num = parseFloat(val);
        if (isNaN(num)) return String(val);
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // ---------- BUILD TABLE DATA FROM VALUES ----------
    function buildTableDataFromValues(values) {
        const tableData = getEmptyRows();

        if (!values || values.length < 2) {
            return tableData;
        }

        // Map values to table rows
        for (let i = 1; i < values.length && i < HEADINGS.length; i++) {
            const heading = HEADINGS[i];
            const val = values[i];
            
            if (heading && val !== undefined && val !== null && val !== '') {
                const rowIndex = HEADING_TO_ROW_MAP[heading];
                if (rowIndex !== undefined && tableData[rowIndex]) {
                    const colIndex = i - 1;
                    if (colIndex >= 0 && colIndex < 7) {
                        const currentVal = parseFloat(tableData[rowIndex].values[colIndex]) || 0;
                        tableData[rowIndex].values[colIndex] = currentVal + (parseFloat(val) || 0);
                    }
                }
            }
        }

        // Calculate all derived rows
        calculateDerivedRows(tableData);

        return tableData;
    }

    // ---------- CALCULATE DERIVED ROWS ----------
    function calculateDerivedRows(tableData) {
        const rows = tableData;
        
        for (let col = 0; col < 7; col++) {
            // Get base values
            const deposits = parseFloat(rows[0].values[col]) || 0; // TOTAL DEPOSITS LIABILITY
            
            // Current & Call Account Balances (row 6)
            const currentCall = parseFloat(rows[6].values[col]) || 0;
            
            // Placement with Other Banks (row 7)
            const placement = parseFloat(rows[7].values[col]) || 0;
            
            // Cash in hand (row 9)
            const cash = parseFloat(rows[9].values[col]) || 0;
            
            // Gov. Securities (row 10)
            const govSec = parseFloat(rows[10].values[col]) || 0;
            
            // TOTAL LOANS & ADVANCES (row 20)
            const totalLoans = parseFloat(rows[20].values[col]) || 0;
            
            // NET WORTH (row 21)
            const netWorth = parseFloat(rows[21].values[col]) || 0;
            
            // Plant, Property & Equipment (row 22)
            const ppe = parseFloat(rows[22].values[col]) || 0;

            // ----- LIQUIDITY REQUIREMENTS -----
            // Primary Reserve required (8%) - row 2
            const primaryRequired = deposits * 0.08;
            rows[2].values[col] = primaryRequired;
            
            // Secondary Reserve required (20%) - row 3
            const secondaryRequired = deposits * 0.20;
            rows[3].values[col] = secondaryRequired;
            
            // TOTAL RESERVE REQUIRED - TRR (row 4)
            rows[4].values[col] = primaryRequired + secondaryRequired;

            // ----- LIQUID ASSETS -----
            // Total Balance with Banks (row 8)
            const totalBalance = currentCall + placement;
            rows[8].values[col] = totalBalance;
            
            // TOTAL LIQUID ASSETS - TLA (row 11)
            const tla = totalBalance + cash + govSec;
            rows[11].values[col] = tla;
            
            // SURPLUS/(DEFICIT) TLA - TRR (row 12)
            const trr = rows[4].values[col];
            rows[12].values[col] = tla - trr;

            // ----- RESERVE HELD -----
            // Primary Reserve Held (row 13)
            const primaryHeld = totalBalance + cash;
            rows[13].values[col] = primaryHeld;
            
            // Surplus/(Deficit)* - row 14
            rows[14].values[col] = primaryHeld - primaryRequired;
            
            // Surplus/Deficit (with borrowings)* - row 15
            rows[15].values[col] = primaryHeld - primaryRequired;
            
            // Secondary Reserve Held (row 16)
            rows[16].values[col] = govSec;
            
            // Surplus/(Deficit)* - row 17
            rows[17].values[col] = govSec - secondaryRequired;

            // ----- PERCENTAGES -----
            // Primary Reserve % (row 18)
            rows[18].values[col] = deposits > 0 ? (primaryHeld / deposits) * 100 : 0;
            
            // Secondary Reserve % (row 19)
            rows[19].values[col] = deposits > 0 ? (govSec / deposits) * 100 : 0;

            // ----- RATIOS (rows 24-28) -----
            // Total Liquid Assets/Deposits (row 24)
            rows[24].values[col] = deposits > 0 ? tla / deposits : 0;
            
            // Cash in hand/Deposit (row 25)
            rows[25].values[col] = deposits > 0 ? cash / deposits : 0;
            
            // Loans/Deposits (row 26)
            rows[26].values[col] = deposits > 0 ? totalLoans / deposits : 0;
            
            // Total Loans/Networth (row 27)
            rows[27].values[col] = netWorth > 0 ? totalLoans / netWorth : 0;
            
            // PPE/Networth (row 28)
            rows[28].values[col] = netWorth > 0 ? ppe / netWorth : 0;
        }

        return rows;
    }

    // ---------- RENDER TABLE ----------
    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        let html = '';
        const rows = data || getEmptyRows();

        rows.forEach(item => {
            if (item.isSection) {
                html += `<tr class="section-header"><td colspan="8"><i class="fas fa-${item.icon || 'folder-open'}"></i> ${item.label}</td></tr>`;
                return;
            }

            let rowClass = '';
            if (item.totalRow) rowClass = 'total-row';
            else if (item.surplusRow) rowClass = 'surplus-row';

            let labelHtml = item.label;
            if (item.icon) {
                labelHtml = `<i class="fas fa-${item.icon}" style="margin-right:4px;color:#2b6e4f;"></i> ${labelHtml}`;
            }
            if (item.bold) labelHtml = `<strong>${labelHtml}</strong>`;

            let valueCells = '';
            if (item.values && item.values.length === 7) {
                item.values.forEach((val) => {
                    const displayVal = (val !== undefined && val !== null && String(val).trim() !== '') ? 
                        formatNumber(val) : '<span class="empty-cell">—</span>';
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
        // Data building
        getEmptyRows: getEmptyRows,
        buildTableDataFromValues: buildTableDataFromValues,
        calculateDerivedRows: calculateDerivedRows,
        
        // Rendering
        renderTable: renderTable,
        formatNumber: formatNumber,
        
        // Date utilities
        getWeekDatesFromEnding: getWeekDatesFromEnding,
        updateColumnHeadersWithDates: updateColumnHeadersWithDates,
        updateWeekEnding: updateWeekEnding,
        formatDateHeader: formatDateHeader,
        formatWeekEnding: formatWeekEnding,
        setDefaultDate: setDefaultDate,
        
        // Headings
        HEADINGS: HEADINGS,
        HEADING_TO_ROW_MAP: HEADING_TO_ROW_MAP
    };

})();
