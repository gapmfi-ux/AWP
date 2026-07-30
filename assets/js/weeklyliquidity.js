/**
 * Weekly Liquidity Module - Client Side
 * Handles tab switching, data loading, and display
 */

(function() {
    'use strict';

    let isInitialized = false;
    let currentWeekData = null;
    let currentWeeklyReportData = null;
    let currentDates = [];

    // ============================================
    // INITIALIZATION
    // ============================================

    window.initWeeklyLiquidityModule = function() {
        if (isInitialized) {
            console.log('Weekly Liquidity already initialized');
            return;
        }
        
        console.log('Initializing Weekly Liquidity Module');
        
        // Set default date
        const defaultDate = setDefaultWeekDate();
        
        // Load data for the week
        loadWeeklyData(defaultDate);
        
        isInitialized = true;
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('Weekly Liquidity Module initialized.');
    };

    // ============================================
    // DATE HELPERS
    // ============================================

    function setDefaultWeekDate() {
        const today = new Date();
        // Get the current week ending (Wednesday)
        const dayOfWeek = today.getDay();
        const diffToWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
        const wednesday = new Date(today);
        wednesday.setDate(today.getDate() + diffToWednesday);
        
        const dateStr = formatDateInput(wednesday);
        
        const datePicker = document.getElementById('weeklyWeekEndingDate');
        if (datePicker) {
            datePicker.value = dateStr;
        }
        
        const footer = document.getElementById('weeklyFooterDate');
        if (footer) {
            footer.textContent = formatDateDisplay(dateStr);
        }
        
        return dateStr;
    }

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function formatDateDisplay(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    // ============================================
    // TAB SWITCHING
    // ============================================

    window.switchWeeklyTab = function(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.weekly-tab-content').forEach(function(el) {
            el.classList.remove('active');
        });
        
        // Show selected tab
        const target = document.getElementById(tabName + 'Content');
        if (target) {
            target.classList.add('active');
        }
        
        // Update tab buttons
        document.querySelectorAll('.weekly-tab').forEach(function(btn) {
            btn.classList.remove('active');
        });
        
        const activeTab = document.querySelector('.weekly-tab[data-tab="' + tabName + '"]');
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Load content if needed
        if (tabName === 'weeklyReport') {
            loadWeeklyReport();
        } else if (tabName === 'dailyTable') {
            loadDailyTable();
        }
    };

    // ============================================
    // LOAD DAILY TABLE
    // ============================================

    function loadDailyTable() {
        const container = document.getElementById('dailyLiquidityTableContainer');
        if (!container) return;
        
        const datePicker = document.getElementById('weeklyWeekEndingDate');
        const weekEnding = datePicker ? datePicker.value : '';
        
        if (!weekEnding) {
            container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No date selected</p></div>';
            return;
        }
        
        // Use the existing LiquidityTable to render
        if (window.LiquidityTable && typeof window.LiquidityTable.renderTableWithWeekEnding === 'function') {
            window.LiquidityTable.renderTableWithWeekEnding(weekEnding, container);
        } else {
            // Fallback: use the existing render function
            container.innerHTML = '<div class="loading-report"><div class="loading-spinner-inline"></div><p>Loading daily table...</p></div>';
            
            // Use the existing API to load data
            if (window.API && typeof window.API.loadLiquidityData === 'function') {
                window.API.loadLiquidityData(weekEnding)
                    .then(function(result) {
                        if (result && result.success && result.allRows && result.allRows.length > 0) {
                            // Build table data
                            if (window.LiquidityTable && typeof window.LiquidityTable.buildTableDataFromRows === 'function') {
                                const tableData = window.LiquidityTable.buildTableDataFromRows(result.allRows, weekEnding);
                                // Store dates for use in weekly report
                                currentDates = tableData ? tableData.dates || [] : [];
                                // Render using LiquidityTable
                                window.LiquidityTable.renderTable(tableData);
                                // Copy the rendered content
                                const tableWrapper = document.querySelector('.liquidity-table-wrapper');
                                if (tableWrapper) {
                                    container.innerHTML = tableWrapper.innerHTML;
                                }
                            }
                        } else {
                            container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No data available for this week</p></div>';
                        }
                    })
                    .catch(function(error) {
                        console.error('Error loading daily data:', error);
                        container.innerHTML = '<div class="error-report"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ' + error.message + '</p></div>';
                    });
            }
        }
    }

    // ============================================
    // GET DATES FROM DAILY TABLE HEADERS
    // ============================================

    function getWeekDatesFromTable() {
        // Try to get dates from the daily table if already rendered
        const tableHeaders = document.querySelectorAll('#dailyLiquidityTableContainer th');
        const dates = [];
        
        // Skip the first header (Description)
        for (let i = 1; i < tableHeaders.length; i++) {
            const headerText = tableHeaders[i].textContent.trim();
            // Try to parse as date
            try {
                const d = new Date(headerText);
                if (!isNaN(d.getTime())) {
                    dates.push(formatDateInput(d));
                } else {
                    dates.push(headerText);
                }
            } catch (e) {
                dates.push(headerText);
            }
        }
        
        // If we have dates from the table, use them
        if (dates.length > 0) {
            return dates;
        }
        
        // Otherwise, compute the week dates
        const datePicker = document.getElementById('weeklyWeekEndingDate');
        const weekEnding = datePicker ? datePicker.value : '';
        
        if (weekEnding) {
            const endDate = new Date(weekEnding);
            const dates = [];
            // Get 7 days ending on the week ending date
            for (let i = 6; i >= 0; i--) {
                const d = new Date(endDate);
                d.setDate(endDate.getDate() - i);
                dates.push(formatDateInput(d));
            }
            return dates;
        }
        
        return [];
    }

    // ============================================
    // LOAD WEEKLY REPORT
    // ============================================

    function loadWeeklyReport() {
        const container = document.getElementById('weeklyReportTableContainer');
        if (!container) return;
        
        const datePicker = document.getElementById('weeklyWeekEndingDate');
        const weekEnding = datePicker ? datePicker.value : '';
        
        if (!weekEnding) {
            container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No date selected</p></div>';
            return;
        }
        
        container.innerHTML = '<div class="loading-report"><div class="loading-spinner-inline"></div><p>Generating weekly report...</p></div>';
        
        // Get the week dates for column headers
        const weekDates = getWeekDatesFromTable();
        
        // Call the server-side function to get weekly report data
        if (window.API && typeof window.API.getWeeklyLiquidityReport === 'function') {
            window.API.getWeeklyLiquidityReport(weekEnding)
                .then(function(result) {
                    if (result && result.success) {
                        currentWeeklyReportData = result;
                        // Override the dates with the ones from the daily table
                        if (weekDates.length === 7) {
                            result.dates = weekDates;
                        }
                        renderWeeklyReport(result);
                    } else {
                        const errorMsg = result && result.error ? result.error : 'Failed to generate report';
                        container.innerHTML = '<div class="error-report"><i class="fas fa-exclamation-circle"></i><p>' + errorMsg + '</p></div>';
                    }
                })
                .catch(function(error) {
                    console.error('Error loading weekly report:', error);
                    container.innerHTML = '<div class="error-report"><i class="fas fa-exclamation-circle"></i><p>Error loading report: ' + error.message + '</p></div>';
                });
        } else {
            // Fallback: use locally computed data
            loadWeeklyReportFromLiquidityData(weekEnding);
        }
    }

    function loadWeeklyReportFromLiquidityData(weekEnding) {
        const container = document.getElementById('weeklyReportTableContainer');
        if (!container) return;
        
        if (window.API && typeof window.API.loadLiquidityData === 'function') {
            window.API.loadLiquidityData(weekEnding)
                .then(function(result) {
                    if (result && result.success && result.allRows && result.allRows.length > 0) {
                        // Compute the weekly report locally
                        const weekDates = getWeekDatesFromTable();
                        const reportData = computeWeeklyReport(result.allRows, weekEnding, weekDates);
                        renderWeeklyReport(reportData);
                    } else {
                        container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No data available for this week</p></div>';
                    }
                })
                .catch(function(error) {
                    console.error('Error loading data for report:', error);
                    container.innerHTML = '<div class="error-report"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ' + error.message + '</p></div>';
                });
        }
    }

    // ============================================
    // COMPUTE WEEKLY REPORT FROM LIQUIDITY DATA
    // ============================================

    function computeWeeklyReport(allRows, weekEnding, weekDates) {
        // Define the report structure
        var reportStructure = {
            'DEPOSIT LIABILITIES': {
                type: 'section',
                children: {
                    'Savings Accounts': {
                        type: 'sum',
                        accounts: ['Savings Account', 'Savings Trust Account', 'GAP Kiddie Account', 'Staff Salary Account']
                    },
                    'Term Deposits': {
                        type: 'single',
                        account: 'GAP Fixed Term Deposit'
                    },
                    'Demand Deposit': {
                        type: 'sum',
                        accounts: ['Susu Account', 'Susu Trust Account']
                    },
                    'Other Deposits': {
                        type: 'single',
                        account: 'Other Deposits'
                    },
                    'Total Deposits': {
                        type: 'total',
                        children: ['Savings Accounts', 'Term Deposits', 'Demand Deposit', 'Other Deposits']
                    }
                }
            },
            'ACTUAL PRIMARY RESERVE ASSETS': {
                type: 'section',
                children: {
                    'Cash on Hand': {
                        type: 'single',
                        account: 'Head Office Vault'
                    },
                    'Balances with Universal Banks (Current Accounts)': {
                        type: 'sum',
                        accounts: ['CalBank', 'Unibank - Current Account', 'Fidelity Bank', 'Fidelity Bank - Call Account', 'CBG - Call Account', 'Ecobank', 'GCB']
                    },
                    'Current Account With ARB Apex Bank': {
                        type: 'single',
                        account: 'ARB Apex Bank'
                    },
                    'Call Deposits at Universal Banks': {
                        type: 'single',
                        account: 'Call Deposits'
                    },
                    'ARB Apex Bank Certificate of Deposit': {
                        type: 'single',
                        account: 'ARB Apex Bank CD'
                    },
                    '5% Deposit with ARB Apex Bank': {
                        type: 'single',
                        account: 'ARB Apex Bank 5%'
                    },
                    'Any Other Designated Reserve Eligible Asset': {
                        type: 'single',
                        account: 'Dalex Finance'
                    },
                    'Total Primary Reserve Assets': {
                        type: 'total',
                        children: ['Cash on Hand', 'Balances with Universal Banks (Current Accounts)', 'Current Account With ARB Apex Bank', 'Call Deposits at Universal Banks', 'ARB Apex Bank Certificate of Deposit', '5% Deposit with ARB Apex Bank', 'Any Other Designated Reserve Eligible Asset']
                    }
                }
            },
            'ACTUAL SECONDARY RESERVE ASSETS': {
                type: 'section',
                children: {
                    'Treasury Bills/Notes': {
                        type: 'sum',
                        accounts: ['GOG Treasury Bills - CBG', 'GOG Treasury Bills - Fidelity', 'GOG Treasury Bills - Ecobank', 'GOG Treasury Bills- Cal Bank']
                    },
                    'BOG Bills': {
                        type: 'single',
                        account: 'BOG Bills'
                    },
                    'BOG Notes/Bonds': {
                        type: 'single',
                        account: 'BOG Notes'
                    },
                    'Govt Loan Stock/Bonds': {
                        type: 'single',
                        account: 'Govt Loan Stock'
                    },
                    'Other Investment With Universal Banks': {
                        type: 'single',
                        account: 'CBG - Fixed Deposit'
                    },
                    'Total Secondary Reserve Assets': {
                        type: 'total',
                        children: ['Treasury Bills/Notes', 'BOG Bills', 'BOG Notes/Bonds', 'Govt Loan Stock/Bonds', 'Other Investment With Universal Banks']
                    }
                }
            }
        };

        // Get the column indices from the headers
        var headers = allRows[0] || [];
        
        // Build a map of account name to column index
        var accountMap = {};
        headers.forEach(function(header, index) {
            if (header && typeof header === 'string') {
                accountMap[header.trim()] = index;
            }
        });

        // Process each row to extract the values for each day
        var accountValues = {};

        // Initialize account values object
        var allAccounts = [];
        for (var sectionName in reportStructure) {
            var section = reportStructure[sectionName];
            for (var childName in section.children) {
                var childDef = section.children[childName];
                if (childDef.type === 'single') {
                    allAccounts.push(childDef.account);
                } else if (childDef.type === 'sum') {
                    childDef.accounts.forEach(function(acc) {
                        allAccounts.push(acc);
                    });
                }
            }
        }

        // Also add accounts that might be in the sheet
        for (var headerName in accountMap) {
            allAccounts.push(headerName);
        }

        // Initialize account values
        allAccounts.forEach(function(acc) {
            accountValues[acc] = {};
        });

        // Process each row
        for (var i = 1; i < allRows.length; i++) {
            var row = allRows[i];
            if (!row || row.length === 0) continue;
            
            var dateValue = row[0];
            var dateStr = '';
            
            if (dateValue instanceof Date) {
                dateStr = formatDateInput(dateValue);
            } else if (typeof dateValue === 'string') {
                try {
                    var d = new Date(dateValue);
                    if (!isNaN(d.getTime())) {
                        dateStr = formatDateInput(d);
                    }
                } catch (e) {}
            }
            
            if (!dateStr) continue;
            
            // Extract values for each account
            for (var acc in accountMap) {
                var colIdx = accountMap[acc];
                if (colIdx !== undefined && colIdx < row.length) {
                    accountValues[acc][dateStr] = parseFloat(row[colIdx]) || 0;
                }
            }
        }

        // Use the provided week dates or compute from available data
        var dates = weekDates && weekDates.length === 7 ? weekDates : [];
        if (dates.length === 0) {
            var availableDates = Object.keys(accountValues[Object.keys(accountValues)[0]] || {}).sort();
            // Try to find 7 consecutive days ending on weekEnding
            var endDate = new Date(weekEnding);
            for (var d = 6; d >= 0; d--) {
                var date = new Date(endDate);
                date.setDate(endDate.getDate() - d);
                var dateStr = formatDateInput(date);
                dates.push(dateStr);
            }
        }

        // Build the report data
        var reportData = {
            weekEnding: weekEnding,
            dates: dates,
            rows: {}
        };

        // Helper function to get value for an account on a specific date
        function getAccountValue(accountName, date) {
            if (accountValues[accountName] && accountValues[accountName][date] !== undefined) {
                return accountValues[accountName][date];
            }
            return 0;
        }

        // Helper function to compute sum of multiple accounts
        function computeSum(accountNames, date) {
            var total = 0;
            accountNames.forEach(function(name) {
                total += getAccountValue(name, date);
            });
            return total;
        }

        // Process each section
        for (var secName in reportStructure) {
            var section = reportStructure[secName];
            reportData.rows[secName] = {
                type: 'section',
                children: {}
            };

            for (var childKey in section.children) {
                var childDef = section.children[childKey];
                var values = {};
                var totalValue = 0;

                dates.forEach(function(date) {
                    var value = 0;
                    if (childDef.type === 'single') {
                        value = getAccountValue(childDef.account, date);
                    } else if (childDef.type === 'sum') {
                        value = computeSum(childDef.accounts, date);
                    } else if (childDef.type === 'total') {
                        // Compute total from its children
                        childDef.children.forEach(function(childKey2) {
                            if (section.children[childKey2]) {
                                var childDef2 = section.children[childKey2];
                                if (childDef2.type === 'single') {
                                    value += getAccountValue(childDef2.account, date);
                                } else if (childDef2.type === 'sum') {
                                    value += computeSum(childDef2.accounts, date);
                                }
                            }
                        });
                    }
                    values[date] = value;
                    totalValue += value;
                });

                // Calculate average
                var avgValue = dates.length > 0 ? totalValue / dates.length : 0;

                reportData.rows[secName].children[childKey] = {
                    type: childDef.type,
                    values: values,
                    average: avgValue,
                    total: totalValue
                };
            }
        }

        return reportData;
    }

    // ============================================
    // RENDER WEEKLY REPORT
    // ============================================

    function renderWeeklyReport(reportData) {
        var container = document.getElementById('weeklyReportTableContainer');
        if (!container) return;

        if (!reportData || !reportData.rows || !reportData.dates || reportData.dates.length === 0) {
            container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No data available for the selected week</p></div>';
            return;
        }

        var dates = reportData.dates;
        var weekEnding = reportData.weekEnding;

        // Format date headers (short day names)
        var dateHeaders = dates.map(function(date) {
            try {
                var d = new Date(date + 'T00:00:00');
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            } catch (e) {
                return date;
            }
        });

        // Build the table HTML
        var html = '<div class="weekly-report-table-wrapper"><table class="weekly-report-table">';
        
        // Header row
        html += '<thead><tr>';
        html += '<th style="text-align:left; padding-left:10px; min-width:220px;">Description</th>';
        dateHeaders.forEach(function(date) {
            html += '<th>' + date + '</th>';
        });
        html += '<th>Average</th>';
        html += '</tr></thead>';
        
        html += '<tbody>';

        // Process each section
        for (var sectionName in reportData.rows) {
            var section = reportData.rows[sectionName];
            
            // Section header
            html += '<tr class="section-header">';
            html += '<td colspan="' + (dates.length + 2) + '"><i class="fas fa-folder-open"></i> ' + sectionName + '</td>';
            html += '</tr>';

            for (var childName in section.children) {
                var child = section.children[childName];
                var isTotal = child.type === 'total';
                
                var rowClass = isTotal ? 'total-row' : '';
                
                html += '<tr class="' + rowClass + '">';
                
                // Row label
                var label = childName;
                if (isTotal) {
                    label = '<strong>' + childName + '</strong>';
                }
                html += '<td class="row-label">' + label + '</td>';

                var rowTotal = 0;
                var validCount = 0;

                dates.forEach(function(date) {
                    var value = child.values[date] || 0;
                    rowTotal += value;
                    validCount++;
                    
                    var formattedValue = formatCurrency(value);
                    var className = 'numeric';
                    if (value < 0) className += ' negative';
                    else if (value > 0) className += ' positive';
                    
                    html += '<td class="' + className + '">' + formattedValue + '</td>';
                });

                // Average column
                var avgValue = validCount > 0 ? rowTotal / validCount : 0;
                html += '<td class="numeric">' + formatCurrency(avgValue) + '</td>';
                html += '</tr>';
            }
        }

        // Grand Total row - sum all total rows
        html += '<tr class="grand-total-row">';
        html += '<td class="row-label"><strong>GRAND TOTAL</strong></td>';
        
        // Calculate grand total per day
        var totalRows = {};
        dates.forEach(function(date) { totalRows[date] = 0; });
        
        for (var secName2 in reportData.rows) {
            var section2 = reportData.rows[secName2];
            for (var childName2 in section2.children) {
                var child2 = section2.children[childName2];
                if (child2.type === 'total') {
                    dates.forEach(function(date) {
                        totalRows[date] += child2.values[date] || 0;
                    });
                }
            }
        }

        var grandTotalSum = 0;
        dates.forEach(function(date) {
            var val = totalRows[date] || 0;
            grandTotalSum += val;
            var formatted = formatCurrency(val);
            html += '<td class="numeric">' + formatted + '</td>';
        });

        var grandTotalAvg = dates.length > 0 ? grandTotalSum / dates.length : 0;
        html += '<td class="numeric">' + formatCurrency(grandTotalAvg) + '</td>';
        html += '</tr>';

        html += '</tbody></table></div>';

        // Update footer
        var footer = document.getElementById('weeklyFooterDate');
        if (footer) {
            footer.textContent = formatDateDisplay(weekEnding) + ' (Week)';
        }

        container.innerHTML = html;
    }

    // ============================================
    // FORMATTING HELPERS
    // ============================================

    function formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) return '0.00';
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // ============================================
    // LOAD WEEKLY DATA
    // ============================================

    function loadWeeklyData(weekEnding) {
        // Load both tabs
        loadDailyTable();
        loadWeeklyReport();
    }

    // ============================================
    // REFRESH
    // ============================================

    window.refreshWeeklyLiquidity = function() {
        var datePicker = document.getElementById('weeklyWeekEndingDate');
        var weekEnding = datePicker ? datePicker.value : '';
        
        if (weekEnding) {
            loadWeeklyData(weekEnding);
            showToast('Data refreshed', 'success');
        }
    };

    // ============================================
    // PRINT & EXPORT
    // ============================================

    window.printWeeklyReport = function() {
        window.print();
    };

    window.exportWeeklyReport = function() {
        var container = document.getElementById('weeklyReportTableContainer');
        if (!container) return;
        
        var table = container.querySelector('table');
        if (!table) {
            showToast('No data to export', 'warning');
            return;
        }
        
        // Extract CSV
        var csv = '';
        var rows = table.querySelectorAll('tr');
        rows.forEach(function(row) {
            var cells = row.querySelectorAll('th, td');
            var rowData = [];
            cells.forEach(function(cell) {
                var text = cell.textContent.trim();
                // Remove any HTML tags
                text = text.replace(/<[^>]*>/g, '').trim();
                if (text.includes(',')) {
                    text = '"' + text + '"';
                }
                rowData.push(text);
            });
            csv += rowData.join(',') + '\n';
        });
        
        // Download
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Weekly_Liquidity_Report.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        
        showToast('Report exported successfully', 'success');
    };

    // ============================================
    // TOAST MESSAGES
    // ============================================

    function showToast(message, type) {
        var toast = document.getElementById('weeklyToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'weeklyToast';
            toast.style.cssText = `
                position: fixed; bottom: 20px; right: 20px;
                padding: 10px 20px; border-radius: 8px;
                z-index: 9999; font-weight: 600; font-size: 13px;
                max-width: 380px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease; transform: translateY(20px); opacity: 0;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }

        var colors = {
            success: { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
            error: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
            info: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' },
            warning: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' }
        };
        var style = colors[type] || colors.info;

        toast.style.background = style.bg;
        toast.style.color = style.color;
        toast.style.borderLeft = '4px solid ' + style.border;
        toast.style.pointerEvents = 'auto';
        toast.textContent = message;
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';

        clearTimeout(toast._timer);
        toast._timer = setTimeout(function() {
            toast.style.transform = 'translateY(20px)';
            toast.style.opacity = '0';
        }, 3000);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    function setupEventListeners() {
        var datePicker = document.getElementById('weeklyWeekEndingDate');
        if (datePicker) {
            datePicker.addEventListener('change', function() {
                var weekEnding = this.value;
                if (weekEnding) {
                    loadWeeklyData(weekEnding);
                }
            });
        }
    }

    // ============================================
    // EXPOSE FUNCTIONS GLOBALLY
    // ============================================

    window.weeklyLiquidity = {
        init: window.initWeeklyLiquidityModule,
        refresh: window.refreshWeeklyLiquidity,
        switchTab: window.switchWeeklyTab,
        print: window.printWeeklyReport,
        export: window.exportWeeklyReport
    };

})();
