/**
 * Daily Liquidity Module - Enhanced Excel Upload & Trial Balance Integration
 * Handles uploading Excel files and importing data to Trial Balance sheet
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        SUPPORTED_FORMATS: ['xlsx', 'xls', 'csv'],
        CHUNK_SIZE: 100 * 1024, // 100KB for processing
        UPLOAD_TIMEOUT: 60000 // 60 seconds
    };

    // Empty table structure
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

    // State management
    let state = {
        currentData: [],
        isLoading: false,
        selectedFile: null,
        uploadProgress: 0,
        uploadAbortController: null
    };

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    function log(message, data = null) {
        console.log(`[Daily Liquidity] ${message}`, data || '');
    }

    function error(message, err = null) {
        console.error(`[Daily Liquidity] ERROR: ${message}`, err || '');
    }

    function showToast(message, type = 'info') {
        let toast = document.getElementById('liquidityToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'liquidityToast';
            toast.style.cssText = `
                position: fixed; bottom: 20px; right: 20px;
                padding: 12px 20px; border-radius: 8px;
                z-index: 9999; font-weight: 600; font-size: 13px;
                max-width: 380px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease; transform: translateY(20px); opacity: 0;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }

        const styles = {
            success: { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
            error: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
            warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
            info: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' }
        };
        const style = styles[type] || styles.info;

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

    function showLoadingModal(message = 'Processing...') {
        const modal = document.getElementById('loadingModal');
        const msg = document.getElementById('loadingMessage');
        if (modal) {
            modal.style.display = 'flex';
            if (msg) msg.textContent = message;
        }
        state.isLoading = true;
    }

    function hideLoadingModal() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            modal.style.display = 'none';
        }
        state.isLoading = false;
    }

    // ========================================
    // DATE UTILITIES
    // ========================================

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

    // ========================================
    // TABLE RENDERING
    // ========================================

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

    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            data = EMPTY_ROWS;
        }

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
        state.currentData = data;
    }

    // ========================================
    // FILE VALIDATION
    // ========================================

    function validateFile(file) {
        const errors = [];

        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            errors.push(`File size exceeds ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        }

        // Check file type
        const ext = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.SUPPORTED_FORMATS.includes(ext)) {
            errors.push(`Unsupported file format. Supported: ${CONFIG.SUPPORTED_FORMATS.join(', ')}`);
        }

        // Check file name
        if (!file.name || file.name.trim() === '') {
            errors.push('Invalid file name');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ========================================
    // EXCEL UPLOAD & IMPORT
    // ========================================

    function uploadToTrialBalance(weekEnding, fileData) {
        if (state.isLoading) {
            showToast('Upload already in progress', 'warning');
            return;
        }

        // Validate file
        const validation = validateFile(fileData);
        if (!validation.valid) {
            showToast(validation.errors.join('; '), 'error');
            return;
        }

        if (typeof API === 'undefined' || !API) {
            showToast('API not available', 'error');
            return;
        }

        const date = new Date(weekEnding);
        const formattedDate = date.toISOString().split('T')[0];

        showLoadingModal(`Uploading ${fileData.name} (${(fileData.size / 1024).toFixed(2)}KB)...`);
        log(`Starting upload: ${fileData.name} for week ${formattedDate}`);

        // Read file as base64
        const reader = new FileReader();
        
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                state.uploadProgress = Math.round((e.loaded / e.total) * 100);
                log(`Upload progress: ${state.uploadProgress}%`);
            }
        };

        reader.onload = function(e) {
            try {
                const base64Data = e.target.result.split(',')[1];

                if (!base64Data) {
                    throw new Error('Failed to encode file data');
                }

                log(`File encoded successfully (${base64Data.length} bytes)`);

                // Call API with timeout
                const uploadPromise = API.uploadExcelToTrialBalance({
                    base64: base64Data,
                    filename: fileData.name,
                    weekEnding: formattedDate
                });

                // Set timeout for upload
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Upload timeout')), CONFIG.UPLOAD_TIMEOUT)
                );

                Promise.race([uploadPromise, timeoutPromise])
                    .then(function(response) {
                        hideLoadingModal();
                        log('Upload response:', response);

                        if (response && response.success) {
                            showToast(`✅ Successfully uploaded ${fileData.name} and imported ${response.rowsImported || 0} rows`, 'success');
                            closeUploadModal();
                            
                            // Refresh table with imported data
                            setTimeout(() => {
                                importFromTrialBalance(formattedDate);
                            }, 500);
                        } else {
                            const errorMsg = response?.error || 'Unknown error occurred';
                            error(`Upload failed: ${errorMsg}`);
                            showToast(`Upload failed: ${errorMsg}`, 'error');
                        }
                    })
                    .catch(function(err) {
                        hideLoadingModal();
                        error('Upload error:', err);
                        showToast(`Upload error: ${err.message || 'Failed to upload file'}`, 'error');
                    });

            } catch (err) {
                hideLoadingModal();
                error('File processing error:', err);
                showToast(`Error processing file: ${err.message}`, 'error');
            }
        };

        reader.onerror = function() {
            hideLoadingModal();
            error('File read error');
            showToast('Failed to read file', 'error');
        };

        reader.readAsDataURL(fileData);
    }

    function importFromTrialBalance(weekEnding) {
        if (state.isLoading) return;

        if (typeof API === 'undefined' || !API) {
            showToast('API not available', 'error');
            return;
        }

        const date = new Date(weekEnding);
        const formattedDate = date.toISOString().split('T')[0];

        showLoadingModal('Importing data from Trial Balance...');
        log(`Importing data for week: ${formattedDate}`);

        API.importLiquidityFromTrialBalance(formattedDate)
            .then(function(response) {
                hideLoadingModal();
                log('Import response:', response);

                if (response && response.success) {
                    if (response.data && response.data.length > 0) {
                        renderTable(response.data);
                        showToast(`✅ Imported ${response.data.length} rows from Trial Balance`, 'success');
                    } else {
                        renderTable(EMPTY_ROWS);
                        showToast('No data found for week. Showing empty template.', 'info');
                    }
                } else {
                    renderTable(EMPTY_ROWS);
                    showToast(`Import failed: ${response?.error || 'Unknown error'}`, 'error');
                }
            })
            .catch(function(err) {
                hideLoadingModal();
                error('Import error:', err);
                renderTable(EMPTY_ROWS);
                showToast(`Import error: ${err.message}`, 'error');
            });
    }

    // ========================================
    // MODAL MANAGEMENT
    // ========================================

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

        // Open modal
        if (uploadBtn) {
            uploadBtn.addEventListener('click', function() {
                modal.style.display = 'flex';
                const currentDate = document.getElementById('weekEndingDate').value;
                if (uploadWeekEnding) {
                    uploadWeekEnding.value = currentDate || '';
                }
                statusDiv.style.display = 'none';
                state.selectedFile = null;
                confirmBtn.disabled = true;
                fileArea.style.display = 'block';
                fileInfo.style.display = 'none';
                fileInput.value = '';
                log('Upload modal opened');
            });
        }

        function closeUploadModal() {
            modal.style.display = 'none';
            statusDiv.style.display = 'none';
            confirmBtn.disabled = true;
            state.selectedFile = null;
            log('Upload modal closed');
        }

        // Close handlers
        if (closeBtn) closeBtn.addEventListener('click', closeUploadModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeUploadModal);
        if (overlay) overlay.addEventListener('click', closeUploadModal);

        // ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closeUploadModal();
            }
        });

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                e.stopPropagation();
                if (this.files && this.files.length > 0) {
                    handleFileSelect(this.files[0]);
                }
            });
        }

        // File area click
        if (fileArea) {
            fileArea.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    if (fileInput) fileInput.click();
                }
            });

            // Drag and drop
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
            const validation = validateFile(file);
            
            if (!validation.valid) {
                showToast(validation.errors.join('; '), 'error');
                return;
            }

            state.selectedFile = file;
            fileName.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            fileInfo.style.display = 'flex';
            fileArea.style.display = 'none';
            confirmBtn.disabled = false;
            log(`File selected: ${file.name} (${file.size} bytes)`);
        }

        // Remove file
        if (fileRemove) {
            fileRemove.addEventListener('click', function() {
                state.selectedFile = null;
                fileInput.value = '';
                fileInfo.style.display = 'none';
                fileArea.style.display = 'block';
                confirmBtn.disabled = true;
                log('File removed');
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

                if (!state.selectedFile) {
                    showToast('Please select a file to upload', 'error');
                    return;
                }

                uploadToTrialBalance(weekEnding, state.selectedFile);
            });
        }

        // Export close function
        window.closeUploadModal = closeUploadModal;
    }

    // ========================================
    // DATE CHANGE HANDLER
    // ========================================

    function handleDateChange() {
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            updateColumnHeadersWithDates(datePicker.value);
            // Auto-load data for selected date
            importFromTrialBalance(datePicker.value);
        }
    }

    // ========================================
    // MODULE INITIALIZATION
    // ========================================

    window.initDailyLiquidityModule = function() {
        log('Initializing Daily Liquidity Module');

        try {
            // Set default date
            const defaultDate = new Date();
            defaultDate.setHours(0, 0, 0, 0);
            const dayOfWeek = defaultDate.getDay();
            const diffToWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
            const wednesday = new Date(defaultDate);
            wednesday.setDate(defaultDate.getDate() + diffToWednesday);

            // Update UI with default date
            updateColumnHeadersWithDates(wednesday);
            renderTable(EMPTY_ROWS);

            // Setup upload modal
            setupUploadModal();

            // Setup date picker
            const datePicker = document.getElementById('weekEndingDate');
            if (datePicker) {
                datePicker.addEventListener('change', handleDateChange);
            }

            log('Module initialized successfully');
        } catch (err) {
            error('Module initialization failed:', err);
            showToast('Failed to initialize Daily Liquidity module', 'error');
        }
    };

    // Expose global functions
    window.importLiquidityData = importFromTrialBalance;
    window.uploadLiquidityFile = uploadToTrialBalance;
    window.renderLiquidityTable = renderTable;

})();
