// Daily Liquidity Module - Upload Excel to Trial Balance (full updated script)
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

    // ---------- UPLOAD STATE (closure-scoped) ----------
    let __dl_selectedFile = null; // { name, type, base64 }

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
                    const displayVal = val && String(val).trim() !== '' ? val : '<span class="empty-cell">—</span>';
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

    // ============================================
    // UPLOAD: In-app modal implementation
    // ============================================

    function setupUploadButton() {
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (!uploadBtn) return;

        uploadBtn.addEventListener('click', function() {
            // Open the in-app modal instead of a popup
            openUploadModal();
        });

        // Close buttons
        const uploadModalClose = document.getElementById('uploadModalClose');
        const uploadModalOverlay = document.getElementById('uploadModalOverlay');
        const uploadCancelBtn = document.getElementById('uploadCancelBtn');

        if (uploadModalClose) uploadModalClose.addEventListener('click', closeUploadModal);
        if (uploadModalOverlay) uploadModalOverlay.addEventListener('click', closeUploadModal);
        if (uploadCancelBtn) uploadCancelBtn.addEventListener('click', closeUploadModal);

        // File input handlers
        const uploadFileInput = document.getElementById('uploadFileInput');
        const uploadFileArea = document.getElementById('uploadFileArea');
        const uploadFileRemove = document.getElementById('uploadFileRemove');

        if (uploadFileArea) {
            uploadFileArea.addEventListener('click', () => { if (uploadFileInput) uploadFileInput.click(); });
            // drag & drop support
            uploadFileArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadFileArea.classList.add('dragover'); });
            uploadFileArea.addEventListener('dragleave', (e) => { e.preventDefault(); uploadFileArea.classList.remove('dragover'); });
            uploadFileArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadFileArea.classList.remove('dragover');
                const file = e.dataTransfer.files && e.dataTransfer.files[0];
                if (file) handleFile(file);
            });
        }

        if (uploadFileInput) {
            uploadFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) handleFile(file);
            });
        }

        if (uploadFileRemove) {
            uploadFileRemove.addEventListener('click', (e) => {
                e.preventDefault();
                clearSelectedFile();
            });
        }

        // Confirm upload
        const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');
        if (uploadConfirmBtn) {
            uploadConfirmBtn.addEventListener('click', function() {
                const weekEndingInput = document.getElementById('uploadWeekEnding');
                const weekEnding = weekEndingInput ? weekEndingInput.value : '';
                startUploadProcess(weekEnding);
            });
        }
    }

    function openUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (!modal) return;
        modal.style.display = 'block';

        // reset state
        clearSelectedFile();
        const uploadStatus = document.getElementById('uploadStatus');
        if (uploadStatus) uploadStatus.style.display = 'none';

        // enable confirm only after file chosen
        const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');
        if (uploadConfirmBtn) {
            uploadConfirmBtn.disabled = true;
        }

        // set default week ending (copy the page's date selector)
        const pageWeekEnding = document.getElementById('weekEndingDate');
        const uploadWeekEnding = document.getElementById('uploadWeekEnding');
        if (pageWeekEnding && uploadWeekEnding) uploadWeekEnding.value = pageWeekEnding.value || '';
    }

    function closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (!modal) return;
        modal.style.display = 'none';
    }

    function clearSelectedFile() {
        __dl_selectedFile = null;
        const info = document.getElementById('uploadFileInfo');
        const fileNameSpan = document.getElementById('uploadFileName');
        const fileInput = document.getElementById('uploadFileInput');
        const fileArea = document.getElementById('uploadFileArea');
        const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');

        if (info) info.style.display = 'none';
        if (fileNameSpan) fileNameSpan.textContent = 'No file selected';
        if (fileInput) fileInput.value = '';
        if (fileArea) fileArea.style.display = 'block';
        if (uploadConfirmBtn) uploadConfirmBtn.disabled = true;
    }

    function handleFile(file) {
        // Accept only .xlsx, .xls, .csv (same as input accept)
        const fileNameSpan = document.getElementById('uploadFileName');
        const info = document.getElementById('uploadFileInfo');
        const fileArea = document.getElementById('uploadFileArea');
        const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');

        const reader = new FileReader();
        reader.onload = function(evt) {
            const result = evt.target.result; // data:...;base64,AAAA...
            // strip data:*/*;base64, prefix if present
            let base64 = result;
            const idx = result.indexOf('base64,');
            if (idx !== -1) base64 = result.substring(idx + 7);

            __dl_selectedFile = {
                name: file.name,
                type: file.type || 'application/octet-stream',
                base64: base64
            };

            if (fileNameSpan) fileNameSpan.textContent = file.name;
            if (info) info.style.display = 'flex';
            if (fileArea) fileArea.style.display = 'none';
            if (uploadConfirmBtn) uploadConfirmBtn.disabled = false;
        };

        // read as data URL so we get base64 easily
        reader.readAsDataURL(file);
    }

    async function startUploadProcess(weekEnding) {
        if (!__dl_selectedFile) {
            showToast('No file selected for upload', 'error');
            return;
        }

        const uploadStatus = document.getElementById('uploadStatus');
        const uploadStatusIcon = document.getElementById('uploadStatusIcon');
        const uploadStatusMessage = document.getElementById('uploadStatusMessage');
        const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');

        if (uploadStatus) uploadStatus.style.display = 'flex';
        if (uploadStatusIcon) uploadStatusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (uploadStatusMessage) uploadStatusMessage.textContent = 'Uploading...';
        if (uploadConfirmBtn) uploadConfirmBtn.disabled = true;

        try {
            const url = window.APP_CONFIG && window.APP_CONFIG.UPLOAD_HANDLER_URL;
            if (!url) throw new Error('Upload handler URL not configured');

            // Prepare form-encoded body expected by Apps Script doPost (e.parameter)
            const params = new URLSearchParams();
            params.append('filename', __dl_selectedFile.name);
            params.append('mimeType', __dl_selectedFile.type);
            params.append('data', __dl_selectedFile.base64);
            params.append('weekEnding', weekEnding || '');

            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: params.toString()
            });

            // Apps Script returns JSON as ContentService JSON - read text then parse
            const text = await resp.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                // If server returned HTML (error) show it
                throw new Error('Unexpected server response: ' + text.substring(0, 500));
            }

            if (!json || json.success === false) {
                const err = json && json.error ? json.error : 'Upload failed';
                throw new Error(err);
            }

            // Success - show success modal (not a full page)
            if (uploadStatusIcon) uploadStatusIcon.innerHTML = '<i class="fas fa-check-circle" style="color: #16a34a;"></i>';
            if (uploadStatusMessage) uploadStatusMessage.textContent = json.message || 'Upload successful';

            // Close upload modal and show success modal with details
            setTimeout(() => {
                closeUploadModal();
                showUploadSuccessModal(json);
            }, 700);

            // --- NEW: After successful upload, kick off server-side import into Daily Liquidity ---
            // Prefer the explicit weekEnding passed to startUploadProcess, otherwise prefer the server-returned value.
            (function() {
                const weekForImport = weekEnding || (json && json.weekEnding) || '';
                if (window.API && typeof window.API.importLiquidityFromTrialBalance === 'function') {
                    API.importLiquidityFromTrialBalance(weekForImport)
                      .then(function(importRes) {
                        if (importRes && importRes.success) {
                          showToast('Liquidity import completed: ' + (importRes.message || 'OK'), 'success');
                        } else {
                          const msg = importRes && importRes.error ? importRes.error : (importRes && importRes.message) || 'Import failed';
                          showToast('Liquidity import: ' + msg, 'warning');
                        }
                        console.log('importLiquidityFromTrialBalance result:', importRes);
                      })
                      .catch(function(err) {
                        console.error('Error calling importLiquidityFromTrialBalance:', err);
                        showToast('Liquidity import failed: ' + (err && err.message ? err.message : err), 'error');
                      });
                } else {
                    console.warn('API.importLiquidityFromTrialBalance not available; skipping server import call.');
                }
            })();

        } catch (error) {
            if (uploadStatusIcon) uploadStatusIcon.innerHTML = '<i class="fas fa-times-circle" style="color:#dc2626;"></i>';
            if (uploadStatusMessage) uploadStatusMessage.textContent = 'Error: ' + (error.message || error.toString());
            console.error('Upload error:', error);
            showToast('Upload failed: ' + (error.message || 'Unknown error'), 'error');
            if (uploadConfirmBtn) uploadConfirmBtn.disabled = false;
        }
    }

    // Simple success modal
    function showUploadSuccessModal(result) {
        const modal = document.getElementById('uploadSuccessModal');
        const title = document.getElementById('uploadSuccessTitle');
        const body = document.getElementById('uploadSuccessBody');

        if (!modal) {
            // fallback toast
            showToast(result && result.message ? result.message : 'Upload successful', 'success');
            return;
        }

        if (title) title.textContent = 'Upload Successful';
        if (body) {
            body.innerHTML = `
                <p>${result.message || 'File uploaded successfully.'}</p>
                <ul style="margin-left:16px;">
                    <li><strong>File:</strong> ${result.filename || ( __dl_selectedFile && __dl_selectedFile.name ) || ''}</li>
                    <li><strong>Rows:</strong> ${result.rowsImported || 'N/A'}</li>
                    <li><strong>Sheet:</strong> ${result.sheetName || result.sheetId || 'Trial Balance'}</li>
                </ul>
            `;
        }

        modal.style.display = 'flex';

        const closeBtn = document.getElementById('uploadSuccessClose');
        if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    }

    // ---------- HANDLE DATE CHANGE ----------
    function handleDateChange() {
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            updateColumnHeadersWithDates(datePicker.value);
        }
    }

    // ---------- INITIALIZE MODULE ----------
    window.initDailyLiquidityModule = function() {
        console.log('Initializing Daily Liquidity Module');
        console.log('Upload Handler URL:', window.APP_CONFIG && window.APP_CONFIG.UPLOAD_HANDLER_URL);
        
        const defaultDate = setDefaultDate();
        updateColumnHeadersWithDates(defaultDate);
        renderTable(EMPTY_ROWS);
        
        setupUploadButton();
        
        const datePicker = document.getElementById('weekEndingDate');
        if (datePicker) {
            datePicker.addEventListener('change', handleDateChange);
        }
    };

    // Expose functions for testing
    window.renderLiquidityTable = renderTable;

})();
