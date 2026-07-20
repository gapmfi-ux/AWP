// Daily Liquidity Module - Updated with Excel/CSV upload and Google Sheet save
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
            loadDataFromSheet(datePicker.value);
        }
    }

    // ---------- LOAD DATA FROM SHEET ----------
    function loadDataFromSheet(weekEnding) {
        if (typeof API === 'undefined' || !API) {
            console.log('API not available, using local data');
            renderTable(currentData.length > 0 ? currentData : LIQUIDITY_DATA);
            return;
        }

        const date = new Date(weekEnding);
        const formattedDate = date.toISOString().split('T')[0];

        API.loadLiquidityData(formattedDate)
            .then(function(response) {
                if (response && response.success && response.data && response.data.length > 0) {
                    renderTable(response.data);
                    showToast('✅ Data loaded from sheet (' + response.data.length + ' rows)', 'success');
                } else {
                    renderTable(currentData.length > 0 ? currentData : LIQUIDITY_DATA);
                    if (response && response.message) {
                        showToast(response.message, 'info');
                    }
                }
            })
            .catch(function(error) {
                console.error('Error loading data from sheet:', error);
                renderTable(currentData.length > 0 ? currentData : LIQUIDITY_DATA);
                showToast('Could not load data from sheet', 'error');
            });
    }

    // ---------- SAVE DATA TO SHEET ----------
    function saveDataToSheet(data, weekEnding) {
        if (typeof API === 'undefined' || !API) {
            showToast('API not available. Data not saved.', 'error');
            return Promise.reject('API not available');
        }

        const date = new Date(weekEnding);
        const formattedDate = date.toISOString().split('T')[0];

        const payload = {
            rows: data,
            weekEnding: formattedDate
        };

        showToast('Saving data to sheet...', 'info');

        return API.saveLiquidityData(payload)
            .then(function(response) {
                if (response && response.success) {
                    showToast('✅ Data saved to sheet successfully!', 'success');
                    return response;
                } else {
                    showToast('Error saving data: ' + (response?.error || 'Unknown error'), 'error');
                    throw new Error(response?.error || 'Save failed');
                }
            })
            .catch(function(error) {
                console.error('Error saving to sheet:', error);
                showToast('Error saving data: ' + error.message, 'error');
                throw error;
            });
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

    // ---------- EXCEL/CSV PARSER ----------
    function parseExcelFile(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    let parsedData = null;
                    let headers = null;
                    let weekEnding = null;

                    // Check if it's a CSV file
                    if (file.name.toLowerCase().endsWith('.csv')) {
                        const text = new TextDecoder('utf-8').decode(content);
                        const lines = text.split('\n').filter(line => line.trim() !== '');
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
                    } else {
                        // Try JSON (for Excel exports as JSON)
                        try {
                            const json = JSON.parse(new TextDecoder('utf-8').decode(content));
                            if (json.data && Array.isArray(json.data)) {
                                parsedData = json.data;
                                headers = json.headers || null;
                                weekEnding = json.weekEnding || null;
                            } else if (Array.isArray(json)) {
                                parsedData = json;
                            }
                        } catch (jsonErr) {
                            // If not JSON, try reading as text and parsing as CSV
                            const text = new TextDecoder('utf-8').decode(content);
                            const lines = text.split('\n').filter(line => line.trim() !== '');
                            if (lines.length > 1) {
                                const headerRow = lines[0].split('\t').map(h => h.trim());
                                headers = headerRow;
                                parsedData = lines.slice(1).map(line => {
                                    const cols = line.split('\t').map(c => c.trim());
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
                    }

                    if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                        resolve({
                            data: parsedData,
                            headers: headers,
                            weekEnding: weekEnding
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
        const uploadWeekEnding = document.getElementById('uploadWeekEnding');

        let selectedFile = null;
        let parsedData = null;

        // Open modal
        uploadBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
            const currentDate = document.getElementById('weekEndingDate').value;
            if (uploadWeekEnding) {
                uploadWeekEnding.value = currentDate || '';
            }
            selectedFile = null;
            parsedData = null;
            fileInput.value = '';
            fileInfo.style.display = 'none';
            confirmBtn.disabled = true;
            fileArea.style.display = 'block';
        });

        function closeModal() {
            modal.style.display = 'none';
        }

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

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

        // Remove file
        fileRemove.addEventListener('click', function() {
            selectedFile = null;
            parsedData = null;
            fileInput.value = '';
            fileInfo.style.display = 'none';
            fileArea.style.display = 'block';
            confirmBtn.disabled = true;
        });

        // Handle file selection
        function handleFileSelect(file) {
            selectedFile = file;
            fileName.textContent = file.name;
            fileInfo.style.display = 'flex';
            fileArea.style.display = 'none';
            confirmBtn.disabled = true;

            // Parse the file
            parseExcelFile(file)
                .then(function(result) {
                    parsedData = result.data;
                    uploadedHeaders = result.headers;
                    uploadedWeekEnding = result.weekEnding;
                    confirmBtn.disabled = false;
                    showToast('✅ File parsed successfully! ' + parsedData.length + ' rows found.', 'success');
                })
                .catch(function(err) {
                    showToast('Error parsing file: ' + err.message, 'error');
                    confirmBtn.disabled = true;
                });
        }

        // Confirm upload - Save to Google Sheet
        confirmBtn.addEventListener('click', function() {
            if (!parsedData || parsedData.length === 0) {
                showToast('No data to upload.', 'error');
                return;
            }

            const weekEnding = uploadWeekEnding.value || document.getElementById('weekEndingDate').value;
            
            // Save to Google Sheet
            saveDataToSheet(parsedData, weekEnding)
                .then(function(response) {
                    if (response && response.success) {
                        // Update headers if provided
                        if (uploadedHeaders && uploadedHeaders.length === 7) {
                            for (let i = 1; i <= 7; i++) {
                                const col = document.getElementById('col' + i);
                                if (col) col.textContent = uploadedHeaders[i - 1];
                            }
                        } else {
                            updateColumnHeadersWithDates(weekEnding);
                        }

                        if (uploadedWeekEnding) {
                            updateWeekEnding(uploadedWeekEnding);
                        } else {
                            const weekDates = getWeekDatesFromEnding(weekEnding);
                            const lastDay = weekDates[weekDates.length - 1];
                            updateWeekEnding(formatWeekEnding(lastDay));
                        }

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

                        renderTable(parsedData);
                        closeModal();
                        showToast('✅ Data uploaded and saved to sheet!', 'success');
                    }
                })
                .catch(function(error) {
                    console.error('Upload failed:', error);
                });
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
            setTimeout(function() {
                loadDataFromSheet(datePicker.value);
            }, 500);
        }
    };

    // Expose functions for console/testing
    window.saveLiquidityData = saveDataToSheet;
    window.loadLiquidityData = loadDataFromSheet;

})();
