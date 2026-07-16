// Daily Liquidity Module
(function() {
    'use strict';

    // ---------- EMPTY DATA STRUCTURE ----------
    const LIQUIDITY_DATA = [
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
        { label: 'Surplus/(Deficit)*', values: ['', '', '', '', '', '', ''], negative: true },
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

    let currentData = [];

    // ---------- GET WEEK DATES ----------
    function getWeekDates() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        
        // Calculate Monday of this week
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMonday);
        
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
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

    // ---------- UPDATE COLUMN HEADERS WITH DATES ----------
    function updateColumnHeadersWithDates() {
        const weekDates = getWeekDates();
        const dayNames = weekDates.map(d => formatDateHeader(d));
        
        for (let i = 1; i <= 7; i++) {
            const col = document.getElementById('col' + i);
            if (col) col.textContent = dayNames[i - 1];
        }
        
        // Update week ending display
        const lastDay = weekDates[weekDates.length - 1];
        const weekEnding = formatWeekEnding(lastDay);
        updateWeekEnding(weekEnding);
        
        return dayNames;
    }

    // ---------- RENDER TABLE ----------
    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        let html = '';

        data.forEach(item => {
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
                    const displayVal = val && val.trim() !== '' ? val : '<span class="empty-cell">—</span>';
                    let cls = 'numeric';
                    if (item.positive && val && !isNaN(parseFloat(val.replace(/,/g,'')))) cls += ' positive';
                    if (item.negative && val && !isNaN(parseFloat(val.replace(/,/g,'')))) cls += ' negative';
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
        currentData = data;
    }

    // ---------- UPDATE WEEK ENDING DISPLAY ----------
    function updateWeekEnding(weekEnding) {
        const displays = document.querySelectorAll('#weekEndingDisplay, #footerWeekEnding');
        displays.forEach(el => {
            if (el) el.textContent = weekEnding;
        });
    }

    // ---------- UPLOAD HANDLER ----------
    function setupUpload() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        if (!uploadBtn || !fileInput) return;

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function(e) {
            const file = this.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const content = ev.target.result;
                    let parsedData = null;
                    let weekEnding = null;
                    let columnHeaders = null;

                    try {
                        const json = JSON.parse(content);
                        if (json.data && Array.isArray(json.data)) {
                            parsedData = json.data;
                            weekEnding = json.weekEnding || null;
                            columnHeaders = json.headers || null;
                        } else if (Array.isArray(json)) {
                            parsedData = json;
                        }
                    } catch (jsonErr) {
                        // Try CSV
                        const lines = content.split('\n').filter(line => line.trim() !== '');
                        if (lines.length > 1) {
                            const dataRows = lines.slice(1).map(line => {
                                const cols = line.split(',').map(c => c.trim());
                                return cols;
                            });
                            parsedData = dataRows.map(row => {
                                if (row.length >= 8) {
                                    return {
                                        label: row[0],
                                        values: row.slice(1, 8),
                                        bold: false
                                    };
                                }
                                return null;
                            }).filter(item => item !== null);
                        }
                    }

                    if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                        renderTable(parsedData);
                        if (weekEnding) updateWeekEnding(weekEnding);
                        if (columnHeaders && columnHeaders.length === 7) {
                            for (let i = 1; i <= 7; i++) {
                                const col = document.getElementById('col' + i);
                                if (col) col.textContent = columnHeaders[i - 1];
                            }
                        }
                        showToast('✅ Data uploaded successfully!', 'success');
                    } else {
                        showToast('Could not parse file. Use JSON with "data" array or CSV (label + 7 columns).', 'error');
                    }
                } catch (err) {
                    showToast('Error reading file: ' + err.message, 'error');
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    // ---------- TOAST MESSAGE ----------
    function showToast(message, type) {
        let toast = document.getElementById('liquidityToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'liquidityToast';
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

        const colors = {
            success: { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
            error: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
            info: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' }
        };
        const style = colors[type] || colors.info;

        toast.style.background = style.bg;
        toast.style.color = style.color;
        toast.style.borderLeft = `4px solid ${style.border}`;
        toast.style.pointerEvents = 'auto';
        toast.textContent = message;
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';

        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.transform = 'translateY(20px)';
            toast.style.opacity = '0';
        }, 3500);
    }

    // ---------- EXPORT GLOBALLY ----------
    window.initDailyLiquidityModule = function() {
        console.log('Initializing Daily Liquidity Module');
        updateColumnHeadersWithDates();
        renderTable(LIQUIDITY_DATA);
        setupUpload();
    };

    // For console/testing
    window.updateLiquidityHeaders = updateColumnHeadersWithDates;
    window.updateLiquidityWeekEnding = updateWeekEnding;
    window.renderLiquidityTable = renderTable;
    window.showLiquidityToast = showToast;

})();
