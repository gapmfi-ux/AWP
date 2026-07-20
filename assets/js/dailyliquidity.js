// Daily Liquidity Module - Upload Excel to Trial Balance
(function() {
    'use strict';

    // ---------- EMPTY TABLE STRUCTURE ----------
    const EMPTY_ROWS = [
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
    let isLoading = false;
    let selectedFile = null;
    let parsedFileData = null;

    // ---------- GET WEEK DATES ----------
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

        if (!data || data.length === 0) {
            data = EMPTY_ROWS;
        }

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
        currentData = data;
    }

    // ---------- LOADING MODAL ----------
    function showLoadingModal(message) {
        const modal = document.getElementById('loadingModal');
        const msg = document.getElementById('loadingMessage');
        if (modal) {
            modal.style.display = 'flex';
            if (msg) msg.textContent = message || 'Loading data...';
        }
        isLoading = true;
    }

    function hideLoadingModal() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            modal.style.display = 'none';
        }
        isLoading = false;
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

    // ---------- PARSE FILE AND SHOW PREVIEW ----------
    function parseFileAndPreview(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    let parsedData = null;
                    let headers = null;
                    let rowData = [];

                    // Try JSON first
                    try {
                        const json = JSON.parse(content);
                        if (json.data && Array.isArray(json.data)) {
                            parsedData = json.data;
                            headers = json.headers || null;
                        } else if (Array.isArray(json)) {
                            parsedData = json;
                        }
                    } catch (jsonErr) {
                        // Try CSV
                        const text = new TextDecoder('utf-8').decode(content);
                        const lines = text.split('\n').filter(line => line.trim() !== '');
                        if (lines.length > 1) {
                            const headerRow = lines[0].split(',').map(h => h.trim());
                            headers = headerRow;
                            parsedData = lines.slice(1).map(line => {
                                const cols = line.split(',').map(c => c.trim());
                                if (cols.length >= 8) {
                                    return {
                                        label: cols[0] || '',
                                        values: cols.slice(1, 8).map(v => v || ''),
                                        bold: false
                                    };
                                }
                                return null;
                            }).filter(item => item !== null);
                        }
                    }

                    if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                        // Build preview rows
                        const previewRows = parsedData.slice(0, 5);
                        previewRows.forEach(function(item, index) {
                            if (item && !item.isSection) {
                                rowData.push({
                                    label: item.label || 'Row ' + (index + 1),
                                    values: item.values || ['', '', '', '', '', '', '']
                                });
                            }
                        });

                        resolve({
                            data: parsedData,
                            headers: headers || ['Description', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                            previewRows: rowData,
                            totalRows: parsedData.length,
                            isSectionData: parsedData.some(function(item) { return item.isSection; })
                        });
                    } else {
                        reject(new Error('Could not parse file. Please check the format.'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // ---------- SHOW PREVIEW IN MODAL ----------
    function showPreview(previewData) {
        const previewDiv = document.getElementById('uploadPreview');
        const previewHead = document.getElementById('uploadPreviewHead');
        const previewBody = document.getElementById('uploadPreviewBody');
        const previewCount = document.getElementById('uploadPreviewCount');

        if (!previewDiv) return;

        previewDiv.style.display = 'block';
        previewCount.textContent = previewData.totalRows + ' rows';

        // Build header
        let headHtml = '<tr>';
        previewData.headers.forEach(function(header) {
            headHtml += `<th>${header}</th>`;
        });
        headHtml += '</tr>';
        previewHead.innerHTML = headHtml;

        // Build body
        let bodyHtml = '';
        if (previewData.previewRows && previewData.previewRows.length > 0) {
            previewData.previewRows.forEach(function(item) {
                bodyHtml += '<tr>';
                bodyHtml += `<td><strong>${item.label || ''}</strong></td>`;
                if (item.values && item.values.length === 7) {
                    item.values.forEach(function(val) {
                        bodyHtml += `<td>${val || '—'}</td>`;
                    });
                } else {
                    for (var i = 0; i < 7; i++) {
                        bodyHtml += '<td>—</td>';
                    }
                }
                bodyHtml += '</tr>';
            });
        } else {
            bodyHtml += '<tr><td colspan="8" style="text-align:center;color:#94a3b8;font-style:italic;">No preview data available</td></tr>';
        }

        if (previewData.totalRows > 5) {
            bodyHtml += `<tr><td colspan="8" style="text-align:center;color:#94a3b8;font-style:italic;">... and ${previewData.totalRows - 5} more rows</td></tr>`;
        }
        previewBody.innerHTML = bodyHtml;
    }

    // ---------- UPLOAD TO TRIAL BALANCE ----------
    function uploadToTrialBalance(weekEnding, fileData) {
        if (isLoading) return;
        
        if (typeof API === 'undefined' || !API) {
            showToast('API not available. Cannot upload data.', 'error');
            return;
        }

        const date = new Date(weekEnding);
        const formattedDate = date.toISOString().split('T')[0];

        showLoadingModal('Uploading Excel to Trial Balance...');

        // Convert file to base64
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const base64 = e.target.result.split(',')[1];
                
                // Call API to upload Excel
                API.uploadExcelToTrialBalance({
                    base64: base64,
                    filename: fileData.name,
                    weekEnding: formattedDate
                })
                .then(function(response) {
                    hideLoadingModal();
                    
                    if (response && response.success) {
                        showToast('✅ Excel uploaded and imported to Trial Balance successfully!', 'success');
                        closeUploadModal();
                        // Refresh the table with imported data
                        importFromTrialBalance(formattedDate);
                    } else {
                        showToast('Error uploading: ' + (response?.error || 'Unknown error'), 'error');
                    }
                })
                .catch(function(error) {
                    hideLoadingModal();
                    console.error('Upload error:', error);
                    showToast('Error uploading: ' + error.message, 'error');
                });
            } catch (err) {
                hideLoadingModal();
                showToast('Error processing file: ' + err.message, 'error');
            }
        };
        
        reader.readAsDataURL(fileData);
    }

    // ---------- IMPORT FROM TRIAL BALANCE ----------
    function importFromTrialBalance(weekEnding) {
        if (isLoading) return;
        
        if (typeof API === 'undefined' || !API) {
            showToast('API not available. Cannot import data.', 'error');
            return;
        }

        const date = new Date(weekEnding);
        const formattedDate = date.toISOString().split('T')[0];

        showLoadingModal('Importing data from Trial Balance...');

        API.importLiquidityFromTrialBalance(formattedDate)
            .then(function(response) {
                hideLoadingModal();
                
                if (response && response.success) {
                    if (response.data && response.data.length > 0) {
                        renderTable(response.data);
                        showToast('✅ Imported ' + response.data.length + ' rows from Trial Balance', 'success');
                    } else {
                        renderTable(EMPTY_ROWS);
                        showToast('No data found for week ending ' + weekEnding, 'info');
                    }
                } else {
                    renderTable(EMPTY_ROWS);
                    showToast('Error importing data: ' + (response?.error || 'Unknown error'), 'error');
                }
            })
            .catch(function(error) {
                hideLoadingModal();
                console.error('Import error:', error);
                renderTable(EMPTY_ROWS);
                showToast('Error importing data: ' + error.message, 'error');
            });
    }

    // ---------- UPLOAD MODAL ----------
    function setupUploadModal() {
        const uploadBtn = document.getElementById('uploadBtn');
        const modal = document.getElementById('uploadModal');
        const overlay = document.getElementById('uploadModalOverlay');
        const closeBtn = document.getElementById('uploadModalClose');
        const cancelBtn = document.getElementById('uploadCancelBtn');
        const confirmBtn = document.getElementById('uploadConfirmBtn');
        const uploadWeekEnding = document.getElementById('uploadWeekEnding');
        const fileInput = document.getElementById('uploadFileInput');
        const fileArea = document.getElementById('uploadFileArea');
        const fileInfo = document.getElementById('uploadFileInfo');
        const fileName = document.getElementById('uploadFileName');
        const fileRemove = document.getElementById('uploadFileRemove');
        const statusDiv = document.getElementById('uploadStatus');
        const statusIcon = document.getElementById('uploadStatusIcon');
        const statusMessage = document.getElementById('uploadStatusMessage');

        // Open modal
        uploadBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
            const currentDate = document.getElementById('weekEndingDate').value;
            if (uploadWeekEnding) {
                uploadWeekEnding.value = currentDate || '';
            }
            statusDiv.style.display = 'none';
            document.getElementById('uploadPreview').style.display = 'none';
            selectedFile = null;
            parsedFileData = null;
            confirmBtn.disabled = true;
            fileArea.style.display = 'block';
            fileInfo.style.display = 'none';
            fileInput.value = '';
        });

        function closeUploadModal() {
            modal.style.display = 'none';
            statusDiv.style.display = 'none';
            confirmBtn.disabled = true;
            selectedFile = null;
            parsedFileData = null;
        }

        // Close modal functions
        if (closeBtn) closeBtn.addEventListener('click', closeUploadModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeUploadModal);
        if (overlay) overlay.addEventListener('click', closeUploadModal);

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeUploadModal();
            }
        });

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (this.files && this.files.length > 0) {
                    handleFileSelect(this.files[0]);
                }
            });
        }

        // Drag and drop
        if (fileArea) {
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
        }

        // Handle file selection
        function handleFileSelect(file) {
            selectedFile = file;
            fileName.textContent = file.name;
            fileInfo.style.display = 'flex';
            fileArea.style.display = 'none';
            confirmBtn.disabled = true;

            // Parse file and show preview
            parseFileAndPreview(file)
                .then(function(result) {
                    parsedFileData = result;
                    showPreview(result);
                    confirmBtn.disabled = false;
                    showToast('✅ File parsed successfully! ' + result.totalRows + ' rows found.', 'success');
                })
                .catch(function(err) {
                    showToast('Error parsing file: ' + err.message, 'error');
                    confirmBtn.disabled = true;
                    document.getElementById('uploadPreview').style.display = 'none';
                });
        }

        // Remove file
        if (fileRemove) {
            fileRemove.addEventListener('click', function() {
                selectedFile = null;
                parsedFileData = null;
                fileInput.value = '';
                fileInfo.style.display = 'none';
                fileArea.style.display = 'block';
                document.getElementById('uploadPreview').style.display = 'none';
                confirmBtn.disabled = true;
            });
        }

        // Confirm upload
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const weekEnding = uploadWeekEnding.value || document.getElementById('weekEndingDate').value;
                
                if (!weekEnding) {
                    showToast('Please select a week ending date', 'error');
                    return;
                }

                if (!selectedFile) {
                    showToast('Please select a file to upload', 'error');
                    return;
                }

                // Show status
                statusDiv.style.display = 'flex';
                statusIcon.className = 'upload-status-icon';
                statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                statusMessage.textContent = 'Uploading to Trial Balance...';
                confirmBtn.disabled = true;

                // Upload to Trial Balance
                uploadToTrialBalance(weekEnding, selectedFile);
            });
        }
    }

    // ---------- HANDLE DATE CHANGE ----------
    function handleDateChange() {
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            updateColumnHeadersWithDates(datePicker.value);
        }
    }

    // ---------- EXPORT GLOBALLY ----------
    window.initDailyLiquidityModule = function() {
        console.log('Initializing Daily Liquidity Module');
        
        const defaultDate = setDefaultDate();
        updateColumnHeadersWithDates(defaultDate);
        renderTable(EMPTY_ROWS);
        
        // Setup Upload Modal
        setupUploadModal();
        
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            datePicker.addEventListener('change', handleDateChange);
        }
    };

    // Expose functions for console/testing
    window.uploadLiquidityData = uploadToTrialBalance;
    window.renderLiquidityTable = renderTable;
    window.closeUploadModal = function() {
        const modal = document.getElementById('uploadModal');
        if (modal) modal.style.display = 'none';
    };

})();
