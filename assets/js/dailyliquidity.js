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

 // ---------- POPULATE TABLE FROM LIQUIDITY DATA (defensive) ----------
function populateTableFromLiquidityData(data) {
    if (!data) {
        console.warn('populateTableFromLiquidityData: no data received');
        showToast('No data available to populate', 'warning');
        if (window.LiquidityTable) window.LiquidityTable.renderTable(null);
        return;
    }

    console.debug('populateTableFromLiquidityData - server response:', data);

    // server may return { success: true, values: [...] } or { values: [...] } etc.
    const rawValues = data.values || [];
    // If server returned a nested array (multiple rows), keep as-is; otherwise wrap single row so handling is consistent
    let rows = [];
    if (Array.isArray(rawValues) && rawValues.length > 0 && Array.isArray(rawValues[0])) {
        rows = rawValues; // already array of rows
    } else if (Array.isArray(rawValues) && rawValues.length > 0) {
        // single row (1D) -> treat as single row array
        rows = [rawValues];
    } else {
        // fallback: server may have returned the row directly as data (not under values)
        if (Array.isArray(data)) {
            if (Array.isArray(data[0])) rows = data;
            else rows = [data];
        } else {
            console.warn('populateTableFromLiquidityData: no usable values found in response');
            showToast('No data rows found', 'warning');
            if (window.LiquidityTable) window.LiquidityTable.renderTable(null);
            return;
        }
    }

    // Determine the week ending we should use (prefer date picker value; else data.date; else today)
    const datePicker = document.getElementById('weekEndingDate');
    const weekEnding = datePicker && datePicker.value ? datePicker.value : (data.date || '');

    // If multiple rows were returned, try to pick the row whose date falls in the selected week
    let matchedRow = null;
    if (rows.length === 1) {
        matchedRow = rows[0];
    } else {
        // Normalize week dates and compare
        const weekDates = window.LiquidityTable ? window.LiquidityTable.getWeekDatesFromEnding(weekEnding || window.LiquidityTable.setDefaultDate()) : null;
        for (let r of rows) {
            const rowDateRaw = r && r.length ? r[0] : null;
            const rowDate = window.LiquidityTable ? window.LiquidityTable.parseDateFromValue(rowDateRaw) : null;
            if (!rowDate || !weekDates) continue;
            // compare day keys
            const rowKey = window.LiquidityTable.formatDateKey(rowDate);
            for (let d of weekDates) {
                if (window.LiquidityTable.formatDateKey(d) === rowKey) {
                    matchedRow = r;
                    break;
                }
            }
            if (matchedRow) break;
        }
    }

    if (!matchedRow) {
        // As a last resort, try to use first non-empty row
        matchedRow = rows.find(r => Array.isArray(r) && r.some(v => v !== null && v !== '' && v !== 0));
    }

    if (!matchedRow) {
        console.warn('populateTableFromLiquidityData: no matching row found for weekEnding:', weekEnding, 'rows:', rows);
        showToast('No matching data for selected week', 'warning');
        if (window.LiquidityTable) window.LiquidityTable.renderTable(null);
        return;
    }

    // Update the date picker/display if server provided a date string at top of matchedRow or data.date
    const serverDateCandidate = data.date || matchedRow[0];
    if (serverDateCandidate) {
        try {
            const d = new Date(serverDateCandidate);
            if (!isNaN(d.getTime())) {
                if (datePicker) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    datePicker.value = year + '-' + month + '-' + day;
                    if (window.LiquidityTable) window.LiquidityTable.updateColumnHeadersWithDates(datePicker.value);
                }
            }
        } catch (e) {
            console.debug('populateTableFromLiquidityData: could not parse server date', serverDateCandidate, e);
        }
    }

    // Build and render using the matched row
    try {
        const tableData = window.LiquidityTable.buildTableDataForDate(matchedRow, weekEnding);
        window.LiquidityTable.renderTable(tableData);
        showToast('Liquidity data loaded', 'success');
    } catch (err) {
        console.error('populateTableFromLiquidityData - failed to build/render table:', err);
        showToast('Failed to render liquidity data', 'error');
        if (window.LiquidityTable) window.LiquidityTable.renderTable(null);
    }
}

// ---------- LOAD LIQUIDITY DATA (with debug) ----------
async function loadLiquidityData(weekEnding) {
    if (isLoading) return;

    showLoadingModal('Loading liquidity data...');

    try {
        const api = window.API;
        if (!api || typeof api.importLiquidityFromTrialBalance !== 'function') {
            console.error('loadLiquidityData: API.importLiquidityFromTrialBalance not available');
            throw new Error('API service not available');
        }

        console.debug('Calling importLiquidityFromTrialBalance with weekEnding=', weekEnding);
        const result = await api.importLiquidityFromTrialBalance(weekEnding);
        console.debug('importLiquidityFromTrialBalance result:', result);

        if (result && (result.success === true || result.values)) {
            populateTableFromLiquidityData(result);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'No data available for this week';
            console.warn('loadLiquidityData: no data -', errorMsg, result);
            showToast(errorMsg, 'warning');
            if (window.LiquidityTable) window.LiquidityTable.renderTable(null);
        }
    } catch (error) {
        console.error('Error loading liquidity data:', error);
        showToast('Failed to load data: ' + (error.message || 'Unknown error'), 'error');
        if (window.LiquidityTable) window.LiquidityTable.renderTable(null);
    } finally {
        hideLoadingModal();
    }
}

    // ---------- HANDLE DATE CHANGE ----------
    // NOTE: Changed behavior — DO NOT call loadLiquidityData when user changes the date picker.
    // The date picker now only updates column headers and the UI. Import is triggered only after upload.
    function handleDateChange() {
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            if (window.LiquidityTable) {
                window.LiquidityTable.updateColumnHeadersWithDates(datePicker.value);
                // Re-render an empty table so columns reflect the selected week
                window.LiquidityTable.renderTable(null);
            }
            // Do NOT call loadLiquidityData here — import should only be triggered on upload.
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
        // Render empty table initially; do not auto-import data
        window.LiquidityTable.renderTable(null);
        
        setupUploadButton();
        
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            datePicker.removeEventListener('change', handleDateChange);
            datePicker.addEventListener('change', handleDateChange);
            // Do not call loadLiquidityData here — import is triggered only after upload.
        }
    };

})();
