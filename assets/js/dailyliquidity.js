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

    let currentData = [];
    let uploadedData = null;
    let uploadedHeaders = null;
    let uploadedWeekEnding = null;

    // ---------- GET WEEK DATES (Thursday to Wednesday) ----------
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

    // ---------- UPDATE COLUMN HEADERS WITH DATES ----------
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

    // ---------- UPDATE WEEK ENDING DISPLAY ----------
    function updateWeekEnding(weekEnding) {
        const displays = document.querySelectorAll('#weekEndingDisplay, #footerWeekEnding');
        displays.forEach(el => {
            if (el) el.textContent = weekEnding;
        });
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

    // ---------- HANDLE DATE CHANGE ----------
    function handleDateChange() {
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            updateColumnHeadersWithDates(datePicker.value);
            renderTable(currentData.length > 0 ? currentData : LIQUIDITY_DATA);
        }
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

    // ---------- UPLOAD MODAL ----------
    function setupUploadModal() {
        const uploadBtn = document.getElementById('uploadBtn');
        const modal = document.getElementById('uploadModal');
        const overlay = document.getElementById('uploadModalOverlay');
        const closeBtn = document.getElementById('uploadModalClose');
        const cancelBtn = document.getElementById('uploadCancelBtn');
        const confirmBtn = document.getElementById('uploadConfirmBtn');
        const fileInput = document.getElementById('uploadFileInput');
        const fileArea = document.getElementById('uploadFileArea');
        const fileInfo = document.getElementById('uploadFileInfo');
        const fileName = document.getElementById('uploadFileName');
        const fileRemove = document.getElementById('uploadFileRemove');
        const preview = document.getElementById('uploadPreview');
        const previewHead = document.getElementById('uploadPreviewHead');
        const previewBody = document.getElementById('uploadPreviewBody');
        const previewCount = document.getElementById('uploadPreviewCount');
        const uploadWeekEnding = document.getElementById('uploadWeekEnding');

        let selectedFile = null;
        let parsedPreviewData = null;

        // Open modal
        uploadBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
            // Set default date in modal
            const currentDate = document.getElementById('weekEndingDate').value;
            if (uploadWeekEnding) {
                uploadWeekEnding.value = currentDate || '';
            }
            // Reset state
            selectedFile = null;
            parsedPreviewData = null;
            fileInput.value = '';
            fileInfo.style.display = 'none';
            preview.style.display = 'none';
            confirmBtn.disabled = true;
            // Reset file area
            fileArea.style.display = 'block';
        });

        // Close modal functions
        function closeModal() {
            modal.style.display = 'none';
        }

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });

        // File selection via click
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files.length > 0) {
                handleFileSelect(this.files[0]);
            }
        });

        // File selection via drag and drop
        fileArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        fileArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        fileArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Remove file
        fileRemove.addEventListener('click', function() {
            selectedFile = null;
            parsedPreviewData = null;
            fileInput.value = '';
            fileInfo.style.display = 'none';
            preview.style.display = 'none';
            fileArea.style.display = 'block';
            confirmBtn.disabled = true;
        });

        // Handle file selection
        function handleFileSelect(file) {
            selectedFile = file;
            fileName.textContent = file.name;
            fileInfo.style.display = 'flex';
            fileArea.style.display = 'none';
            
            // Parse and preview file
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    let parsedData = null;
                    let headers = null;

                    // Try JSON
                    try {
                        const json = JSON.parse(content);
                        if (json.data && Array.isArray(json.data)) {
                            parsedData = json.data;
                            headers = json.headers || null;
                            if (json.weekEnding) {
                                uploadedWeekEnding = json.weekEnding;
                            }
                        } else if (Array.isArray(json)) {
                            parsedData = json;
                        }
                    } catch (jsonErr) {
                        // Try CSV
                        const lines = content.split('\n').filter(line => line.trim() !== '');
                        if (lines.length > 1) {
                            const headerRow = lines[0].split(',').map(h => h.trim());
                            headers = headerRow;
                            parsedData = lines.slice(1).map(line => {
                                const cols = line.split(',').map(c => c.trim());
                                if (cols.length >= 8) {
                                    return {
                                        label: cols[0],
                                        values: cols.slice(1, 8),
                                        bold: false
                                    };
                                }
                                return null;
                            }).filter(item => item !== null);
                        }
                    }

                    if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                        parsedPreviewData = parsedData;
                        uploadedHeaders = headers;
                        showPreview(parsedData, headers);
                        confirmBtn.disabled = false;
                    } else {
                        showToast('Could not parse file. Please check the format.', 'error');
                        confirmBtn.disabled = true;
                    }
                } catch (err) {
                    showToast('Error reading file: ' + err.message, 'error');
                    confirmBtn.disabled = true;
                }
            };
            reader.readAsText(file);
        }

        // Show preview
        function showPreview(data, headers) {
            preview.style.display = 'block';
            previewCount.textContent = data.length + ' rows';

            // Build header
            let headHtml = '<tr><th>Description</th>';
            const weekDates = getWeekDatesFromEnding(uploadWeekEnding.value || document.getElementById('weekEndingDate').value);
            const dayNames = weekDates.map(d => formatDateHeader(d));
            for (let i = 0; i < 7; i++) {
                headHtml += `<th>${headers && headers[i] ? headers[i] : dayNames[i] || 'Day ' + (i+1)}</th>`;
            }
            headHtml += '</tr>';
            previewHead.innerHTML = headHtml;

            // Build body (show first 5 rows)
            let bodyHtml = '';
            const previewRows = data.slice(0, 5);
            previewRows.forEach(item => {
                bodyHtml += '<tr>';
                bodyHtml += `<td><strong>${item.label || ''}</strong></td>`;
                if (item.values && item.values.length === 7) {
                    item.values.forEach(val => {
                        bodyHtml += `<td>${val || '—'}</td>`;
                    });
                }
                bodyHtml += '</tr>';
            });
            if (data.length > 5) {
                bodyHtml += `<tr><td colspan="8" style="text-align:center;color:#94a3b8;font-style:italic;">... and ${data.length - 5} more rows</td></tr>`;
            }
            previewBody.innerHTML = bodyHtml;
        }

        // Confirm upload
        confirmBtn.addEventListener('click', function() {
            if (!parsedPreviewData || parsedPreviewData.length === 0) {
                showToast('No data to upload.', 'error');
                return;
            }

            // Get week ending from modal
            const weekEnding = uploadWeekEnding.value || document.getElementById('weekEndingDate').value;
            
            // Update headers if provided
            if (uploadedHeaders && uploadedHeaders.length === 7) {
                for (let i = 1; i <= 7; i++) {
                    const col = document.getElementById('col' + i);
                    if (col) col.textContent = uploadedHeaders[i - 1];
                }
            } else {
                // Update with dates
                updateColumnHeadersWithDates(weekEnding);
            }

            // Update week ending display
            if (uploadedWeekEnding) {
                updateWeekEnding(uploadedWeekEnding);
            } else {
                const weekDates = getWeekDatesFromEnding(weekEnding);
                const lastDay = weekDates[weekDates.length - 1];
                updateWeekEnding(formatWeekEnding(lastDay));
            }

            // Update date picker
            const datePicker = document.getElementById('weekEndingDate');
            if (datePicker && weekEnding) {
                const date = new Date(weekEnding);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    datePicker.value = year + '-' + month + '-' + day;
                }
            }

            // Render the uploaded data
            renderTable(parsedPreviewData);
            
            // Close modal
            closeModal();
            showToast('✅ Data uploaded successfully!', 'success');
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
        
        const defaultDate = setDefaultDate();
        updateColumnHeadersWithDates(defaultDate);
        renderTable(LIQUIDITY_DATA);
        setupUploadModal();
        
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            datePicker.addEventListener('change', handleDateChange);
        }
    };

    // For console/testing
    window.updateLiquidityHeaders = updateColumnHeadersWithDates;
    window.updateLiquidityWeekEnding = updateWeekEnding;
    window.renderLiquidityTable = renderTable;
    window.showLiquidityToast = showToast;

})();
