/* ============================================
   FIXED ASSETS MODULE JAVASCRIPT - UPDATED
   Using direct google.script.run (same as inventory module)
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
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Update depreciation success:', response);
      hideAssetRegisterLoadingModal();
      loadDetailedRegister();
    })
    .withFailureHandler(function(error) {
      console.error('Initialization error:', error);
      hideAssetRegisterLoadingModal();
      loadDetailedRegister(); // Still try to load even if update fails
    })
    .updateAllAccumulatedDepreciation(today);
  
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
    updateDepreciationInfo();
    
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

function updateDepreciationInfo() {
  const assetType = document.getElementById('assetType').value;
  const cost = parseFloat(document.getElementById('assetCost').value) || 0;
  const purchaseDate = document.getElementById('dateOfPurchase').value;
  
  console.log('Updating depreciation info:', { assetType, cost, purchaseDate });
  
  if (!assetType) {
    return;
  }
  
  if (!cost || cost <= 0 || !purchaseDate) {
    // Show placeholders
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
  // Subtract one day to get the actual end of life date
  endOfLife.setDate(endOfLife.getDate() - 1);
  
  // Update the display
  document.getElementById('lifeSpanDisplay').textContent = config.lifeSpan + ' years';
  document.getElementById('rateDisplay').textContent = config.rate + '%';
  document.getElementById('monthlyDepDisplay').textContent = formatCurrency(monthlyDep);
  document.getElementById('annualChargeDisplay').textContent = formatCurrency(annualCharge);
  document.getElementById('endOfLifeDisplay').textContent = formatDateForDisplay(endOfLife);
  
  console.log('Depreciation info updated:', {
    lifeSpan: config.lifeSpan,
    rate: config.rate,
    monthlyDep: monthlyDep,
    annualCharge: annualCharge,
    endOfLife: endOfLife
  });
}

function generateAssetCode(assetType) {
  console.log('Generating asset code for:', assetType);
  
  google.script.run
    .withSuccessHandler(function(response) {
      const field = document.getElementById('assetCode');
      if (field && response) {
        field.value = response;
        console.log('Asset code generated:', response);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error generating asset code:', error);
      document.getElementById('assetCode').value = '';
      showAssetMessage('Error generating asset code: ' + (error.message || error), 'error');
    })
    .generateAssetCode(assetType);
}

function formatDateForDisplay(date) {
  if (!date) return '';
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date.getTime())) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCurrency(value) {
  if (isNaN(value) || value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function resetAssetForm() {
  document.getElementById('newAssetForm').reset();
  document.getElementById('depreciationInfo').style.display = 'none';
  document.getElementById('assetCode').value = '';
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('dateOfPurchase');
  if (dateField) dateField.value = today;
}

// ============================================
// ASSET CRUD - UPDATED TO USE google.script.run
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

  console.log('Submitting form data:', formData);

  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Success response:', response);
      hideAssetLoadingModal();
      showAssetMessage('✓ Asset added successfully!', 'success');
      setTimeout(() => {
        document.getElementById('newAssetForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateOfPurchase').value = today;
        document.getElementById('assetCode').value = '';
        document.getElementById('assetCode').readOnly = false;
        document.getElementById('assetType').value = '';
        document.getElementById('depreciationInfo').style.display = 'none';
        
        if (currentAsOfDate) {
          google.script.run
            .withSuccessHandler(function() {
              loadDetailedRegister();
            })
            .withFailureHandler(function() {
              loadDetailedRegister();
            })
            .updateAllAccumulatedDepreciation(currentAsOfDate);
        } else {
          loadDetailedRegister();
        }
      }, 1500);
    })
    .withFailureHandler(function(error) {
      console.error('Failure response:', error);
      hideAssetLoadingModal();
      showAssetMessage('Error adding asset: ' + (error.message || error), 'error');
    })
    .addNewAsset(formData);
}

// ============================================
// DETAILED REGISTER - UPDATED
// ============================================

function switchAssetRegisterTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  event.target.closest('.tab-btn').classList.add('active');

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
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Detailed register response:', response);
      if (response && !response.error) {
        allDetailedAssets = response;
        renderDetailedRegisterTable(response);
      } else {
        showAssetRegisterEmptyState('detailedRegisterBody', 'Error loading asset register', 11);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading detailed register:', error);
      showAssetRegisterEmptyState('detailedRegisterBody', 'Error loading asset register', 11);
    })
    .getDetailedRegister();
}

function recalculateAssetValues() {
  const asOfDateInput = document.getElementById('detailedToDate').value;
  if (!asOfDateInput) {
    renderDetailedRegisterTable(allDetailedAssets);
    return;
  }
  
  currentAsOfDate = asOfDateInput;
  
  showAssetRegisterLoadingModal('Recalculating accumulated depreciation as at ' + formatDateForDisplay(new Date(currentAsOfDate)) + '...');
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Update depreciation success:', response);
      if (response && !response.error) {
        // Reload the detailed register
        google.script.run
          .withSuccessHandler(function(assets) {
            hideAssetRegisterLoadingModal();
            if (assets && !assets.error) {
              allDetailedAssets = assets;
              renderDetailedRegisterTable(allDetailedAssets);
              showAssetMessage('✓ Accumulated depreciation updated as at ' + formatDateForDisplay(new Date(currentAsOfDate)), 'success');
              setTimeout(() => closeAssetModal(), 1500);
            }
          })
          .withFailureHandler(function(error) {
            hideAssetRegisterLoadingModal();
            console.error('Error reloading assets:', error);
            showAssetMessage('Error reloading assets: ' + (error.message || error), 'error');
          })
          .getDetailedRegister();
      } else {
        hideAssetRegisterLoadingModal();
        throw new Error(response?.error || 'Failed to update');
      }
    })
    .withFailureHandler(function(error) {
      hideAssetRegisterLoadingModal();
      console.error('Error:', error);
      showAssetMessage('Error updating depreciation: ' + (error.message || error), 'error');
      renderDetailedRegisterTable(allDetailedAssets);
    })
    .updateAllAccumulatedDepreciation(currentAsOfDate);
}

function renderDetailedRegisterTable(data) {
  const tbody = document.getElementById('detailedRegisterBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    showAssetRegisterEmptyState('detailedRegisterBody', 'No assets found', 11);
    return;
  }

  const rows = data.map(asset => {
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
// SUMMARY REGISTER - UPDATED
// ============================================

function loadSummaryRegister() {
  showAssetRegisterLoadingSpinner('summaryDetailsBody');
  
  const toDateInput = document.getElementById('summaryToDate');
  if (!toDateInput || !toDateInput.value) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select a TO date', 9);
    return;
  }

  const toDate = toDateInput.value;
  summaryToDate = toDate;

  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Summary report response:', response);
      if (response && !response.error && response.summaryByType) {
        renderSummaryRegisterFromReport(response);
      } else {
        console.error('Invalid response:', response);
        showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register: ' + (response?.error || 'Unknown error'), 9);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading summary register:', error);
      showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register: ' + (error.message || error), 9);
    })
    .getFixedAssetsSummaryReport(toDate);
}

function recalculateSummaryRegister() {
  const toDateInput = document.getElementById('summaryToDate');
  
  if (!toDateInput || !toDateInput.value) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select a TO date', 9);
    return;
  }

  const toDate = toDateInput.value;
  summaryToDate = toDate;
  
  showAssetRegisterLoadingModal('Calculating summary register as at ' + formatDateForDisplay(new Date(toDate)) + '...');
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Update depreciation success:', response);
      if (response && !response.error) {
        // Get the summary report
        google.script.run
          .withSuccessHandler(function(report) {
            hideAssetRegisterLoadingModal();
            if (report && !report.error && report.summaryByType) {
              renderSummaryRegisterFromReport(report);
              showAssetMessage('✓ Summary Register calculated as at ' + formatDateForDisplay(new Date(toDate)), 'success');
              setTimeout(() => closeAssetModal(), 1500);
            } else {
              throw new Error(report?.error || 'Failed to generate report');
            }
          })
          .withFailureHandler(function(error) {
            hideAssetRegisterLoadingModal();
            console.error('Error:', error);
            showAssetMessage('Error: ' + (error.message || error), 'error');
            showAssetRegisterEmptyState('summaryDetailsBody', 'Error: ' + (error.message || error), 9);
          })
          .getFixedAssetsSummaryReport(toDate);
      } else {
        hideAssetRegisterLoadingModal();
        throw new Error(response?.error || 'Failed to update depreciation');
      }
    })
    .withFailureHandler(function(error) {
      hideAssetRegisterLoadingModal();
      console.error('Error:', error);
      showAssetMessage('Error: ' + (error.message || error), 'error');
      showAssetRegisterEmptyState('summaryDetailsBody', 'Error: ' + (error.message || error), 9);
    })
    .updateAllAccumulatedDepreciation(toDate);
}

function renderSummaryRegisterFromReport(report) {
  const tbody = document.getElementById('summaryDetailsBody');
  if (!tbody) return;

  if (!report.summaryByType || Object.keys(report.summaryByType).length === 0) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'No assets found for the selected period', 9);
    return;
  }

  const summaryByType = report.summaryByType;
  const total = report.totalSummary;
  
  const assetTypes = [
    'Computers & Accessories',
    'Furniture and Fixtures',
    'Fittings',
    'Office Equipment',
    'Motor Vehicle',
    'Software'
  ];

  let html = '';

  // COST SECTION
  html += `<tr>
    <td class="details-col">Cost As At</td>
    <td class="date-col">${report.yearStart}</td>
    ${assetTypes.map(type => `<td class="amount-cell">${formatCurrency(summaryByType[type]?.costAtYearStart || 0)}</td>`).join('')}
    <td class="total-col">${formatCurrency(total.costAtYearStart)}</td>
  </tr>`;

  html += `<tr>
    <td class="details-col">Additions</td>
    <td class="date-col">${report.yearStart} to ${formatDateForDisplay(new Date(report.reportDate))}</td>
    ${assetTypes.map(type => `<td class="amount-cell">${formatCurrency(summaryByType[type]?.additionsDuringPeriod || 0)}</td>`).join('')}
    <td class="total-col">${formatCurrency(total.additionsDuringPeriod)}</td>
  </tr>`;

  html += `<tr class="highlight-row special-highlight">
    <td class="details-col"><strong>Cost As At</strong></td>
    <td class="date-col">${formatDateForDisplay(new Date(report.reportDate))}</td>
    ${assetTypes.map(type => `<td class="amount-cell"><strong>${formatCurrency(summaryByType[type]?.costAtReportDate || 0)}</strong></td>`).join('')}
    <td class="total-col"><strong>${formatCurrency(total.costAtReportDate)}</strong></td>
  </tr>`;

  // DEPRECIATION SECTION
  html += `<tr>
    <td class="details-col">Accumulated Depreciation</td>
    <td class="date-col">${report.yearStart}</td>
    ${assetTypes.map(type => `<td class="amount-cell">${formatCurrency(summaryByType[type]?.depAtYearStart || 0)}</td>`).join('')}
    <td class="total-col">${formatCurrency(total.depAtYearStart)}</td>
  </tr>`;

  html += `<tr>
    <td class="details-col">Charge For The Period</td>
    <td class="date-col">${report.yearStart} to ${formatDateForDisplay(new Date(report.reportDate))}</td>
    ${assetTypes.map(type => `<td class="amount-cell">${formatCurrency(summaryByType[type]?.chargeForPeriod || 0)}</td>`).join('')}
    <td class="total-col">${formatCurrency(total.chargeForPeriod)}</td>
  </tr>`;

  html += `<tr class="highlight-row special-highlight">
    <td class="details-col"><strong>Accumulated Depreciation</strong></td>
    <td class="date-col">${formatDateForDisplay(new Date(report.reportDate))}</td>
    ${assetTypes.map(type => `<td class="amount-cell"><strong>${formatCurrency(summaryByType[type]?.depAtReportDate || 0)}</strong></td>`).join('')}
    <td class="total-col"><strong>${formatCurrency(total.depAtReportDate)}</strong></td>
  </tr>`;

  // NET BOOK VALUE SECTION
  html += `<tr class="highlight-row special-highlight">
    <td class="details-col"><strong>Net Book Value</strong></td>
    <td class="date-col">${formatDateForDisplay(new Date(report.reportDate))}</td>
    ${assetTypes.map(type => `<td class="amount-cell"><strong>${formatCurrency(summaryByType[type]?.netBookValue || 0)}</strong></td>`).join('')}
    <td class="total-col"><strong>${formatCurrency(total.netBookValue)}</strong></td>
  </tr>`;

  // MONTHLY CHARGE SECTION
  const monthYear = getMonthYearDisplay(new Date(report.reportDate));
  html += `<tr class="highlight-row green-row">
    <td class="details-col">Charge For The Month</td>
    <td class="date-col">${monthYear}</td>
    ${assetTypes.map(type => `<td class="amount-cell">${formatCurrency(summaryByType[type]?.chargeForMonth || 0)}</td>`).join('')}
    <td class="total-col">${formatCurrency(total.chargeForMonth)}</td>
  </tr>`;

  tbody.innerHTML = html;
}

function getMonthYearDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + '-' + date.getFullYear();
}

// ============================================
// ACTION DROPDOWN - UPDATED
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

    google.script.run
      .withSuccessHandler(function(response) {
        console.log('Dispose success:', response);
        if (response && !response.error) {
          // Update accumulated depreciation first
          google.script.run
            .withSuccessHandler(function() {
              // Then reload the detailed register
              google.script.run
                .withSuccessHandler(function(assets) {
                  hideAssetRegisterLoadingModal();
                  if (assets && !assets.error) {
                    allDetailedAssets = assets;
                    loadDetailedRegister();
                    if (document.getElementById('summaryRegister').classList.contains('active')) {
                      loadSummaryRegister();
                    }
                    showAssetMessage('Asset disposed successfully!', 'success');
                  }
                })
                .withFailureHandler(function(error) {
                  hideAssetRegisterLoadingModal();
                  showAssetMessage('Error reloading assets: ' + (error.message || error), 'error');
                })
                .getDetailedRegister();
            })
            .withFailureHandler(function(error) {
              hideAssetRegisterLoadingModal();
              showAssetMessage('Error updating depreciation: ' + (error.message || error), 'error');
            })
            .updateAllAccumulatedDepreciation(currentAsOfDate);
        } else {
          hideAssetRegisterLoadingModal();
          throw new Error(response?.error || 'Unknown error');
        }
      })
      .withFailureHandler(function(error) {
        hideAssetRegisterLoadingModal();
        showAssetMessage('Error disposing asset: ' + (error.message || error), 'error');
      })
      .updateAssetStatus(assetName, 'Disposed');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDateForDisplay(date) {
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
  let modal = document.getElementById('messageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'messageModal';
    modal.className = 'asset-message-modal';
    document.body.appendChild(modal);
  }
  
  const messageDiv = document.getElementById('modalMessage');
  if (!messageDiv) {
    const div = document.createElement('div');
    div.id = 'modalMessage';
    modal.appendChild(div);
  }
  
  const types = {
    success: 'success-message',
    error: 'error-message',
    info: 'info-message',
    warning: 'warning-message'
  };

  document.getElementById('modalMessage').innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
  
  setTimeout(() => {
    if (modal) modal.style.display = 'none';
  }, 3000);
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

// Print functions
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
window.loadSummaryRegister = loadSummaryRegister;
window.renderSummaryRegisterFromReport = renderSummaryRegisterFromReport;
window.updateDepreciationInfo = updateDepreciationInfo;
window.resetAssetForm = resetAssetForm;
window.generateAssetCode = generateAssetCode;
