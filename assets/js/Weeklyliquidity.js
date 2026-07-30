// Weekly Liquidity Report - Core computation and population logic
(function() {
    'use strict';

    // ---------- WEEKLY REPORT ROW DEFINITIONS ----------
    // Based on the provided weekly report document
    const WEEKLY_ROWS = [
        { id: 'deposit_liabilities', label: 'DEPOSIT LIABILITIES', isSection: true, icon: 'bank' },
        { id: 'savings_accounts', label: 'Savings Accounts', computation: 'sum of Savings Account, Savings Trust Account, GAP Kiddie Account, Staff Salary Account' },
        { id: 'term_deposits', label: 'Term Deposits', computation: 'GAP Fixed Term Deposit' },
        { id: 'demand_deposit', label: 'Demand Deposit', computation: 'sum of Susu Account, Susu Trust Account' },
        { id: 'other_deposits', label: 'Other Deposits', computation: '' },
        { id: 'total_deposits', label: 'Total Deposits', bold: true, totalRow: true, icon: 'arrow-up' },
        { id: 'actual_primary_reserve', label: 'ACTUAL PRIMARY RESERVE ASSETS', isSection: true, icon: 'money-bill-wave' },
        { id: 'cash_on_hand', label: 'Cash on Hand', computation: 'Head Office Vault' },
        { id: 'balances_universal_banks', label: 'Balances with Universal Banks (Current Accounts)', computation: 'sum of CalBank, Unibank - Current Account, Fidelity Bank, Fidelity Bank - Call Account, CBG - Call Account, Ecobank, GCB' },
        { id: 'current_account_arb', label: 'Current Account With ARB Apex Bank (RCBs only)', computation: '' },
        { id: 'call_deposits_universal', label: 'Call Deposits at Universal Banks', computation: '' },
        { id: 'arb_apex_certificate', label: 'ARB Apex Bank Certificate of Deposit (RCBs only)', computation: '' },
        { id: 'arb_apex_deposit', label: '5% Deposit with ARB Apex Bank (RCBs only)', computation: '' },
        { id: 'other_designated_reserve', label: 'Any Other Designated Reserve Eligible Asset', computation: 'Dalex Finance' },
        { id: 'total_primary_reserve', label: 'Total Primary Reserve Assets', bold: true, totalRow: true, icon: 'check-circle' },
        { id: 'actual_secondary_reserve', label: 'ACTUAL SECONDARY RESERVE ASSETS', isSection: true, icon: 'chart-pie' },
        { id: 'treasury_bills', label: 'Treasury Bills/Notes', computation: 'sum of GOG Treasury Bills - CBG, GOG Treasury Bills - Fidelity, GOG Treasury Bills - Ecobank, GOG Treasury Bills- Cal Bank' },
        { id: 'bog_bills', label: 'BOG Bills', computation: '' },
        { id: 'bog_notes_bonds', label: 'BOG Notes/Bonds', computation: '' },
        { id: 'govt_loan_stock', label: 'Govt Loan Stock/Bonds', computation: '' },
        { id: 'other_investment_universal', label: 'Other Investment With Universal Banks', computation: 'CBG - Fixed Deposit' },
        { id: 'total_secondary_reserve', label: 'Total Secondary Reserve Assets', bold: true, totalRow: true, icon: 'check-circle' }
    ];

    // Mapping from Daily Liquidity headings to Weekly Report row IDs
    const HEADING_TO_WEEKLY_MAP = {
        'Savings Account': 'savings_accounts',
        'Savings Trust Account': 'savings_accounts',
        'GAP Kiddie Account': 'savings_accounts',
        'Staff Salary Account': 'savings_accounts',
        'GAP Fixed Term Deposit': 'term_deposits',
        'Susu Account': 'demand_deposit',
        'Susu Trust Account': 'demand_deposit',
        'Head Office Vault': 'cash_on_hand',
        'CalBank': 'balances_universal_banks',
        'Unibank - Current Account': 'balances_universal_banks',
        'Fidelity Bank': 'balances_universal_banks',
        'Fidelity Bank - Call Account': 'balances_universal_banks',
        'CBG - Call Account': 'balances_universal_banks',
        'Ecobank': 'balances_universal_banks',
        'GCB': 'balances_universal_banks',
        'Dalex Finance': 'other_designated_reserve',
        'GOG Treasury Bills - CBG': 'treasury_bills',
        'GOG Treasury Bills - Fidelity': 'treasury_bills',
        'GOG Treasury Bills - Ecobank': 'treasury_bills',
        'GOG Treasury Bills- Cal Bank': 'treasury_bills',
        'CBG - Fixed Deposit': 'other_investment_universal'
    };

    // ---------- GET EMPTY WEEKLY ROWS ----------
    function getEmptyWeeklyRows() {
        return WEEKLY_ROWS.map(row => ({
            ...row,
            values: ['', '', '', '', '', '', '']
        }));
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
            let parts = dateValue.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
            if (parts) {
                const d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
                if (!isNaN(d.getTime())) return d;
            }
            
            parts = dateValue.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
            if (parts) {
                const d = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
                if (!isNaN(d.getTime())) return d;
            }
            
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d;
        }
        
        return null;
    }

    function isEmptyValue(val) {
        return val === null || val === undefined || val === '' || val === '—';
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

    // ---------- BUILD WEEKLY REPORT DATA ----------
    function buildWeeklyReportData(dataRows, targetDate) {
        const tableData = getEmptyWeeklyRows();

        if (!dataRows || dataRows.length === 0) {
            return tableData;
        }

        // Get the week dates
        const weekDates = getWeekDatesFromEnding(targetDate);
        const weekDateKeys = weekDates.map(d => formatDateKey(d));

        console.log('Weekly Report - Week dates:', weekDateKeys);

        // Process each row of data
        let processedCount = 0;
        dataRows.forEach((rowValues, rowIndex) => {
            if (!rowValues || rowValues.length < 2) {
                return;
            }

            const dateValue = rowValues[0];
            const dateObj = parseDateFromValue(dateValue);
            
            if (!dateObj) {
                return;
            }

            const dateKey = formatDateKey(dateObj);
            
            // Find which column this date belongs to
            let colIndex = weekDateKeys.indexOf(dateKey);
            
            if (colIndex === -1) {
                return;
            }

            // Map values to weekly report rows for this date
            for (let i = 1; i < rowValues.length && i < window.LiquidityTable?.HEADINGS?.length; i++) {
                const heading = window.LiquidityTable.HEADINGS[i];
                const val = rowValues[i];
                
                if (heading && !isEmptyValue(val)) {
                    const rowId = HEADING_TO_WEEKLY_MAP[heading];
                    if (rowId) {
                        const rowIndex = tableData.findIndex(r => r.id === rowId);
                        if (rowIndex !== -1 && tableData[rowIndex]) {
                            const numVal = parseFloat(val) || 0;
                            if (numVal !== 0) {
                                const currentVal = parseFloat(tableData[rowIndex].values[colIndex]) || 0;
                                tableData[rowIndex].values[colIndex] = currentVal + numVal;
                            }
                        }
                    }
                }
            }
            processedCount++;
        });

        console.log('Weekly Report - Processed ' + processedCount + ' rows');

        // Calculate derived rows for ALL columns that have data
        for (let col = 0; col < 7; col++) {
            // Check if this column has any data
            let hasData = false;
            for (let row = 0; row < tableData.length; row++) {
                if (tableData[row].values && tableData[row].values[col]) {
                    const val = tableData[row].values[col];
                    if (val !== '' && val !== null && val !== undefined && val !== 0) {
                        hasData = true;
                        break;
                    }
                }
            }
            if (hasData) {
                calculateDerivedRowsForColumn(tableData, col);
            }
        }

        return tableData;
    }

    // ---------- CALCULATE DERIVED ROWS FOR A SPECIFIC COLUMN ----------
    function calculateDerivedRowsForColumn(tableData, colIndex) {
        const rows = tableData;
        
        // Get base values for the specific column
        const savingsAccounts = parseFloat(rows.find(r => r.id === 'savings_accounts')?.values[colIndex]) || 0;
        const termDeposits = parseFloat(rows.find(r => r.id === 'term_deposits')?.values[colIndex]) || 0;
        const demandDeposit = parseFloat(rows.find(r => r.id === 'demand_deposit')?.values[colIndex]) || 0;
        const otherDeposits = parseFloat(rows.find(r => r.id === 'other_deposits')?.values[colIndex]) || 0;

        const cashOnHand = parseFloat(rows.find(r => r.id === 'cash_on_hand')?.values[colIndex]) || 0;
        const balancesUniversal = parseFloat(rows.find(r => r.id === 'balances_universal_banks')?.values[colIndex]) || 0;
        const currentAccountArb = parseFloat(rows.find(r => r.id === 'current_account_arb')?.values[colIndex]) || 0;
        const callDepositsUniversal = parseFloat(rows.find(r => r.id === 'call_deposits_universal')?.values[colIndex]) || 0;
        const arbApexCertificate = parseFloat(rows.find(r => r.id === 'arb_apex_certificate')?.values[colIndex]) || 0;
        const arbApexDeposit = parseFloat(rows.find(r => r.id === 'arb_apex_deposit')?.values[colIndex]) || 0;
        const otherDesignatedReserve = parseFloat(rows.find(r => r.id === 'other_designated_reserve')?.values[colIndex]) || 0;

        const treasuryBills = parseFloat(rows.find(r => r.id === 'treasury_bills')?.values[colIndex]) || 0;
        const bogBills = parseFloat(rows.find(r => r.id === 'bog_bills')?.values[colIndex]) || 0;
        const bogNotesBonds = parseFloat(rows.find(r => r.id === 'bog_notes_bonds')?.values[colIndex]) || 0;
        const govtLoanStock = parseFloat(rows.find(r => r.id === 'govt_loan_stock')?.values[colIndex]) || 0;
        const otherInvestmentUniversal = parseFloat(rows.find(r => r.id === 'other_investment_universal')?.values[colIndex]) || 0;

        // Calculate Total Deposits
        const totalDeposits = savingsAccounts + termDeposits + demandDeposit + otherDeposits;
        const totalDepositsRow = rows.find(r => r.id === 'total_deposits');
        if (totalDepositsRow) {
            totalDepositsRow.values[colIndex] = totalDeposits;
        }

        // Calculate Total Primary Reserve Assets
        const totalPrimaryReserve = cashOnHand + balancesUniversal + currentAccountArb + 
                                    callDepositsUniversal + arbApexCertificate + arbApexDeposit + 
                                    otherDesignatedReserve;
        const totalPrimaryRow = rows.find(r => r.id === 'total_primary_reserve');
        if (totalPrimaryRow) {
            totalPrimaryRow.values[colIndex] = totalPrimaryReserve;
        }

        // Calculate Total Secondary Reserve Assets
        const totalSecondaryReserve = treasuryBills + bogBills + bogNotesBonds + govtLoanStock + otherInvestmentUniversal;
        const totalSecondaryRow = rows.find(r => r.id === 'total_secondary_reserve');
        if (totalSecondaryRow) {
            totalSecondaryRow.values[colIndex] = totalSecondaryReserve;
        }

        console.log('Weekly Report - Column ' + colIndex + ' derived values:', {
            totalDeposits,
            totalPrimaryReserve,
            totalSecondaryReserve
        });
    }

    // ---------- RENDER WEEKLY REPORT ----------
    function renderWeeklyReport(data) {
        const tbody = document.getElementById('weeklyTableBody');
        if (!tbody) return;
        
        let html = '';
        const rows = data || getEmptyWeeklyRows();

        rows.forEach((item) => {
            if (item.isSection) {
                html += `<tr class="section-header"><td colspan="8"><i class="fas fa-${item.icon || 'folder-open'}"></i> ${item.label}</td></tr>`;
                return;
            }

            let rowClass = '';
            if (item.totalRow) rowClass = 'total-row';
            
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
                        displayVal = formatNumber(val);
                    } else {
                        displayVal = '<span class="empty-cell">—</span>';
                    }
                    
                    let cls = 'numeric';
                    if (item.totalRow) cls += ' total';
                    
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
            const col = document.getElementById('weeklyCol' + i);
            if (col) col.textContent = dayNames[i - 1];
        }
    }

    // ---------- EXPOSE API ----------
    window.WeeklyLiquidity = {
        getEmptyWeeklyRows: getEmptyWeeklyRows,
        buildWeeklyReportData: buildWeeklyReportData,
        calculateDerivedRowsForColumn: calculateDerivedRowsForColumn,
        renderWeeklyReport: renderWeeklyReport,
        updateColumnHeadersWithDates: updateColumnHeadersWithDates,
        getWeekDatesFromEnding: getWeekDatesFromEnding,
        formatDateHeader: formatDateHeader,
        formatDateKey: formatDateKey,
        parseDateFromValue: parseDateFromValue,
        isEmptyValue: isEmptyValue,
        formatNumber: formatNumber,
        WEEKLY_ROWS: WEEKLY_ROWS,
        HEADING_TO_WEEKLY_MAP: HEADING_TO_WEEKLY_MAP
    };

    console.log('WeeklyLiquidity loaded successfully!');

})();
