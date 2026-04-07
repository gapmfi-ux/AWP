/* ============================================
   FIXED ASSETS MODULE JAVASCRIPT
   ============================================ */

// Global variables
let assetPortalOpen = false;
let allDetailedAssets = [];
let currentAsOfDate = null;
let summaryFromDate = null;
let summaryToDate = null;

const ASSET_TYPES = [
  'Computers & Accessories',
  'Furniture and Fixtures',
  'Fittings',
  'Office Equipment',
  'Motor Vehicle',
  'Software'
];

// ============================================
// INITIALIZATION
// ============================================

function initAssetModule() {
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('dateOfPurchase');
  if (dateField) dateField.value = today;

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeAssetModal();
    }
  });
}

function initAssetRegisterModule() {
  console.log('Initializing Asset Register Module');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Set initial date values
  const detailedToDate = document.getElementById('detailedToDate');
  const summaryToDateEl = document.getElementById('summaryToDate');
  
  if (detailedToDate) detailedToDate.value = today;
  if (summaryToDateEl) summaryToDateEl.value = today;
  
  currentAsOfDate = today;
  summaryToDate = today;
  
  // First update accumulated depreciation
  showAssetRegisterLoadingModal('Initializing asset register...');
  
  callGAS('updateAllAccumulatedDepreciation', { asOfDate: today })
    .then(() => {
      hideAssetRegisterLoadingModal();
      return loadDetailedRegister();
    })
    .catch(error => {
      console.error('Initialization error:', error);
      hideAssetRegisterLoadingModal();
      loadDetailedRegister(); // Still try to load even if update fails
    });
  
  // Close dropdown when clicking outside
  window.addEventListener('click', function(event) {
    if (assetPortalOpen) {
      const portal = document.getElementById('assetActionPortal');
      if (portal && !portal.contains(event.target) && !event.target.classList.contains('action-btn')) {
        closeAssetActionDropdown();
      }
    }
  });
}

// ============================================
// ASSET CODE GENERATION
// ============================================

function handleAssetTypeChange() {
  const assetType = document.getElementById('assetType').value;
  const codeField = document.getElementById('assetCode');
  const depreciationInfo = document.getElementById('depreciationInfo');
  
  if (assetType) {
    // Show depreciation info
    depreciationInfo.style.display = 'block';
    calculateDepreciationInfo(assetType);
    
    if (assetType === 'Fittings' || assetType === 'Software') {
      codeField.value = 'N/A';
      codeField.readOnly = true;
    } else {
      codeField.value = 'Generating...';
      codeField.readOnly = true;
      generateAssetCode(assetType);
    }
  } else {
    depreciationInfo.style.display = 'none';
    codeField.value = '';
    codeField.readOnly = false;
  }
}

function calculateDepreciationInfo(assetType) {
  const cost = parseFloat(document.getElementById('assetCost').value) || 0;
  const purchaseDate = document.getElementById('dateOfPurchase').value;
  
  if (!cost || cost <= 0 || !purchaseDate) {
    // Show placeholder
    document.getElementById('lifeSpanDisplay').textContent = '—';
    document.getElementById('rateDisplay').textContent = '—';
    document.getElementById('monthlyDepDisplay').textContent = '—';
    document.getElementById('annualChargeDisplay').textContent = '—';
    document.getElementById('endOfLifeDisplay').textContent = '—';
    return;
  }
  
  // Get asset config
  const configs = {
    'Computers & Accessories': { lifeSpan: 3, rate: 33.33 },
    'Furniture and Fixtures': { lifeSpan: 3, rate: 33.33 },
    'Office Equipment': { lifeSpan: 3, rate: 33.33 },
    'Software': { lifeSpan: 3, rate: 33.33 },
    'Fittings': { lifeSpan: 5, rate: 20.00 },
    'Motor Vehicle': { lifeSpan: 5, rate: 20.00 }
  };
  
  const config = configs[assetType] || { lifeSpan: 3, rate: 33.33 };
  const annualCharge = (cost * config.rate) / 100;
  const monthlyDep = annualCharge / 12;
  
  // Calculate end of life span
  const purchase = new Date(purchaseDate);
  const endOfLife = new Date(purchase);
  endOfLife.setFullYear(purchase.getFullYear() + config.lifeSpan);
  
  document.getElementById('lifeSpanDisplay').textContent = config.lifeSpan + ' years';
  document.getElementById('rateDisplay').textContent = config.rate + '%';
  document.getElementById('monthlyDepDisplay').textContent = formatCurrency(monthlyDep);
  document.getElementById('annualChargeDisplay').textContent = formatCurrency(annualCharge);
  document.getElementById('endOfLifeDisplay').textContent = formatDateForDisplay(endOfLife);
}

