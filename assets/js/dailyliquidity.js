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
    // UPLOAD FUNCTION - Using google.script.run
    // ============================================
    function uploadToTrialBalance(weekEnding, fileData) {
        if (isLoading) return;
        
        showLoadingModal('Uploading Excel to Trial Balance...');

        // Convert file to base64
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const base64String = e.target.result.split(',')[1];
                
                console.log('Uploading file:', fileData.name);
                console.log('Base64 length:', base64String.length);
                console.log('Week Ending:', weekEnding);
                
                // Use the API service
                if (window.DailyLiquidityApi) {
                    // Using the split API
                    window.DailyLiquidityApi.uploadExcelToTrialBalance(base64String, fileData.name, weekEnding)
                        .then(function(response) {
                            hideLoadingModal();
                            console.log('Upload response:', response);
                            
                            if (response && response.success) {
                                showToast('✅ Excel uploaded and imported to Trial Balance successfully!', 'success');
                                closeUploadModal();
                                showToast('Rows imported: ' + (response.rowsImported || 0), 'info');
                            } else {
                                showToast('❌ Error uploading: ' + (response?.error || 'Unknown error'), 'error');
                            }
                        })
                        .catch(function(error) {
                            hideLoadingModal();
                            console.error('Upload error:', error);
                            showToast('❌ Error uploading: ' + (error.message || error), 'error');
                        });
                } else if (window.API && window.API.uploadExcelToTrialBalance) {
                    // Using the unified API
                    window.API.uploadExcelToTrialBalance({ 
                        base64: base64String, 
                        filename: fileData.name, 
                        weekEnding: weekEnding 
                    })
                    .then(function(response) {
                        hideLoadingModal();
                        console.log('Upload response:', response);
                        
                        if (response && response.success) {
                            showToast('✅ Excel uploaded and imported to Trial Balance successfully!', 'success');
                            closeUploadModal();
                            showToast('Rows imported: ' + (response.rowsImported || 0), 'info');
                        } else {
                            showToast('❌ Error uploading: ' + (response?.error || 'Unknown error'), 'error');
                        }
                    })
                    .catch(function(error) {
                        hideLoadingModal();
                        console.error('Upload error:', error);
                        showToast('❌ Error uploading: ' + (error.message || error), 'error');
                    });
                } else {
                    // Fallback to google.script.run
                    google.script.run
                        .withSuccessHandler(function(response) {
                            hideLoadingModal();
                            console.log('Upload response:', response);
                            
                            if (response && response.success) {
                                showToast('✅ Excel uploaded and imported to Trial Balance successfully!', 'success');
                                closeUploadModal();
                                showToast('Rows imported: ' + (response.rowsImported || 0), 'info');
                            } else {
                                showToast('❌ Error uploading: ' + (response?.error || 'Unknown error'), 'error');
                            }
                        })
                        .withFailureHandler(function(error) {
                            hideLoadingModal();
                            console.error('Upload error:', error);
                            showToast('❌ Error uploading: ' + (error.message || error), 'error');
                        })
                        .uploadExcelToTrialBalance(base64String, fileData.name, weekEnding);
                }
                    
            } catch (err) {
                hideLoadingModal();
                console.error('File processing error:', err);
                showToast('❌ Error processing file: ' + err.message, 'error');
            }
        };
        
        reader.onerror = function() {
            hideLoadingModal();
            showToast('❌ Error reading file', 'error');
        };
        
        reader.readAsDataURL(fileData);
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
            selectedFile = null;
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
                e.stopPropagation();
                if (this.files && this.files.length > 0) {
                    handleFileSelect(this.files[0]);
                }
            });
        }

        // Click on file area triggers file input
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
            // Check if it's an Excel file
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv'
            ];
            const validExtensions = ['.xlsx', '.xls', '.csv'];
            
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExt);
            
            if (!isValidType) {
                showToast('❌ Please select an Excel or CSV file', 'error');
                return;
            }
            
            selectedFile = file;
            fileName.textContent = file.name;
            fileInfo.style.display = 'flex';
            fileArea.style.display = 'none';
            confirmBtn.disabled = false;
            showToast('✅ File selected: ' + file.name, 'success');
        }

        // Remove file
        if (fileRemove) {
            fileRemove.addEventListener('click', function() {
                selectedFile = null;
                fileInput.value = '';
                fileInfo.style.display = 'none';
                fileArea.style.display = 'block';
                confirmBtn.disabled = true;
            });
        }

        // Confirm upload
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const weekEnding = uploadWeekEnding.value || document.getElementById('weekEndingDate').value;
                
                if (!weekEnding) {
                    showToast('⚠️ Please select a week ending date', 'warning');
                    return;
                }

                if (!selectedFile) {
                    showToast('⚠️ Please select a file to upload', 'warning');
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
