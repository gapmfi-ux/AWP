
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
    // UPLOAD BUTTON / MODAL - In-page handling
    // - Select / drag-drop file
    // - Confirm reads file as base64, creates form, and posts to upload handler in a new popup window
    // ============================================
    function setupUploadButton() {
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadModal = document.getElementById('uploadModal');
        const uploadModalOverlay = document.getElementById('uploadModalOverlay');
        const uploadModalClose = document.getElementById('uploadModalClose');

        const uploadFileArea = document.getElementById('uploadFileArea');
        const uploadFileInput = document.getElementById('uploadFileInput');
        const uploadFileInfo = document.getElementById('uploadFileInfo');
        const uploadFileName = document.getElementById('uploadFileName');
        const uploadFileRemove = document.getElementById('uploadFileRemove');
        const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');
        const uploadStatus = document.getElementById('uploadStatus');
        const uploadStatusIcon = document.getElementById('uploadStatusIcon');
        const uploadStatusMessage = document.getElementById('uploadStatusMessage');
        const uploadWeekEnding = document.getElementById('uploadWeekEnding');

        if (!uploadBtn || !uploadModal) {
            console.warn('Upload modal or button not found in DOM.');
            return;
        }

        // Open modal
        function openUploadModal() {
            if (uploadModal) uploadModal.style.display = 'block';
            // reset state
            if (uploadFileInfo) uploadFileInfo.style.display = 'none';
            if (uploadConfirmBtn) uploadConfirmBtn.disabled = true;
            selectedFile = null;
            if (uploadStatus) uploadStatus.style.display = 'none';
            if (uploadWeekEnding) uploadWeekEnding.value = document.getElementById('weekEndingDate')?.value || '';
        }

        // Close modal
        function closeUploadModal() {
            if (uploadModal) uploadModal.style.display = 'none';
            if (uploadFileInput) uploadFileInput.value = '';
            selectedFile = null;
            if (uploadFileInfo) uploadFileInfo.style.display = 'none';
            if (uploadConfirmBtn) uploadConfirmBtn.disabled = true;
            if (uploadStatus) uploadStatus.style.display = 'none';
        }

        // File selected handler
        function onFileSelected(file) {
            if (!file) return;
            selectedFile = file;
            if (uploadFileName) uploadFileName.textContent = file.name;
            if (uploadFileInfo) uploadFileInfo.style.display = 'flex';
            if (uploadConfirmBtn) uploadConfirmBtn.disabled = false;
        }

        // wire up the main button to open the modal
        uploadBtn.addEventListener('click', function() {
            openUploadModal();
        });

        // overlay and close button
        if (uploadModalOverlay) uploadModalOverlay.addEventListener('click', closeUploadModal);
        if (uploadModalClose) uploadModalClose.addEventListener('click', closeUploadModal);

        // click on area to open file picker
        if (uploadFileArea) uploadFileArea.addEventListener('click', function() {
            if (uploadFileInput) uploadFileInput.click();
        });

        // drag & drop support
        if (uploadFileArea) {
            ['dragenter', 'dragover'].forEach(evt =>
                uploadFileArea.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadFileArea.classList.add('drag-over');
                })
            );
            ['dragleave', 'drop'].forEach(evt =>
                uploadFileArea.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadFileArea.classList.remove('drag-over');
                })
            );
            uploadFileArea.addEventListener('drop', function(e) {
                const dt = e.dataTransfer;
                if (dt && dt.files && dt.files.length) {
                    onFileSelected(dt.files[0]);
                }
            });
        }

        // file input change
        if (uploadFileInput) uploadFileInput.addEventListener('change', function(e) {
            const file = e.target.files && e.target.files[0];
            if (file) onFileSelected(file);
        });

        // remove selected file
        if (uploadFileRemove) uploadFileRemove.addEventListener('click', function(e) {
            e.preventDefault();
            if (uploadFileInput) uploadFileInput.value = '';
            selectedFile = null;
            if (uploadFileInfo) uploadFileInfo.style.display = 'none';
            if (uploadConfirmBtn) uploadConfirmBtn.disabled = true;
        });

        // Helper: convert File to base64 (data part only)
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.onload = () => {
                    // result is like "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,AAAA..."
                    const result = reader.result;
                    const idx = result.indexOf(',');
                    if (idx >= 0) {
                        resolve(result.substring(idx + 1));
                    } else {
                        resolve(result);
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        // Confirm upload: reads file and posts to upload handler in a new window using a form (avoids CORS)
        if (uploadConfirmBtn) uploadConfirmBtn.addEventListener('click', async function() {
            if (!selectedFile) {
                showToast('Please select a file before uploading', 'error');
                return;
            }

            // Optional: show a brief processing indicator inside the modal
            if (uploadStatus) {
                uploadStatus.style.display = 'flex';
                if (uploadStatusIcon) uploadStatusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                if (uploadStatusMessage) uploadStatusMessage.textContent = 'Preparing upload...';
            }

            const uploadHandlerUrl = window.APP_CONFIG && window.APP_CONFIG.UPLOAD_HANDLER_URL;
            if (!uploadHandlerUrl || uploadHandlerUrl.includes('YOUR_UPLOAD_HANDLER_DEPLOYMENT_ID')) {
                showToast('Upload handler not configured. Set UPLOAD_HANDLER_URL in config.js', 'error');
                console.error('UPLOAD_HANDLER_URL is not configured in config.js');
                if (uploadStatus) uploadStatus.style.display = 'none';
                return;
            }

            // Read file as base64
            try {
                const base64Data = await fileToBase64(selectedFile);

                // Build a temporary form and submit it to a new popup window
                const targetName = 'dailyLiquidityUpload';
                // Open a named window first (some browsers block forms opening new windows unless window.open called)
                const popup = window.open('', targetName, 'width=700,height=760,resizable=yes,scrollbars=yes');

                // Create form
                const form = document.createElement('form');
                form.method = 'POST';
                form.enctype = 'application/x-www-form-urlencoded';
                form.action = uploadHandlerUrl;
                form.target = targetName;
                form.style.display = 'none';

                // Helper to append hidden inputs
                function addInput(name, value) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                }

                addInput('filename', selectedFile.name);
                addInput('mimeType', selectedFile.type || 'application/octet-stream');
                addInput('data', base64Data);
                // pass weekEnding if provided in upload modal
                const weekVal = uploadWeekEnding ? (uploadWeekEnding.value || document.getElementById('weekEndingDate')?.value || '') : (document.getElementById('weekEndingDate')?.value || '');
                addInput('weekEnding', weekVal);

                document.body.appendChild(form);

                // Submit
                form.submit();

                // Clean up
                setTimeout(() => {
                    try {
                        form.remove();
                        if (popup && popup.focus) popup.focus();
                    } catch (e) { /* ignore cleanup errors */ }
                }, 800);

                // Close modal
                if (uploadModal) uploadModal.style.display = 'none';
                showToast('Upload started in new window. Complete the process there.', 'info');

            } catch (error) {
                console.error('Upload preparation failed:', error);
                showToast('Failed to prepare file for upload: ' + error.message, 'error');
                if (uploadStatus) uploadStatus.style.display = 'none';
            }
        });
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