function generateAssetCode(assetType) {
  callGAS('generateAssetCode', { assetType: assetType })
    .then(response => {
      const field = document.getElementById('assetCode');
      if (field) {
        field.value = response || '';
      }
    })
    .catch(error => {
      console.error('Error generating asset code:', error);
      document.getElementById('assetCode').value = '';
      showAssetMessage('Error generating asset code: ' + (error.message || error), 'error');
    });
}

// ============================================
// ASSET CRUD
// ============================================

function submitNewAsset() {
  const assetType = document.getElementById('assetType').value;
  const assetCode = document.getElementById('assetCode').value;
  const assetName = document.getElementById('assetName').value;
  const dateOfPurchase = document.getElementById('dateOfPurchase').value;
  const assetCost = document.getElementById('assetCost').value;
  const assetLocation = document.getElementById('assetLocation').value;

  // Validation
  if (!assetType) {
    showAssetMessage('Please select an asset type', 'error');
    return;
  }

  if (!assetName || assetName.trim() === '') {
    showAssetMessage('Please enter the name of the asset', 'error');
    return;
  }

  if (!dateOfPurchase) {
    showAssetMessage('Please select a date of purchase', 'error');
    return;
  }

  if (!assetCost || isNaN(assetCost) || assetCost <= 0) {
    showAssetMessage('Please enter a valid cost', 'error');
    return;
  }

  if (!assetLocation || assetLocation.trim() === '') {
    showAssetMessage('Please enter the asset location', 'error');
    return;
  }

  if ((assetType !== 'Fittings' && assetType !== 'Software') && (!assetCode || assetCode === 'Generating...')) {
    showAssetMessage('Please wait for the asset code to be generated', 'error');
    return;
  }

  showAssetLoadingModal('Adding Asset...');

  const formData = {
    assetType: assetType,
    assetCode: assetCode === 'N/A' ? '' : assetCode,
    assetName: assetName.trim(),
    dateOfPurchase: dateOfPurchase,
    assetCost: parseFloat(assetCost),
    location: assetLocation.trim(),
    status: 'Active'
  };

  callGAS('addNewAsset', { formData: JSON.stringify(formData) })
    .then(response => {
      hideAssetLoadingModal();
      if (response && !response.error) {
        showAssetMessage('✓ Asset added successfully!', 'success');
        setTimeout(() => {
          document.getElementById('newAssetForm').reset();
          const today = new Date().toISOString().split('T')[0];
          document.getElementById('dateOfPurchase').value = today;
          document.getElementById('assetCode').value = '';
          document.getElementById('assetType').value = '';
          document.getElementById('depreciationInfo').style.display = 'none';
          
          // Refresh the register after adding new asset
          if (currentAsOfDate) {
            callGAS('updateAllAccumulatedDepreciation', { asOfDate: currentAsOfDate })
              .then(() => loadDetailedRegister())
              .catch(() => loadDetailedRegister());
          } else {
            loadDetailedRegister();
          }
        }, 1500);
      } else {
        showAssetMessage('Error adding asset: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      hideAssetLoadingModal();
      showAssetMessage('Error adding asset: ' + (error.message || error), 'error');
    });
}

// ============================================
// DETAILED REGISTER
// ============================================

function switchAssetRegisterTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  event.target.closest('.tab-btn').classList.add('active');

  // Toggle date range controls
  const detailedDateControl = document.getElementById('detailedDateControl');
  const summaryDateControl = document.getElementById('summaryDateControl');

  if (tabName === 'detailedRegister') {
    if (detailedDateControl) detailedDateControl.style.display = 'flex';
    if (summaryDateControl) summaryDateControl.style.display = 'none';
    loadDetailedRegister();
  } else if (tabName === 'summaryRegister') {
    if (detailedDateControl) detailedDateControl.style.display = 'none';
    if (summaryDateControl) summaryDateControl.style.display = 'flex';
    loadSummaryRegister();
  }
}

function loadDetailedRegister() {
  showAssetRegisterLoadingSpinner('detailedRegisterBody');
  
  callGAS('getDetailedRegister', {})
    .then(response => {
      if (response && !response.error) {
        allDetailedAssets = response;
        renderDetailedRegisterTable(response);
      } else {
        showAssetRegisterEmptyState('detailedRegisterBody', 'Error loading asset register', 11);
      }
    })
    .catch(error => {
      console.error('Error loading detailed register:', error);
      showAssetRegisterEmptyState('detailedRegisterBody', 'Error loading asset register', 11);
    });
}

function recalculateAssetValues() {
  const asOfDateInput = document.getElementById('detailedToDate').value;
  if (!asOfDateInput) {
    renderDetailedRegisterTable(allDetailedAssets);
    return;
  }
  
  currentAsOfDate = asOfDateInput;
  
  // Automatically save recalculated values to spreadsheet
  showAssetRegisterLoadingModal('Recalculating accumulated depreciation as at ' + formatDateForDisplay(new Date(currentAsOfDate)) + '...');
  
  callGAS('updateAllAccumulatedDepreciation', { 
    asOfDate: currentAsOfDate 
  })
  .then(response => {
    hideAssetRegisterLoadingModal();
    if (response && !response.error) {
      // Reload the data to show updated values
      return callGAS('getDetailedRegister', {});
    } else {
      throw new Error(response?.error || 'Failed to update');
    }
  })
  .then(response => {
    if (response && !response.error) {
      allDetailedAssets = response;
      renderDetailedRegisterTable(allDetailedAssets);
      showAssetMessage('✓ Accumulated depreciation updated as at ' + formatDateForDisplay(new Date(currentAsOfDate)), 'success');
      setTimeout(() => closeAssetModal(), 1500);
    }
  })
  .catch(error => {
    hideAssetRegisterLoadingModal();
    console.error('Error:', error);
    showAssetMessage('Error updating depreciation: ' + (error.message || error), 'error');
    // Still render with current data
    renderDetailedRegisterTable(allDetailedAssets);
  });
}

function renderDetailedRegisterTable(data) {
  const tbody = document.getElementById('detailedRegisterBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    showAssetRegisterEmptyState('detailedRegisterBody', 'No assets found', 11);
    return;
  }

  const rows = data.map(asset => {
    // Use the values from the spreadsheet (already updated by updateAllAccumulatedDepreciation)
    // Don't recalculate here - use the stored accumulated depreciation and net book value
    const monthlyDep = parseFloat(asset.annualCharge) / 12;
    
    return `
      <tr>
        <td>${escapeHtml(asset.name || '')}</td>
        <td>${escapeHtml(asset.type || '')}</td>
        <td>${escapeHtml(asset.code || '')}</td>
        <td>${escapeHtml(asset.location || '')}</td>
        <td>${asset.purchaseDate || ''}</td>
        <td>${formatCurrency(asset.cost)}</td>
        <td>${formatCurrency(asset.annualCharge)}</td>
        <td>${formatCurrency(monthlyDep)}</td>
        <td>${formatCurrency(asset.accumulatedDepreciation)}</td>
        <td>${formatCurrency(asset.netBookValue)}</td>
        <td>
          <button class="action-btn" onclick="openAssetActionDropdown(event, '${escapeHtml(asset.name)}')">
            <i class="fas fa-ellipsis-v"></i> Action
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

// ============================================
// SUMMARY REGISTER (FIXED - Uses Backend Report)
// ============================================

function loadSummaryRegister() {
  showAssetRegisterLoadingSpinner('summaryDetailsBody');
  
  summaryFromDate = document.getElementById('summaryFromDate').value;
  summaryToDate = document.getElementById('summaryToDate').value;

  if (!summaryFromDate || !summaryToDate) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select both FROM and TO dates', 9);
    return;
  }

  // Use the backend report function for consistent calculations
  callGAS('getFixedAssetsSummaryReport', { toDate: summaryToDate })
    .then(response => {
      if (response && !response.error) {
        renderSummaryRegisterFromReport(response);
      } else {
        showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register', 9);
      }
    })
    .catch(error => {
      console.error('Error loading summary register:', error);
      showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register', 9);
    });
}


// Add this corrected function to your FixedAssets.js file (server_js)

// ============================================================================
// GET FIXED ASSETS SUMMARY REPORT - CORRECTED VERSION
// ============================================================================
function getFixedAssetsSummaryReport(toDate) {
  try {
    Logger.log('getFixedAssetsSummaryReport called with toDate: ' + toDate);
    
    // If no date provided, use today
    if (!toDate) {
      toDate = getTodayString();
    }
    
    const reportDate = new Date(toDate);
    reportDate.setHours(0, 0, 0, 0);
    
    // For year start (January 1st of the same year)
    const yearStart = new Date(reportDate.getFullYear(), 0, 1);
    const yearStartStr = Utilities.formatDate(yearStart, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // For accumulated depreciation at start (end of previous month)
    const prevMonthEnd = new Date(reportDate.getFullYear(), reportDate.getMonth(), 0);
    const prevMonthEndStr = Utilities.formatDate(prevMonthEnd, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    Logger.log('Report Date: ' + toDate);
    Logger.log('Year Start: ' + yearStartStr);
    Logger.log('Previous Month End: ' + prevMonthEndStr);
    
    // Get all assets
    const ss = SpreadsheetApp.openById(ASSET_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(ASSET_CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    // Find column indices
    const nameIdx = header.indexOf(ASSET_CONFIG.COLUMNS.NAME_OF_ASSET);
    const typeIdx = header.indexOf(ASSET_CONFIG.COLUMNS.TYPE_OF_ASSET);
    const purchaseDateIdx = header.indexOf(ASSET_CONFIG.COLUMNS.DATE_OF_PURCHASE);
    const endOfLifeIdx = header.indexOf(ASSET_CONFIG.COLUMNS.DATE_OF_END_OF_LIFE);
    const costIdx = header.indexOf(ASSET_CONFIG.COLUMNS.COST_OF_ASSET);
    const monthlyDepIdx = header.indexOf(ASSET_CONFIG.COLUMNS.MONTHLY_DEPRECIATION);
    const annualChargeIdx = header.indexOf(ASSET_CONFIG.COLUMNS.ANNUAL_CHARGE);
    const statusIdx = header.indexOf(ASSET_CONFIG.COLUMNS.STATUS);
    
    // Asset types for summary (in correct order)
    const assetTypes = [
      'Computers & Accessories',
      'Furniture and Fixtures',
      'Fittings',
      'Office Equipment',
      'Motor Vehicle',
      'Software'
    ];
    
    // Initialize summary by type
    const summaryByType = {};
    assetTypes.forEach(type => {
      summaryByType[type] = {
        costAtYearStart: 0,
        additionsDuringPeriod: 0,
        costAtReportDate: 0,
        depAtYearStart: 0,        // Accumulated depreciation as at Jan 1
        depAtPrevMonthEnd: 0,      // Accumulated depreciation as at end of previous month
        chargeForPeriod: 0,        // Charge from Jan 1 to report date
        chargeForMonth: 0,         // Charge for the month of report date
        depAtReportDate: 0,        // Accumulated depreciation as at report date
        netBookValue: 0
      };
    });
    
    // Total summary
    const totalSummary = {
      costAtYearStart: 0,
      additionsDuringPeriod: 0,
      costAtReportDate: 0,
      depAtYearStart: 0,
      depAtPrevMonthEnd: 0,
      chargeForPeriod: 0,
      chargeForMonth: 0,
      depAtReportDate: 0,
      netBookValue: 0
    };
    
    // Process each asset
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const assetName = row[nameIdx];
      
      if (!assetName || String(assetName).trim() === '') {
        continue;
      }
      
      const assetType = String(row[typeIdx]).trim();
      const purchaseDateRaw = row[purchaseDateIdx];
      const endOfLifeRaw = row[endOfLifeIdx];
      const cost = parseFloat(row[costIdx]) || 0;
      const monthlyDepreciation = parseFloat(row[monthlyDepIdx]) || 0;
      const annualDepreciation = parseFloat(row[annualChargeIdx]) || 0;
      const status = String(row[statusIdx]).trim();
      
      // Skip disposed assets
      if (status === 'Disposed') {
        continue;
      }
      
      // Parse purchase date
      let purchaseDate;
      if (purchaseDateRaw instanceof Date) {
        purchaseDate = purchaseDateRaw;
      } else if (typeof purchaseDateRaw === 'string') {
        purchaseDate = new Date(purchaseDateRaw);
      } else {
        continue;
      }
      
      if (isNaN(purchaseDate.getTime())) {
        continue;
      }
      
      // Parse end of life date
      let endOfLifeDate = null;
      if (endOfLifeRaw) {
        if (endOfLifeRaw instanceof Date) {
          endOfLifeDate = endOfLifeRaw;
        } else if (typeof endOfLifeRaw === 'string') {
          endOfLifeDate = new Date(endOfLifeRaw);
        }
      }
      
      // Set all dates to start of day for accurate comparison
      purchaseDate.setHours(0, 0, 0, 0);
      if (endOfLifeDate) endOfLifeDate.setHours(0, 0, 0, 0);
      
      // Only include assets purchased on or before report date
      if (purchaseDate > reportDate) {
        continue;
      }
      
      // Check if asset's life span ended before report date
      const isFullyDepreciated = endOfLifeDate && endOfLifeDate < reportDate;
      
      // ===== COST CALCULATIONS =====
      
      // 1. Cost at Year Start (assets purchased before Jan 1)
      if (purchaseDate < yearStart) {
        summaryByType[assetType].costAtYearStart += cost;
        totalSummary.costAtYearStart += cost;
      }
      
      // 2. Additions during period (assets purchased from Jan 1 to report date)
      if (purchaseDate >= yearStart && purchaseDate <= reportDate) {
        summaryByType[assetType].additionsDuringPeriod += cost;
        totalSummary.additionsDuringPeriod += cost;
      }
      
      // 3. Cost at Report Date (all assets purchased on or before report date)
      summaryByType[assetType].costAtReportDate += cost;
      totalSummary.costAtReportDate += cost;
      
      // ===== DEPRECIATION CALCULATIONS =====
      // Only calculate depreciation if asset hasn't reached end of life before the respective dates
      
      // Helper function to calculate depreciation up to a specific date
      function calculateDepreciationUpTo(date, purchaseDate, monthlyDep, cost, endOfLifeDate) {
        if (!date || purchaseDate > date) return 0;
        
        // If asset has end of life date and it's before the target date, use end of life date
        const effectiveDate = (endOfLifeDate && endOfLifeDate < date) ? endOfLifeDate : date;
        
        // Calculate months between purchase and effective date
        let monthsDiff = (effectiveDate.getFullYear() - purchaseDate.getFullYear()) * 12;
        monthsDiff += effectiveDate.getMonth() - purchaseDate.getMonth();
        
        // Adjust for partial month - if day of month is less than purchase day
        if (effectiveDate.getDate() < purchaseDate.getDate()) {
          monthsDiff--;
        }
        
        monthsDiff = Math.max(0, monthsDiff);
        
        // Calculate depreciation
        let depreciation = monthsDiff * monthlyDep;
        return Math.min(depreciation, cost);
      }
      
      // 4. Accumulated Depreciation at Year Start (Jan 1)
      // Use Jan 1 as the target date, but if asset was purchased after Jan 1, depreciation is 0
      let depAtYearStart = 0;
      if (purchaseDate < yearStart) {
        depAtYearStart = calculateDepreciationUpTo(yearStart, purchaseDate, monthlyDepreciation, cost, endOfLifeDate);
      }
      summaryByType[assetType].depAtYearStart += depAtYearStart;
      totalSummary.depAtYearStart += depAtYearStart;
      
      // 5. Accumulated Depreciation at Previous Month End
      // Used for calculating charge for period correctly
      let depAtPrevMonthEnd = 0;
      if (purchaseDate <= prevMonthEnd) {
        depAtPrevMonthEnd = calculateDepreciationUpTo(prevMonthEnd, purchaseDate, monthlyDepreciation, cost, endOfLifeDate);
      }
      summaryByType[assetType].depAtPrevMonthEnd += depAtPrevMonthEnd;
      totalSummary.depAtPrevMonthEnd += depAtPrevMonthEnd;
      
      // 6. Accumulated Depreciation at Report Date
      let depAtReportDate = 0;
      if (purchaseDate <= reportDate) {
        depAtReportDate = calculateDepreciationUpTo(reportDate, purchaseDate, monthlyDepreciation, cost, endOfLifeDate);
      }
      summaryByType[assetType].depAtReportDate += depAtReportDate;
      totalSummary.depAtReportDate += depAtReportDate;
      
      // 7. Charge for Period (Jan 1 to Report Date)
      // = Depreciation at Report Date - Depreciation at Year Start
      let chargeForPeriod = depAtReportDate - depAtYearStart;
      chargeForPeriod = Math.max(0, chargeForPeriod);
      summaryByType[assetType].chargeForPeriod += chargeForPeriod;
      totalSummary.chargeForPeriod += chargeForPeriod;
      
      // 8. Charge for Month (the month of the report date)
      // = Depreciation at Report Date - Depreciation at Previous Month End
      let chargeForMonth = depAtReportDate - depAtPrevMonthEnd;
      chargeForMonth = Math.max(0, chargeForMonth);
      summaryByType[assetType].chargeForMonth += chargeForMonth;
      totalSummary.chargeForMonth += chargeForMonth;
      
      // 9. Net Book Value at Report Date
      let netBookValue = cost - depAtReportDate;
      netBookValue = Math.max(0, netBookValue);
      summaryByType[assetType].netBookValue += netBookValue;
      totalSummary.netBookValue += netBookValue;
      
      // Log for debugging
      if (assetType === 'Computers & Accessories') {
        Logger.log('Asset: ' + assetName);
        Logger.log('  Purchase Date: ' + purchaseDate);
        Logger.log('  End of Life: ' + (endOfLifeDate || 'N/A'));
        Logger.log('  Cost: ' + cost);
        Logger.log('  Monthly Dep: ' + monthlyDepreciation);
        Logger.log('  Dep at Year Start: ' + depAtYearStart);
        Logger.log('  Dep at Prev Month End: ' + depAtPrevMonthEnd);
        Logger.log('  Dep at Report Date: ' + depAtReportDate);
        Logger.log('  Charge for Period: ' + chargeForPeriod);
        Logger.log('  Charge for Month: ' + chargeForMonth);
      }
    }
    
    // Round all values to 2 decimal places
    assetTypes.forEach(type => {
      Object.keys(summaryByType[type]).forEach(key => {
        summaryByType[type][key] = Math.round(summaryByType[type][key] * 100) / 100;
      });
    });
    
    Object.keys(totalSummary).forEach(key => {
      totalSummary[key] = Math.round(totalSummary[key] * 100) / 100;
    });
    
    Logger.log('Summary Report Complete');
    Logger.log('Total Cost at Report Date: ' + totalSummary.costAtReportDate);
    Logger.log('Total Dep at Report Date: ' + totalSummary.depAtReportDate);
    Logger.log('Total NBV: ' + totalSummary.netBookValue);
    Logger.log('Total Charge for Period: ' + totalSummary.chargeForPeriod);
    Logger.log('Total Charge for Month: ' + totalSummary.chargeForMonth);
    
    return {
      success: true,
      summaryByType: summaryByType,
      totalSummary: totalSummary,
      yearStart: yearStartStr,
      prevMonthEnd: prevMonthEndStr,
      reportDate: toDate
    };
    
  } catch (error) {
    Logger.log('Error in getFixedAssetsSummaryReport: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return { error: error.message };
  }
}

// Helper function to calculate months between two dates (used by getFixedAssetsSummaryReport)
function calculateMonthsBetweenFixed(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If start date is after end date, return 0
    if (start > end) return 0;
    
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();
    
    // Adjust for partial month - if end day is before start day, subtract 1
    if (end.getDate() < start.getDate()) {
      months--;
    }
    
    return Math.max(0, months);
  } catch (e) {
    Logger.log('Error calculating months between: ' + e.message);
    return 0;
  }
}

// Make sure getTodayString exists
function getTodayString() {
  const today = new Date();
  return Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
// Fix loadSummaryRegister function
function loadSummaryRegister() {
  showAssetRegisterLoadingSpinner('summaryDetailsBody');
  
  const toDateInput = document.getElementById('summaryToDate');
  if (!toDateInput || !toDateInput.value) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select a TO date', 9);
    return;
  }

  const toDate = toDateInput.value;
  summaryToDate = toDate;

  // Use the backend report function for consistent calculations
  callGAS('getFixedAssetsSummaryReport', { toDate: toDate })
    .then(response => {
      if (response && !response.error && response.summaryByType) {
        renderSummaryRegisterFromReport(response);
      } else {
        console.error('Invalid response:', response);
        showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register: ' + (response?.error || 'Unknown error'), 9);
      }
    })
    .catch(error => {
      console.error('Error loading summary register:', error);
      showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register: ' + (error.message || error), 9);
    });
}

// Fix recalculateSummaryRegister function
function recalculateSummaryRegister() {
  const toDateInput = document.getElementById('summaryToDate');
  
  if (!toDateInput || !toDateInput.value) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select a TO date', 9);
    return;
  }

  const toDate = toDateInput.value;
  summaryToDate = toDate;
  
  showAssetRegisterLoadingModal('Calculating summary register as at ' + formatDateForDisplay(new Date(toDate)) + '...');
  
  // First update accumulated depreciation as at TO date
  callGAS('updateAllAccumulatedDepreciation', { asOfDate: toDate })
    .then(response => {
      if (response && !response.error) {
        // Then generate the summary report
        return callGAS('getFixedAssetsSummaryReport', { toDate: toDate });
      } else {
        throw new Error(response?.error || 'Failed to update depreciation');
      }
    })
    .then(response => {
      hideAssetRegisterLoadingModal();
      if (response && !response.error && response.summaryByType) {
        renderSummaryRegisterFromReport(response);
        showAssetMessage('✓ Summary Register calculated as at ' + formatDateForDisplay(new Date(toDate)), 'success');
        setTimeout(() => closeAssetModal(), 1500);
      } else {
        throw new Error(response?.error || 'Failed to generate report');
      }
    })
    .catch(error => {
      hideAssetRegisterLoadingModal();
      console.error('Error:', error);
      showAssetMessage('Error: ' + (error.message || error), 'error');
      showAssetRegisterEmptyState('summaryDetailsBody', 'Error: ' + (error.message || error), 9);
    });
}
/**
 * Get month-year display in format MMM-YYYY
 */
function getMonthYearDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return month + '-' + year;
}
// ============================================
// ACTION DROPDOWN
// ============================================

function openAssetActionDropdown(event, assetName) {
  closeAssetActionDropdown();

  const rect = event.target.closest('button').getBoundingClientRect();
  const portal = document.getElementById('assetActionPortal');

  portal.innerHTML = `
    <div class="action-dropdown-content">
      <button class="dropdown-item" onclick="editAsset('${escapeHtml(assetName)}')">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="dropdown-item" onclick="disposeAsset('${escapeHtml(assetName)}')">
        <i class="fas fa-trash-alt"></i> Dispose
      </button>
    </div>
  `;

  portal.style.display = 'block';
  portal.style.position = 'fixed';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';

  assetPortalOpen = true;
  event.stopPropagation();
}

function closeAssetActionDropdown() {
  const portal = document.getElementById('assetActionPortal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.display = 'none';
  }
  assetPortalOpen = false;
}

function editAsset(assetName) {
  closeAssetActionDropdown();
  showAssetMessage('Edit functionality coming soon for: ' + assetName, 'info');
}

function disposeAsset(assetName) {
  closeAssetActionDropdown();

  if (confirm(`Are you sure you want to dispose of this asset?\n${assetName}`)) {
    showAssetRegisterLoadingModal('Disposing asset...');

    callGAS('updateAssetStatus', { assetName: assetName, newStatus: 'Disposed' })
      .then(response => {
        hideAssetRegisterLoadingModal();
        if (response && !response.error) {
          showAssetMessage('Asset disposed successfully!', 'success');
          // Refresh with current as of date
          if (currentAsOfDate) {
            return callGAS('updateAllAccumulatedDepreciation', { asOfDate: currentAsOfDate });
          }
        } else {
          throw new Error(response?.error || 'Unknown error');
        }
      })
      .then(() => {
        return callGAS('getDetailedRegister', {});
      })
      .then(response => {
        if (response && !response.error) {
          allDetailedAssets = response;
          loadDetailedRegister();
          if (document.getElementById('summaryRegister').classList.contains('active')) {
            loadSummaryRegister();
          }
        }
      })
      .catch(error => {
        hideAssetRegisterLoadingModal();
        showAssetMessage('Error disposing asset: ' + (error.message || error), 'error');
      });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateMonthsElapsed(purchaseDateStr, asOfDateStr) {
  try {
    const purchaseDate = new Date(purchaseDateStr);
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
    
    const monthsDiff = (asOfDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                       (asOfDate.getMonth() - purchaseDate.getMonth());
    
    return Math.max(0, monthsDiff);
  } catch (e) {
    return 0;
  }
}

function calculateMonthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  
  if (end.getDate() >= start.getDate()) {
    months += 1;
  }
  
  return Math.max(0, months);
}

function formatDateDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatMonthDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month}-${year}`;
}

function formatDateForDisplay(date) {
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCurrency(value) {
  if (!value && value !== 0) return '0.00';
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showAssetMessage(message, type) {
  const modal = document.getElementById('messageModal');
  const messageDiv = document.getElementById('modalMessage');

  const types = {
    success: 'success-message',
    error: 'error-message',
    info: 'info-message',
    warning: 'warning-message'
  };

  messageDiv.innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
}

function closeAssetModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showAssetLoadingModal(message = 'Adding Asset...') {
  let modal = document.getElementById('assetLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetLoadingModal';
    modal.className = 'asset-loading-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function hideAssetLoadingModal() {
  const modal = document.getElementById('assetLoadingModal');
  if (modal) modal.style.display = 'none';
}

function showAssetRegisterLoadingModal(message = 'Processing...') {
  let modal = document.getElementById('assetRegisterLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetRegisterLoadingModal';
    modal.className = 'asset-register-loading-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function hideAssetRegisterLoadingModal() {
  const modal = document.getElementById('assetRegisterLoadingModal');
  if (modal) modal.style.display = 'none';
}

function showAssetRegisterEmptyState(elementId, message, colSpan) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}" class="loading-cell">
        <i class="fas fa-folder-open"></i>
        <p>${message}</p>
      </td>
    </tr>
  `;
}

function showAssetRegisterLoadingSpinner(elementId) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  
  const colSpan = elementId === 'detailedRegisterBody' ? 11 : 9;
  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}" class="loading-cell">Loading...</td>
    </tr>
  `;
}

// Add event listener for cost and date changes to update depreciation info
document.addEventListener('DOMContentLoaded', function() {
  const costField = document.getElementById('assetCost');
  const dateField = document.getElementById('dateOfPurchase');
  const typeField = document.getElementById('assetType');
  
  if (costField) costField.addEventListener('input', function() {
    if (typeField && typeField.value) calculateDepreciationInfo(typeField.value);
  });
  
  if (dateField) dateField.addEventListener('change', function() {
    if (typeField && typeField.value) calculateDepreciationInfo(typeField.value);
  });
});

// Print functions for assets
window.printAssetDetailed = function() {
  if (typeof printUtils !== 'undefined' && printUtils.printAssetRegister) {
    printUtils.printAssetRegister('detailedRegister');
  } else {
    window.print();
  }
};

window.printAssetSummary = function() {
  if (typeof printUtils !== 'undefined' && printUtils.printAssetRegister) {
    printUtils.printAssetRegister('summaryRegister');
  } else {
    window.print();
  }
};

// Export functions for global use
window.initAssetModule = initAssetModule;
window.initAssetRegisterModule = initAssetRegisterModule;
window.handleAssetTypeChange = handleAssetTypeChange;
window.submitNewAsset = submitNewAsset;
window.switchAssetRegisterTab = switchAssetRegisterTab;
window.recalculateAssetValues = recalculateAssetValues;
window.recalculateSummaryRegister = recalculateSummaryRegister;
window.openAssetActionDropdown = openAssetActionDropdown;
window.editAsset = editAsset;
window.disposeAsset = disposeAsset;
window.closeAssetModal = closeAssetModal;
