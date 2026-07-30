// Daily Liquidity Module - UI, upload, and data loading
(function() {
    'use strict';

    let isLoading = false;
    let __dl_selectedFile = null;

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
            info: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' },
            warning: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' }
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

    // ---------- POPULATE TABLE FROM LIQUIDITY DATA ----------
    function populateTableFromLiquidityData(data) {
        if (!data || !data.success) {
            showToast('No data available to populate', 'warning');
            if (window.LiquidityTable) {
                window.LiquidityTable.renderTable(null);
            }
            return;
        }

        const values = data.values || [];
        if (values.length < 2) {
            showToast('No data rows found', 'warning');
            if (window.LiquidityTable) {
                window.LiquidityTable.renderTable(null);
            }
            return;
        }

        // Get the date from the response
        const dateStr = data.date || values[0] || '';
        
        // Update date picker
        if (dateStr) {
            const datePicker = document.getElementById('weekEndingDate');
            if (datePicker) {
                try {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        datePicker.value = year + '-' + month + '-' + day;
                        if (window.LiquidityTable) {
                            window.LiquidityTable.updateColumnHeadersWithDates(datePicker.value);
                        }
                    }
                } catch (e) {
                    console.warn('Could not parse date:', dateStr);
                }
            }
        }

        // Build table data for this specific date
        if (window.LiquidityTable) {
            // Use the current week ending date from the picker
            const datePicker = document.getElementById('weekEndingDate');
            const weekEnding = datePicker ? datePicker.value : dateStr;
            
            // Build the table with the values for the selected date
            const tableData = window.LiquidityTable.buildTableDataForDate(values, weekEnding);
            window.LiquidityTable.renderTable(tableData);
            showToast('Liquidity data loaded successfully', 'success');
        } else {
            console.error('LiquidityTable not loaded');
        }
    }

    // ---------- LOAD LIQUIDITY DATA ----------
    async function loadLiquidityData(weekEnding) {
        if (isLoading) return;
        
        showLoadingModal('Loading liquidity data...');
        
        try {
            const api = window.API;
            if (!api || typeof api.importLiquidityFromTrialBalance !== 'function') {
                throw new Error('API service not available');
            }
            
            const result = await api.importLiquidityFromTrialBalance(weekEnding);
            
            if (result && result.success) {
                populateTableFromLiquidityData(result);
            } else {
                const errorMsg = result && result.error ? result.error : 'No data available for this week';
                showToast(errorMsg, 'warning');
                if (window.LiquidityTable) {
                    window.LiquidityTable.renderTable(null);
                }
            }
        } catch (error) {
            console.error('Error loading liquidity data:', error);
            showToast('Failed to load data: ' + (error.message || 'Unknown error'), 'error');
            if (window.LiquidityTable) {
                window.LiquidityTable.renderTable(null);
            }
        } finally {
            hideLoadingModal();
        }
    }

    // Replaces the previous handleDateChange: update headers only, do NOT trigger import
function handleDateChange() {
    const datePicker = document.getElementById('weekEndingDate');
    if (!datePicker) return;

    // Only update column headers when user changes the date.
    // Do NOT call loadLiquidityData here so the change doesn't trigger an import.
    if (window.LiquidityTable) {
        window.LiquidityTable.updateColumnHeadersWithDates(datePicker.value);
    }
}

    // ============================================
    // UPLOAD MODAL HANDLING
    // ============================================

    function setupUploadButton() {
        const uploadBtn = document.getElementById('uploadBtn');
        if (!uploadBtn) return;

        uploadBtn.addEventListener('click', openUploadModal);

        const closeBtn = document.getElementById('uploadModalClose');
        const overlay = document.getElementById('uploadModalOverlay');
        const cancelBtn = document.getElementById('uploadCancelBtn');
        
        if (closeBtn) closeBtn.addEventListener('click', closeUploadModal);
        if (overlay) overlay.addEventListener('click', closeUploadModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeUploadModal);

        const fileInput = document.getElementById('uploadFileInput');
        const fileArea = document.getElementById('uploadFileArea');
        const fileRemove = document.getElementById('uploadFileRemove');

        if (fileArea) {
            fileArea.addEventListener('click', () => fileInput?.click());
            fileArea.addEventListener('dragover', (e) => { e.preventDefault(); fileArea.classList.add('dragover'); });
            fileArea.addEventListener('dragleave', (e) => { e.preventDefault(); fileArea.classList.remove('dragover'); });
            fileArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileArea.classList.remove('dragover');
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
            });
        }

        if (fileRemove) {
            fileRemove.addEventListener('click', (e) => {
                e.preventDefault();
                clearSelectedFile();
            });
        }

        const confirmBtn = document.getElementById('uploadConfirmBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const weekEndingInput = document.getElementById('uploadWeekEnding');
                const weekEnding = weekEndingInput?.value || '';
                startUploadProcess(weekEnding);
            });
        }
    }

    function openUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (!modal) return;
        modal.style.display = 'block';

        clearSelectedFile();
        
        const status = document.getElementById('uploadStatus');
        if (status) status.style.display = 'none';

        const confirmBtn = document.getElementById('uploadConfirmBtn');
        if (confirmBtn) confirmBtn.disabled = true;

        const pageDate = document.getElementById('weekEndingDate');
        const uploadDate = document.getElementById('uploadWeekEnding');
        if (pageDate && uploadDate) uploadDate.value = pageDate.value || '';
    }

    function closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) modal.style.display = 'none';
    }

    function clearSelectedFile() {
        __dl_selectedFile = null;
        const info = document.getElementById('uploadFileInfo');
        const fileNameSpan = document.getElementById('uploadFileName');
        const fileInput = document.getElementById('uploadFileInput');
        const fileArea = document.getElementById('uploadFileArea');
        const confirmBtn = document.getElementById('uploadConfirmBtn');

        if (info) info.style.display = 'none';
        if (fileNameSpan) fileNameSpan.textContent = 'No file selected';
        if (fileInput) fileInput.value = '';
        if (fileArea) fileArea.style.display = 'block';
        if (confirmBtn) confirmBtn.disabled = true;
    }

    function handleFile(file) {
        const fileNameSpan = document.getElementById('uploadFileName');
        const info = document.getElementById('uploadFileInfo');
        const fileArea = document.getElementById('uploadFileArea');
        const confirmBtn = document.getElementById('uploadConfirmBtn');

        const reader = new FileReader();
        reader.onload = function(evt) {
            let base64 = evt.target.result;
            const idx = base64.indexOf('base64,');
            if (idx !== -1) base64 = base64.substring(idx + 7);

            __dl_selectedFile = {
                name: file.name,
                type: file.type || 'application/octet-stream',
                base64: base64
            };

            if (fileNameSpan) fileNameSpan.textContent = file.name;
            if (info) info.style.display = 'flex';
            if (fileArea) fileArea.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    async function startUploadProcess(weekEnding) {
        if (!__dl_selectedFile) {
            showToast('No file selected for upload', 'error');
            return;
        }

        const status = document.getElementById('uploadStatus');
        const statusIcon = document.getElementById('uploadStatusIcon');
        const statusMessage = document.getElementById('uploadStatusMessage');
        const confirmBtn = document.getElementById('uploadConfirmBtn');

        if (status) status.style.display = 'flex';
        if (statusIcon) statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (statusMessage) statusMessage.textContent = 'Uploading...';
        if (confirmBtn) confirmBtn.disabled = true;

        try {
            const url = window.APP_CONFIG?.UPLOAD_HANDLER_URL;
            if (!url) throw new Error('Upload handler URL not configured');

            const params = new URLSearchParams();
            params.append('filename', __dl_selectedFile.name);
            params.append('mimeType', __dl_selectedFile.type);
            params.append('data', __dl_selectedFile.base64);
            params.append('weekEnding', weekEnding || '');

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body: params.toString()
            });

            const text = await resp.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error('Unexpected server response: ' + text.substring(0, 500));
            }

            if (!json || json.success === false) {
                throw new Error(json?.error || 'Upload failed');
            }

            if (statusIcon) statusIcon.innerHTML = '<i class="fas fa-check-circle" style="color: #16a34a;"></i>';
            if (statusMessage) statusMessage.textContent = json.message || 'Upload successful';

            setTimeout(() => {
                closeUploadModal();
                showUploadSuccessModal(json);
            }, 700);

            // After upload, import liquidity data for the week
            const weekForImport = weekEnding || json?.weekEnding || '';
            if (weekForImport) {
                await loadLiquidityData(weekForImport);
            }

        } catch (error) {
            if (statusIcon) statusIcon.innerHTML = '<i class="fas fa-times-circle" style="color:#dc2626;"></i>';
            if (statusMessage) statusMessage.textContent = 'Error: ' + (error.message || error.toString());
            console.error('Upload error:', error);
            showToast('Upload failed: ' + (error.message || 'Unknown error'), 'error');
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    function showUploadSuccessModal(result) {
        const modal = document.getElementById('uploadSuccessModal');
        if (!modal) {
            showToast(result?.message || 'Upload successful', 'success');
            return;
        }

        const title = document.getElementById('uploadSuccessTitle');
        const body = document.getElementById('uploadSuccessBody');

        if (title) title.textContent = 'Upload Successful';
        if (body) {
            body.innerHTML = `
                <p>${result.message || 'File uploaded successfully.'}</p>
                <ul style="margin-left:16px;">
                    <li><strong>File:</strong> ${result.filename || __dl_selectedFile?.name || ''}</li>
                    <li><strong>Rows:</strong> ${result.rowsImported || 'N/A'}</li>
                    <li><strong>Sheet:</strong> ${result.sheetName || result.sheetId || 'Trial Balance'}</li>
                </ul>
            `;
        }

        modal.style.display = 'flex';
        const closeBtn = document.getElementById('uploadSuccessClose');
        if (closeBtn) {
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }
    }

    // ============================================
    // INITIALIZE MODULE
    // ============================================

    window.initDailyLiquidityModule = function() {
        console.log('Initializing Daily Liquidity Module');
        console.log('Upload Handler URL:', window.APP_CONFIG?.UPLOAD_HANDLER_URL);
        
        if (!window.LiquidityTable) {
            console.error('LiquidityTable not loaded!');
            showToast('Liquidity table module not loaded', 'error');
            return;
        }
        
        const defaultDate = window.LiquidityTable.setDefaultDate();
        window.LiquidityTable.updateColumnHeadersWithDates(defaultDate);
        window.LiquidityTable.renderTable(null);
        
        setupUploadButton();
        
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            datePicker.removeEventListener('change', handleDateChange);
            datePicker.addEventListener('change', handleDateChange);
            // Load data for the current week
            if (datePicker.value) {
                loadLiquidityData(datePicker.value);
            } else {
                loadLiquidityData(defaultDate);
            }
        }
    };

})();
